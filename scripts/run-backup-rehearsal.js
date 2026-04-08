"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const API_BASE_URL = "http://127.0.0.1:5001/ncore-vacation-system/asia-northeast3/api";

function runNodeScript(scriptPath, extraEnv = {}) {
  const absolute = path.join(ROOT, scriptPath);
  const result = spawnSync(process.execPath, [absolute], {
    cwd: ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      API_BASE_URL,
      ...extraEnv
    }
  });

  if (result.status !== 0) {
    throw new Error(`${scriptPath} failed with exit code ${result.status}`);
  }
}

function main() {
  console.log("[backup-rehearsal] import-firestore -> emulator");
  runNodeScript(path.join("scripts", "import-firestore.js"));

  console.log("[backup-rehearsal] firestore-e2e-test -> functions emulator");
  runNodeScript(path.join("scripts", "firestore-e2e-test.js"));

  console.log("[backup-rehearsal] compare-firestore -> emulator");
  runNodeScript(path.join("scripts", "compare-firestore.js"));

  console.log("[backup-rehearsal] completed");
}

try {
  main();
} catch (error) {
  console.error("[backup-rehearsal] failed:", error.message);
  process.exitCode = 1;
}
