import { loadEnv } from "./config/env.js";
import { createApp } from "./app.js";
import { createDatabase } from "./db/scoped.js";

const env = loadEnv();
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

