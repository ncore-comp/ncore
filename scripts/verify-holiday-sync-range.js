"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const APP_URL = "https://ncore.web.app";
const API_URL = "https://ncore.web.app/api";
const REPORT_DIR = path.join(__dirname, "..", "reports");
const REPORT_PATH = path.join(REPORT_DIR, "verify-holiday-sync-range-last.json");

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
  const dialogs = [];

  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.accept();
  });

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

    const startValue = await page.inputValue("#admin-holiday-sync-start-year");
    const endValue = await page.inputValue("#admin-holiday-sync-end-year");

    await page.fill("#admin-holiday-sync-start-year", "2027");
    await page.fill("#admin-holiday-sync-end-year", "2028");

    const hasButton = await page.locator("button", { hasText: "공휴일 동기화" }).first().isVisible().catch(() => false);

    const syncResult = await postAuthed(loginData.sessionToken, {
      action: "sync_public_holidays",
      startYear: 2027,
      endYear: 2028
    });

    const report = {
      result: hasButton && syncResult && syncResult.result === "success" && Number(syncResult.startYear) === 2027 && Number(syncResult.endYear) === 2028 ? "passed" : "failed",
      executedAt: nowIso(),
      results: [
        {
          name: "동기화 범위 입력칸 표시",
          passed: /^\d{4}$/.test(startValue) && /^\d{4}$/.test(endValue),
          startValue,
          endValue
        },
        {
          name: "공휴일 동기화 버튼 표시",
          passed: hasButton
        },
        {
          name: "범위 지정 동기화 실행",
          passed: syncResult && syncResult.result === "success" && Number(syncResult.startYear) === 2027 && Number(syncResult.endYear) === 2028,
          response: syncResult
        }
      ],
      dialogs
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
