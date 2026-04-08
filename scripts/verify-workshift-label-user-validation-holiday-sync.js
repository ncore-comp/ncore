"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const admin = require("firebase-admin");
const { findServiceAccountPath } = require("./import-firestore");

const APP_URL = "https://ncore.web.app";
const API_URL = "https://ncore.web.app/api";
const REPORT_DIR = path.join(__dirname, "..", "reports");
const REPORT_PATH = path.join(REPORT_DIR, "verify-workshift-label-user-validation-holiday-sync-last.json");

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

function ensureAdmin() {
  if (admin.apps.length) return admin.firestore();
  const serviceAccountPath = findServiceAccountPath();
  admin.initializeApp({ credential: admin.credential.cert(require(serviceAccountPath)) });
  return admin.firestore();
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
  const db = ensureAdmin();
  const tempUserId = `qcheck_${Date.now()}`;
  const results = [];
  const dialogs = [];
  let browser;

  try {
    const loginData = await loginBoot("0", "0");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on("dialog", async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.accept();
    });

    await page.addInitScript((sessionPayload) => {
      sessionStorage.setItem("ncore_active_session_v27", JSON.stringify(sessionPayload));
    }, {
      userId: "0",
      sessionToken: loginData.sessionToken,
      lastActivityAt: Date.now()
    });

    await page.goto(APP_URL, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1500);

    const memberCardLabels = await page.evaluate(() => {
      const target = (typeof appData !== "undefined" && Array.isArray(appData.users))
        ? appData.users.find((u) => String(u.id) === "최혜리") || appData.users[0]
        : null;
      return target ? app.getMemberCardData(target).map((item) => item.label) : [];
    });
    const hasYearLabel = memberCardLabels.some((label) => /20\d{2}년/.test(String(label)));
    results.push({
      name: "직원 카드 분기 라벨 연도 제거",
      passed: !hasYearLabel,
      labels: memberCardLabels
    });

    await page.evaluate(() => {
      app.renderUserManagement();
    });
    await page.waitForTimeout(500);

    await page.fill("#new-id", tempUserId);
    await page.fill("#new-pw", "0");
    await page.fill("#new-name", "분기검증테스트");
    await page.selectOption("#new-role", "employee");
    await page.selectOption("#new-dept", "매뉴얼팀");
    await page.selectOption("#new-rank", "사원");
    await page.fill("#new-days", "15");
    await page.fill("#new-email", "quarter.validation@test.local");
    await page.fill("#new-emp-no", `EMP${Date.now()}`.slice(0, 12));
    await page.fill("#new-phone", "010-0000-0000");
    await page.selectOption("#new-work-q1", "07:00 ~ 16:00");
    await page.selectOption("#new-work-q2", "07:00 ~ 16:00");
    await page.selectOption("#new-work-q3", "07:00 ~ 16:00");

    await page.evaluate(() => app.addUser());
    await page.waitForTimeout(800);

    const lastDialog = dialogs[dialogs.length - 1] || "";
    const blocked = String(lastDialog).includes("근무시간 분기(Q1~Q4) 중 미등록");
    const createdSnap = await db.collection("users").doc(tempUserId).get();
    results.push({
      name: "신규 저장 시 Q1~Q4 미입력 차단",
      passed: blocked && !createdSnap.exists,
      dialog: lastDialog,
      userExists: createdSnap.exists
    });

    const opsButtonVisible = await page.evaluate(() => {
      app.currentView = "master-permissions";
      app.masterPermissionTab = "ops";
      app.renderMasterPermissionPage();
      return document.body.innerText.includes("공휴일 동기화");
    });
    results.push({
      name: "운영실 공휴일 동기화 버튼 노출",
      passed: !!opsButtonVisible
    });

    const syncResult = await postAuthed(loginData.sessionToken, {
      action: "sync_public_holidays",
      startYear: 2026,
      endYear: 2030
    });
    results.push({
      name: "공휴일 수동 동기화 실행",
      passed: syncResult && syncResult.result === "success",
      response: syncResult
    });

    const report = {
      result: results.every((item) => item.passed) ? "passed" : "failed",
      executedAt: nowIso(),
      tempUserId,
      results
    };
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (browser) await browser.close().catch(() => {});
    await db.collection("users").doc(tempUserId).delete().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
