import { loadEnv } from "./config/env.js";
import { createApp } from "./app.js";
import { createDatabase } from "./db/scoped.js";
import { runMigrations } from "./db/migrate.js";
import { seed } from "./db/seeds/seed.js";

const env = loadEnv();

// Automatic startup migration and seed check for deployed environments
async function initDatabase() {
  const adminUrl = env.DATABASE_ADMIN_URL || env.DATABASE_URL;
  const maxRetries = 10;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(JSON.stringify({ level: "info", msg: "Checking database migrations...", attempt }));
      await runMigrations(adminUrl, env.DATABASE_URL);
      console.log(JSON.stringify({ level: "info", msg: "Migrations successfully checked and applied." }));
      break;
    } catch (err: any) {
      const isRefused = err?.message?.includes("ECONNREFUSED") || err?.stack?.includes("ECONNREFUSED");
      if (isRefused && attempt < maxRetries) {
        console.warn(JSON.stringify({ level: "warn", msg: `Database connection refused (attempt ${attempt}/${maxRetries}), waiting 1s...` }));
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      console.error(JSON.stringify({
        level: "error",
        msg: "Migration check error",
        error: err?.cause?.message || err?.message,
        detail: err?.cause?.detail || err?.detail,
        stack: err?.stack,
      }));
      break;
    }
  }

  try {
    console.log(JSON.stringify({ level: "info", msg: "Checking seed data..." }));
    await seed(adminUrl, { demoData: true });
    console.log(JSON.stringify({ level: "info", msg: "Seed completed or verified." }));
  } catch (err: any) {
    console.error(JSON.stringify({
      level: "error",
      msg: "Seed check error",
      error: err?.cause?.message || err?.message,
      detail: err?.cause?.detail || err?.detail,
      stack: err?.stack,
    }));
  }
}

await initDatabase();

const db = createDatabase(env.DATABASE_URL);
const app = createApp({
  db,
  env,
  log: (msg, meta) => console.error(JSON.stringify({ level: "error", msg, ...meta })),
});
const port = env.PORT ?? env.API_PORT ?? 4000;
const server = app.listen(port, "0.0.0.0", () => {
  console.log(JSON.stringify({ level: "info", msg: "opshub-api listening", port }));
});

const shutdown = () => {
  server.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

