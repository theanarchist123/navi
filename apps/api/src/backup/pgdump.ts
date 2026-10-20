import { spawn } from "node:child_process";
import type { Response } from "express";
import { AppError } from "../utils/errors.js";

/** Connection parts go through PG* environment variables so the password never appears in argv. */
export function pgEnv(connectionUrl: string): NodeJS.ProcessEnv {
  const u = new URL(connectionUrl);
  return {
    ...process.env,
    PGHOST: u.hostname,
    PGPORT: u.port || "5432",
    PGUSER: decodeURIComponent(u.username),
    PGPASSWORD: decodeURIComponent(u.password),
    PGDATABASE: u.pathname.slice(1),
  };
}

export const backupFileName = (now = new Date()): string => `opshub-${now.toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-")}.dump`;

/**
 * Streams `pg_dump -Fc` straight into the HTTP response. Headers are sent only once the first bytes
 * arrive, so a missing binary or a failed connection becomes a clean JSON error rather than a
 * corrupt download. Resolves with the number of bytes streamed.
 */
export function streamBackup(res: Response, opts: { adminUrl: string; pgDumpPath: string; fileName: string }): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(opts.pgDumpPath, ["-Fc", "--no-owner"], { env: pgEnv(opts.adminUrl), stdio: ["ignore", "pipe", "pipe"] });
    let bytes = 0;
    let stderr = "";
    let started = false;
    child.stderr.on("data", (d: Buffer) => (stderr = (stderr + d.toString()).slice(-2000)));
    child.on("error", (e: NodeJS.ErrnoException) => {
      reject(new AppError(503, "backup_unavailable", e.code === "ENOENT" ? "pg_dump is not installed on the API host (set PG_DUMP_PATH)" : "Could not start pg_dump"));
    });
    child.stdout.on("data", (chunk: Buffer) => {
      if (!started) {
        started = true;
        res.status(200);
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename="${opts.fileName}"`);
        res.setHeader("Cache-Control", "no-store");
      }
      bytes += chunk.length;
      if (!res.write(chunk)) {
        child.stdout.pause();
        res.once("drain", () => child.stdout.resume());
      }
    });
    res.on("close", () => child.kill());
    child.on("close", (code) => {
      if (code === 0) {
        res.end();
        return resolve(bytes);
      }
      if (started) {
        res.destroy(); // truncated stream: make the failure visible to the client
        return reject(new Error(`pg_dump exited with code ${code}`));
      }
      reject(new AppError(500, "backup_failed", `pg_dump failed${stderr ? `: ${stderr.trim().split("\n").pop()}` : ""}`));
    });
  });
}
