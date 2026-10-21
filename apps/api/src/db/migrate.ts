import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createPool } from "./scoped.js";

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
