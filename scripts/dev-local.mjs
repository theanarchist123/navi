import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { resolve } from "node:path";
import pg from "pg";

const root = process.cwd();
for (const file of [".env.local", ".env"]) {
  const path = resolve(root, file);
  if (existsSync(path)) process.loadEnvFile(path);
}

const databaseUrl = process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_ADMIN_URL or DATABASE_URL must be set before starting the local app.");
  process.exit(1);
}

const database = new URL(databaseUrl);
const isLocalDatabase = ["localhost", "127.0.0.1", "::1"].includes(database.hostname);
const pool = new pg.Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 1_500, max: 1 });
let embedded;
let services;
let stopping = false;
let ready = false;

async function hasSeededDatabase() {
  try {
    const result = await pool.query("SELECT 1 FROM users WHERE email = $1 LIMIT 1", ["admin@opshub.local"]);
    return result.rowCount > 0;
  } catch (error) {
    if (["ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "42P01", "57P03"].includes(error.code)) return false;
    throw error;
  }
}

function waitForChild(child, name) {
  return new Promise((resolveExit, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (!stopping && name === "embedded database" && !ready) {
        reject(new Error(`The ${name} exited before becoming ready (code ${code ?? signal}).`));
      } else {
        resolveExit(code);
      }
    });
  });
}

async function waitForDatabase() {
  const deadline = Date.now() + 120_000;
  let startingMessageShown = false;
  while (Date.now() < deadline) {
    if (await hasSeededDatabase()) return;
    if (!startingMessageShown) {
      console.log("Waiting for the local database to finish migrations and seeding...");
      startingMessageShown = true;
    }
    await delay(500);
  }
  throw new Error("The database did not finish migrations and seeding within 120 seconds.");
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) return;
  const exited = waitForChild(child, "shutdown");
  child.kill();
  await exited;
}

async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  await stopChild(services);
  await stopChild(embedded);
  await pool.end();
  if (signal) process.exit(0);
}

process.on("SIGINT", () => { void shutdown("SIGINT"); });
process.on("SIGTERM", () => { void shutdown("SIGTERM"); });

try {
  if (!(await hasSeededDatabase())) {
    if (!isLocalDatabase) {
      throw new Error(`The configured database at ${database.hostname} is unavailable or not seeded. Start it, then retry.`);
    }
    console.log("Starting the local embedded PostgreSQL database...");
    embedded = spawn(
      process.execPath,
      [resolve(root, "node_modules/tsx/dist/cli.mjs"), resolve(root, "apps/api/src/db/dev-embedded.ts")],
      { cwd: root, stdio: "inherit", windowsHide: true },
    );
    await Promise.race([waitForDatabase(), waitForChild(embedded, "embedded database")]);
  } else {
    console.log("Using the existing local database.");
  }
  ready = true;
  console.log("Database is ready; starting API and web app.");
  services = spawn(
    process.execPath,
    [resolve(root, "node_modules/npm-run-all/bin/npm-run-all/index.js"), "--parallel", "dev:api", "dev:web:ready"],
    { cwd: root, stdio: "inherit", windowsHide: true },
  );
  const serviceExit = waitForChild(services, "development services");
  const code = await serviceExit;
  if (!stopping) {
    stopping = true;
    await stopChild(embedded);
    await pool.end();
    process.exitCode = code ?? 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  await shutdown();
  process.exitCode = 1;
}
