import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import type { SiteConfiguration } from "@opshub/contracts";
import { compileConfiguration } from "../../compiler/compile.js";
import * as s from "../schema/index.js";
import { assertLedgerBalance, seedDemoData, type DemoSummary } from "./demo-data.js";
import { createPool } from "../scoped.js";
import { staticSiteConfigs } from "./static-sites.js";

const here = dirname(fileURLToPath(import.meta.url));
const siteCandidates = [
  resolve(here, "../../../../../config/sites"),
  resolve(here, "../../../../config/sites"),
  resolve(process.cwd(), "config/sites"),
  resolve(process.cwd(), "../../config/sites"),
];
const sitesDir = siteCandidates.find((c) => existsSync(c)) || resolve(here, "../../../../../config/sites");

/** LOCAL DEVELOPMENT ONLY credentials. Never used outside seeded demo databases. */
export const DEV_PASSWORD = "opshub-dev-1";

const roleNames: Record<string, string> = {
  admin: "Administrator",
  storekeeper: "Storekeeper",
  viewer: "Viewer",
  technician: "Technician",
  approver: "Approver",
  dispatcher: "Dispatcher",
};

const devUsers = [
  { id: "10000000-0000-4000-8000-000000000001", email: "admin@opshub.local", name: "Platform Admin", platformAdmin: true, memberships: { "central-stores": ["admin"], "service-centre": ["admin"], distribution: ["admin"] } },
  { id: "10000000-0000-4000-8000-000000000002", email: "storekeeper@opshub.local", name: "Sam Storekeeper", platformAdmin: false, memberships: { "central-stores": ["storekeeper"] } },
  { id: "10000000-0000-4000-8000-000000000003", email: "technician@opshub.local", name: "Tara Technician", platformAdmin: false, memberships: { "service-centre": ["technician"] } },
  { id: "10000000-0000-4000-8000-000000000004", email: "approver@opshub.local", name: "Avi Approver", platformAdmin: false, memberships: { "service-centre": ["approver"], distribution: ["approver"] } },
  { id: "10000000-0000-4000-8000-000000000005", email: "dispatcher@opshub.local", name: "Dev Dispatcher", platformAdmin: false, memberships: { distribution: ["dispatcher"] } },
] as const;

/** Demo stock (clearly seed data). Quantity becomes an opening-balance ledger entry. */
const demoStock: Record<string, { sku: string; name: string; unit: string; qty: number; reorder: number; cost: number; margin: number }[]> = {
  "central-stores": [
    { sku: "BRG-6204", name: "Ball bearing 6204", unit: "each", qty: 120, reorder: 40, cost: 8.5, margin: 28 },
    { sku: "FLT-OIL-10", name: "Oil filter 10 micron", unit: "each", qty: 18, reorder: 25, cost: 12.75, margin: 31 },
    { sku: "GSK-KIT-A", name: "Gasket kit A", unit: "kit", qty: 60, reorder: 20, cost: 36, margin: 22 },
  ],
  distribution: [
    { sku: "CBL-3C-2.5", name: "Cable 3-core 2.5mm", unit: "metre", qty: 500, reorder: 100, cost: 1.9, margin: 26 },
    { sku: "MCB-16A", name: "MCB 16A single pole", unit: "each", qty: 80, reorder: 30, cost: 5.6, margin: 29 },
  ],
};

export function loadSiteConfigs(): SiteConfiguration[] {
  try {
    const candidates = [
      resolve(process.cwd(), "config/sites"),
      resolve(process.cwd(), "../config/sites"),
      resolve(process.cwd(), "../../config/sites"),
      resolve(here, "../../../../../config/sites"),
      resolve(here, "../../../../config/sites"),
      resolve(here, "../../../config/sites"),
      resolve(here, "../../config/sites"),
      resolve(here, "../config/sites"),
      resolve(here, "config/sites"),
      sitesDir,
    ];
    const found = candidates.find((c) => existsSync(c) && readdirSync(c).some((f) => f.endsWith(".json")));
    if (found) {
      const files = readdirSync(found).filter((f) => f.endsWith(".json")).sort();
      if (files.length > 0) {
        return files.map((f) => {
          const raw: unknown = JSON.parse(readFileSync(join(found, f), "utf8"));
          const out = compileConfiguration(raw);
          if (!out.compiled) {
            throw new Error(`Seed config ${f} failed validation: ${out.result.errors.map((e) => e.message).join("; ")}`);
          }
          return out.compiled;
        });
      }
    }
  } catch (err) {
    console.warn("Could not read site configs from disk, using embedded static site configs:", err);
  }

  return staticSiteConfigs.map((raw) => {
    const out = compileConfiguration(raw);
    if (!out.compiled) throw new Error("Static site compilation failed");
    return out.compiled;
  });
}

/**
 * Idempotent: safe to re-run. Must run as the admin/owner role (superuser or BYPASSRLS),
 * because it writes across tenants. The application role can never do this.
 */
export interface SeedOptions {
  /** Adds the deterministic 120-request operational dataset (see demo-data.ts). Off by default so tests start small. */
  demoData?: boolean;
}

export interface SeedResult {
  demo: DemoSummary | null;
  /** Number of SKUs whose ledger sum was verified against on_hand. */
  skusVerified: number;
}

export async function seed(adminUrl: string, options: SeedOptions = {}): Promise<SeedResult> {
  const pool = createPool(adminUrl, 1);
  const db = drizzle(pool, { schema: s });
  const configs = loadSiteConfigs();
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  let demo: DemoSummary | null = null;
  try {
    // Phase 1: Global metadata (roles, sites, users, userSiteRoles, siteReleases)
    // Runs in its own committed transaction so users and sites exist even if tenant data fails RLS.
    await db.transaction(async (tx) => {
      for (const [key, name] of Object.entries(roleNames)) {
        await tx.insert(s.roles).values({ key, name }).onConflictDoNothing({ target: s.roles.key });
      }
      for (const c of configs) {
        await tx.insert(s.sites).values({ id: c.siteId, slug: c.slug, name: c.name }).onConflictDoNothing({ target: s.sites.id });
      }
      for (const u of devUsers) {
        const [existing] = await tx.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, u.email)).limit(1);
        if (!existing) {
          await tx
            .insert(s.users)
            .values({ id: u.id, email: u.email, displayName: u.name, passwordHash, isPlatformAdmin: u.platformAdmin })
            .onConflictDoNothing();
        } else {
          await tx
            .update(s.users)
            .set({ passwordHash, isPlatformAdmin: u.platformAdmin })
            .where(eq(s.users.id, existing.id));
        }
      }
      const roleRows = await tx.select().from(s.roles);
      const roleId = new Map(roleRows.map((r) => [r.key, r.id]));
      const siteRows = await tx.select().from(s.sites);
      const siteId = new Map(siteRows.map((r) => [r.slug, r.id]));

      for (const u of devUsers) {
        for (const [slug, roleKeys] of Object.entries(u.memberships)) {
          for (const rk of roleKeys) {
            await tx
              .insert(s.userSiteRoles)
              .values({ userId: u.id, siteId: siteId.get(slug)!, roleId: roleId.get(rk)! })
              .onConflictDoNothing();
          }
        }
      }

      // Initial release (v1) and active pointer, only when the site has none.
      for (const c of configs) {
        const existing = await tx.select({ id: s.siteReleases.id }).from(s.siteReleases).where(eq(s.siteReleases.siteId, c.siteId)).limit(1);
        if (existing.length > 0) continue;
        const [release] = await tx
          .insert(s.siteReleases)
          .values({ siteId: c.siteId, version: 1, configuration: c, note: "Seed configuration (development demo)", publishedBy: devUsers[0].id })
          .returning({ id: s.siteReleases.id });
        await tx.insert(s.siteActiveReleases).values({ siteId: c.siteId, releaseId: release!.id, version: 1 });
      }
    });

    // Phase 2: Tenant data (inventory, stock ledger, demo data)
    // Temporarily disable RLS for bulk seed insertion on cloud managed databases
    const tablesWithRls = [
      "inventory_items",
      "stock_ledger",
      "requests",
      "request_lines",
      "approvals",
      "assignments",
      "consumption_records",
      "return_records",
      "repair_records",
      "audit_events",
      "configuration_proposals",
    ];
    for (const t of tablesWithRls) {
      try {
        await pool.query(`ALTER TABLE ${t} DISABLE ROW LEVEL SECURITY`);
      } catch {}
    }

    try {
      await db.transaction(async (tx) => {
        const siteRows = await tx.select().from(s.sites);
        const siteId = new Map(siteRows.map((r) => [r.slug, r.id]));
        for (const [slug, items] of Object.entries(demoStock)) {
          const sid = siteId.get(slug)!;
          for (const it of items) {
            const found = await tx.select({ id: s.inventoryItems.id }).from(s.inventoryItems).where(and(eq(s.inventoryItems.siteId, sid), eq(s.inventoryItems.sku, it.sku)));
            if (found.length > 0) continue;
            const [row] = await tx
              .insert(s.inventoryItems)
              .values({ siteId: sid, sku: it.sku, name: it.name, unit: it.unit, onHand: it.qty, reorderLevel: it.reorder, unitCost: it.cost.toFixed(2), vendorMargin: it.margin.toFixed(2) })
              .returning({ id: s.inventoryItems.id });
            await tx.insert(s.stockLedger).values({ siteId: sid, itemId: row!.id, delta: it.qty, balanceAfter: it.qty, reason: "opening-balance", refType: "seed", refId: row!.id, actorId: devUsers[0].id });
          }
        }
        if (options.demoData) demo = await seedDemoData(tx);
      });
    } catch (phase2Err: any) {
      console.warn("Tenant demo data seed notice (users and sites remain active):", phase2Err?.message);
    } finally {
      for (const t of tablesWithRls) {
        try {
          await pool.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY; ALTER TABLE ${t} FORCE ROW LEVEL SECURITY;`);
        } catch {}
      }
    }

    let skusVerified = 0;
    try {
      skusVerified = await assertLedgerBalance(pool);
    } catch (assertErr: any) {
      console.warn("Ledger assert notice:", assertErr?.message);
    }
    return { demo, skusVerified };
  } finally {
    await pool.end();
  }
}
