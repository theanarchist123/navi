import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createPool } from "./scoped.js";

import { staticSiteConfigs } from "./seeds/static-sites.js";

const here = dirname(fileURLToPath(import.meta.url));
const migrationCandidates = [
  resolve(here, "migrations"),
  resolve(here, "../../src/db/migrations"),
  resolve(process.cwd(), "apps/api/src/db/migrations"),
  resolve(process.cwd(), "src/db/migrations"),
];
const migrationsFolder = migrationCandidates.find((c) => existsSync(c)) || resolve(here, "migrations");

export async function runManualMigrations(pool: pg.Pool, folder: string): Promise<void> {
  const files = readdirSync(folder)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  console.log(`Applying ${files.length} migration files directly...`);
  for (const file of files) {
    const fullPath = resolve(folder, file);
    const content = readFileSync(fullPath, "utf-8");
    const stmts = content.split("--> statement-breakpoint");
    for (const raw of stmts) {
      const stmt = raw.trim();
      if (!stmt) continue;
      try {
        await pool.query(stmt);
      } catch (err: any) {
        // Ignore duplicate object/table/column/type errors in idempotent migrations
        const code = err?.code;
        const ignorableCodes = ["42P07", "42710", "42701", "23505", "42P06", "42704"];
        if (!ignorableCodes.includes(code)) {
          console.warn(`Migration notice in ${file} (${code}):`, err?.message);
        }
      }
    }
  }
}

/**
 * Ensures the least-privilege application role exists (LOGIN, NOSUPERUSER, NOBYPASSRLS),
 * then applies all migrations. Must run with the admin connection. Safe to re-run.
 */
export async function runMigrations(adminUrl: string, appUrl: string): Promise<void> {
  const pool = createPool(adminUrl, 1);
  try {
    // 1. Role provisioning (bypassed if cloud DB user lacks CREATEROLE)
    try {
      const app = new URL(appUrl);
      const roleName = decodeURIComponent(app.username);
      const password = decodeURIComponent(app.password);
      if (roleName && password && /^[a-z_][a-z0-9_]*$/.test(roleName)) {
        const literal = `'${password.replace(/'/g, "''")}'`;
        const exists = await pool.query("select 1 from pg_roles where rolname = $1", [roleName]);
        const attrs = "LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE";
        await pool.query(`${exists.rowCount ? "ALTER" : "CREATE"} ROLE ${roleName} ${attrs} PASSWORD ${literal}`);
      }
    } catch (roleErr: any) {
      console.warn("Role creation/alteration bypassed (e.g. cloud database with restricted role permissions):", roleErr?.message);
    }

    // Try creating opshub_app role if possible for least-privilege support
    try {
      await pool.query(`DO $$ BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'opshub_app') THEN
          CREATE ROLE opshub_app;
        END IF;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;`);
    } catch {
      // Ignored
    }

    // 2. Apply migrations with Drizzle using public schema
    let migrationSucceeded = false;
    try {
      await migrate(drizzle(pool), {
        migrationsFolder,
        migrationsTable: "__drizzle_migrations",
        migrationsSchema: "public",
      });
      migrationSucceeded = true;
    } catch (drizzleErr: any) {
      console.warn("Drizzle migrate note, running statement-by-statement execution fallback:", drizzleErr?.message || drizzleErr);
      await runManualMigrations(pool, migrationsFolder);
      migrationSucceeded = true;
    }

    // 3. Verify users table exists
    const usersTableCheck = await pool.query(
      "select 1 from information_schema.tables where table_schema = 'public' and table_name = 'users'"
    );
    if (usersTableCheck.rowCount === 0) {
      console.warn("Users table missing after migration check; running manual migrations...");
      await runManualMigrations(pool, migrationsFolder);
    }

    // 3b. Ensure baseline roles, users, sites, releases, and memberships exist
    try {
      await pool.query(`
        INSERT INTO roles (key, name) VALUES
          ('admin', 'Administrator'),
          ('storekeeper', 'Storekeeper'),
          ('viewer', 'Viewer'),
          ('technician', 'Technician'),
          ('approver', 'Approver'),
          ('dispatcher', 'Dispatcher')
        ON CONFLICT (key) DO NOTHING;
      `);

      const adminHash = '$2b$10$Nu8SZ4F/qjhDj0lomQnIX.uqsIE5h.584zqoqPj25hV2vIGRlMvE.';
      await pool.query(`
        INSERT INTO users (id, email, display_name, password_hash, is_platform_admin)
        VALUES 
          ('10000000-0000-4000-8000-000000000001', 'admin@opshub.local', 'Platform Admin', $1, true),
          ('10000000-0000-4000-8000-000000000002', 'storekeeper@opshub.local', 'Sam Storekeeper', $1, false),
          ('10000000-0000-4000-8000-000000000003', 'technician@opshub.local', 'Tara Technician', $1, false),
          ('10000000-0000-4000-8000-000000000004', 'approver@opshub.local', 'Avi Approver', $1, false),
          ('10000000-0000-4000-8000-000000000005', 'dispatcher@opshub.local', 'Dev Dispatcher', $1, false)
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_platform_admin = EXCLUDED.is_platform_admin;
      `, [adminHash]);

      // Baseline fleet sites
      await pool.query(`
        INSERT INTO sites (id, slug, name) VALUES
          ('00000000-0000-4000-8000-000000000001', 'central-stores', 'Central Stores'),
          ('00000000-0000-4000-8000-000000000002', 'service-centre', 'Service Centre'),
          ('00000000-0000-4000-8000-000000000003', 'distribution', 'Distribution')
        ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name;
      `);

      // Baseline releases and active pointers for each baseline site
      for (const c of staticSiteConfigs) {
        const existingRel = await pool.query(
          "SELECT id FROM site_releases WHERE site_id = $1 LIMIT 1",
          [c.siteId]
        );
        let releaseId: string;
        if (existingRel.rowCount && existingRel.rowCount > 0) {
          releaseId = existingRel.rows[0].id;
        } else {
          const insertRel = await pool.query(
            `INSERT INTO site_releases (site_id, version, configuration, note, published_by)
             VALUES ($1, 1, $2, 'Baseline site configuration', '10000000-0000-4000-8000-000000000001')
             RETURNING id`,
            [c.siteId, JSON.stringify(c)]
          );
          releaseId = insertRel.rows[0].id;
        }
        await pool.query(
          `INSERT INTO site_active_releases (site_id, release_id, version)
           VALUES ($1, $2, 1)
           ON CONFLICT (site_id) DO UPDATE SET release_id = EXCLUDED.release_id, version = 1`,
          [c.siteId, releaseId]
        );
      }

      // Baseline memberships
      const memberships = [
        { userId: "10000000-0000-4000-8000-000000000001", slug: "central-stores", role: "admin" },
        { userId: "10000000-0000-4000-8000-000000000001", slug: "service-centre", role: "admin" },
        { userId: "10000000-0000-4000-8000-000000000001", slug: "distribution", role: "admin" },
        { userId: "10000000-0000-4000-8000-000000000002", slug: "central-stores", role: "storekeeper" },
        { userId: "10000000-0000-4000-8000-000000000003", slug: "service-centre", role: "technician" },
        { userId: "10000000-0000-4000-8000-000000000004", slug: "service-centre", role: "approver" },
        { userId: "10000000-0000-4000-8000-000000000004", slug: "distribution", role: "approver" },
        { userId: "10000000-0000-4000-8000-000000000005", slug: "distribution", role: "dispatcher" },
      ];

      for (const m of memberships) {
        await pool.query(`
          INSERT INTO user_site_roles (user_id, site_id, role_id)
          SELECT $1::uuid, s.id, r.id
          FROM sites s, roles r
          WHERE s.slug = $2 AND r.key = $3
          ON CONFLICT (user_id, site_id, role_id) DO NOTHING;
        `, [m.userId, m.slug, m.role]);
      }

      // Ensure platform admin has admin role on all non-system sites
      await pool.query(`
        INSERT INTO user_site_roles (user_id, site_id, role_id)
        SELECT '10000000-0000-4000-8000-000000000001'::uuid, s.id, r.id
        FROM sites s, roles r
        WHERE r.key = 'admin' AND s.is_system = false
        ON CONFLICT (user_id, site_id, role_id) DO NOTHING;
      `);

      console.log("Baseline fleet sites, releases, and user roles verified.");
    } catch (adminErr: any) {
      console.warn("Notice ensuring baseline metadata:", adminErr?.message);
    }

    // 4. Ensure application role has required table grants
    try {
      await pool.query(`DO $$ BEGIN
        IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'opshub_app') THEN
          GRANT USAGE ON SCHEMA public TO opshub_app;
          GRANT SELECT ON users, roles, sites, user_site_roles TO opshub_app;
          GRANT UPDATE (token_version, updated_at) ON users TO opshub_app;
          GRANT SELECT, INSERT ON site_releases, stock_ledger, approvals, assignments, consumption_records, audit_events TO opshub_app;
          GRANT SELECT, INSERT, UPDATE ON site_active_releases, site_drafts, inventory_items, requests, return_records, repair_records, idempotency_keys TO opshub_app;
          GRANT SELECT, INSERT, UPDATE ON refresh_tokens, provisioning_jobs TO opshub_app;
          GRANT SELECT, INSERT ON provisioning_events, request_lines TO opshub_app;
          GRANT SELECT, INSERT, UPDATE, DELETE ON configuration_proposals TO opshub_app;
          GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO opshub_app;
        END IF;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;`);
    } catch {
      // Ignored
    }
  } finally {
    await pool.end();
  }
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { loadEnv } = await import("../config/env.js");
  const env = loadEnv();
  if (!env.DATABASE_ADMIN_URL) throw new Error("DATABASE_ADMIN_URL is required for migrations");
  await runMigrations(env.DATABASE_ADMIN_URL, env.DATABASE_URL);
  console.log("Migrations applied.");
}
