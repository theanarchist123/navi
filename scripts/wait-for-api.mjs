import { get } from "node:http";

const healthUrl = "http://localhost:4000/api/v1/health";
const deadline = Date.now() + 120_000;
let waiting = false;

function apiIsReady() {
  return new Promise((resolve) => {
    const request = get(healthUrl, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        try {
          resolve(response.statusCode === 200 && JSON.parse(body).data?.status === "ok");
        } catch {
          resolve(false);
        }
      });
    });
    request.on("error", () => resolve(false));
  });
}

while (Date.now() < deadline) {
  if (await apiIsReady()) {
    if (waiting) console.log("API is ready; starting the web app.");
    process.exit(0);
  }
  if (!waiting) {
    console.log("Waiting for the API to finish starting before launching Vite...");
    waiting = true;
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

console.error(`API did not become healthy within 120 seconds (${healthUrl}).`);
process.exit(1);
