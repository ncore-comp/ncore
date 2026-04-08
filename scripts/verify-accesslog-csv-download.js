"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const APP_URL = "https://ncore.web.app";
const API_URL = "https://ncore.web.app/api";
const REPORT_DIR = path.join(__dirname, "..", "reports");
const REPORT_PATH = path.join(REPORT_DIR, "verify-accesslog-csv-download-last.json");

function nowIso() {
  return new Date().toISOString();
}

function assert(condition, message, extra = {}) {
  if (!condition) {
    const error = new Error(message);
    error.extra = extra;
    throw error;
  }
}

async function loginBoot(id, password) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "login_boot", id, password })
  });
  const json = await res.json();
  assert(json && json.result === "success", "login_boot failed", { id, json });
  return json;
}

async function postAuthed(sessionToken, payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ ...payload, sessionToken })
  });
  return res.json();
}

async function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const loginData = await loginBoot("0", "0");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.addInitScript((sessionPayload) => {
      sessionStorage.setItem("ncore_active_session_v27", JSON.stringify(sessionPayload));
    }, {
      userId: "0",
      sessionToken: loginData.sessionToken,
      lastActivityAt: Date.now()
    });

    await page.goto(APP_URL, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      app.currentView = "master-permissions";
      app.masterPermissionTab = "ops";
      app.renderMasterPermissionPage();
    });
    await page.waitForTimeout(500);

    const buttonVisible = await page.locator("button", { hasText: "CSV 다운로드" }).first().isVisible().catch(() => false);

    const csvResult = await postAuthed(loginData.sessionToken, { action: "download_access_logs_csv" });
    const csvText = String(csvResult.csv || "");
    const lines = csvText.split(/\r?\n/).filter(Boolean);
    const hasBom = csvText.charCodeAt(0) === 0xFEFF;
    const header = lines[0] || "";
    const rowCount = Number(csvResult.rowCount || 0);

    const report = {
      result: buttonVisible && csvResult.result === "success" && rowCount > 20 && header.includes("timestamp,userName,userId,type,ip,detail,sortTimestamp") ? "passed" : "failed",
      executedAt: nowIso(),
      results: [
        {
          name: "운영실 CSV 다운로드 버튼 표시",
          passed: buttonVisible
        },
        {
          name: "전체 accessLogs CSV 응답 성공",
          passed: csvResult.result === "success",
          rowCount
        },
        {
          name: "CSV 형식 검증",
          passed: hasBom && header.includes("timestamp,userName,userId,type,ip,detail,sortTimestamp"),
          hasBom,
          header
        },
        {
          name: "전체 기준 다운로드 검증",
          passed: rowCount > 20,
          rowCount
        }
      ]
    };

    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
