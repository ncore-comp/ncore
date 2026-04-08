"use strict";

const { chromium } = require("playwright");
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const { findServiceAccountPath } = require("./import-firestore");

const APP_URL = "https://ncore.web.app";
const REPORT_DIR = path.join(__dirname, "..", "reports");
const REPORT_PATH = path.join(REPORT_DIR, "verify-retro-detail-reason-last.json");

function nowIso() {
  return new Date().toISOString();
}

function kstToday() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function shiftDate(dateStr, offsetDays) {
  const date = new Date(`${dateStr}T00:00:00+09:00`);
  date.setDate(date.getDate() + offsetDays);
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function isWeekend(dateStr) {
  const date = new Date(`${dateStr}T00:00:00+09:00`);
  const day = date.getDay();
  return day === 0 || day === 6;
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

async function login(page, id, password) {
  await page.goto(APP_URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("input").nth(0).fill(id);
  await page.locator("input").nth(1).fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
}

async function loginBoot(id, password) {
  const response = await fetch(`${APP_URL}/api`, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "login_boot", id, password })
  });
  const json = await response.json();
  assert(json && json.result === "success", "login_boot failed", { id, json });
  return json;
}

async function closeRequestModalIfOpen(page) {
  const modal = page.locator("#req-modal");
  if (await modal.isVisible().catch(() => false)) {
    await page.locator("#req-modal button").filter({ hasText: "취소" }).click().catch(() => {});
  }
}

async function waitForReasonModal(page) {
  const modal = page.locator("#reject-reason-modal");
  await modal.waitFor({ state: "visible", timeout: 10000 });
  return modal;
}

async function setCheckbox(page, selector, checked) {
  await page.locator(selector).evaluate((el, value) => {
    el.checked = value;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, checked);
}

async function createTempUser(db) {
  const templateSnap = await db.collection("users").where("role", "==", "employee").limit(1).get();
  const template = templateSnap.empty ? {} : templateSnap.docs[0].data();
  const userId = `retro_test_${Date.now()}`;
  const user = {
    ...template,
    id: userId,
    name: "지연사유테스트",
    password: "0",
    dept: template.dept || "매뉴얼팀",
    role: "employee",
    rank: template.rank || "직원",
    workQ1: template.workQ1 || "09:00 ~ 18:00",
    workQ2: template.workQ2 || template.workQ1 || "09:00 ~ 18:00",
    workQ3: template.workQ3 || template.workQ2 || template.workQ1 || "09:00 ~ 18:00",
    workQ4: template.workQ4 || template.workQ3 || template.workQ2 || template.workQ1 || "09:00 ~ 18:00",
    updatedAt: nowIso()
  };
  await db.collection("users").doc(userId).set(user, { merge: true });
  return user;
}

async function deleteTempData(db, tempUserId) {
  const reqSnap = await db.collection("requests").where("userId", "==", tempUserId).get();
  for (const doc of reqSnap.docs) {
    await doc.ref.delete();
  }
  await db.collection("users").doc(tempUserId).delete().catch(() => {});
}

async function findPastBusinessDate(db, userId) {
  const today = kstToday();
  for (let i = 1; i <= 14; i += 1) {
    const dateStr = shiftDate(today, -i);
    if (isWeekend(dateStr)) continue;
    const holidaySnap = await db.collection("holidays").where("date", "==", dateStr).limit(1).get();
    if (!holidaySnap.empty) continue;
    const reqSnap = await db.collection("requests")
      .where("userId", "==", userId)
      .where("startDate", "==", dateStr)
      .limit(1)
      .get();
    if (reqSnap.empty) return dateStr;
  }
  throw new Error("No free past business date found");
}

async function latestRequestByUserAndDate(db, userId, dateStr) {
  const snap = await db.collection("requests")
    .where("userId", "==", userId)
    .where("startDate", "==", dateStr)
    .get();
  const docs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  docs.sort((a, b) => String(b.updatedAt || b.timestamp || "").localeCompare(String(a.updatedAt || a.timestamp || "")));
  return docs[0] || null;
}

async function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const results = [];
  const db = ensureAdmin();
  const tempUser = await createTempUser(db);
  const pastDate = await findPastBusinessDate(db, tempUser.id);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const dialogs = [];

  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.accept();
  });

  try {
    const loginData = await loginBoot(tempUser.id, "0");
    await page.addInitScript((sessionPayload) => {
      sessionStorage.setItem("ncore_active_session_v27", JSON.stringify(sessionPayload));
    }, {
      userId: tempUser.id,
      sessionToken: loginData.sessionToken,
      lastActivityAt: Date.now()
    });
    await page.goto(APP_URL, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1500);
    assert(await page.getByRole("button", { name: "연차 신청" }).isVisible(), "Login failed");

    await page.getByRole("button", { name: "연차 신청" }).click();
    await setCheckbox(page, "#allow-past", true);
    await page.locator("#req-start-date").fill(pastDate);
    await page.locator("#req-modal-btn").click();

    const reasonModal = await waitForReasonModal(page);
    const subtitleText = await reasonModal.locator("#reject-reason-subtitle").innerText();
    results.push({ name: "지난 날짜 팝업 표시", passed: subtitleText.includes("지난 날짜"), subtitleText });

    await reasonModal.locator("#reject-reason-confirm-btn").click();
    await page.waitForTimeout(300);
    const emptyAlertHit = dialogs.some((msg) => String(msg).includes("상세사유를 입력해 주세요."));
    results.push({ name: "상세사유 미입력 차단", passed: emptyAlertHit, dialogs: [...dialogs] });

    const pastDetailReason = `과거연차테스트_${Date.now()}`;
    await reasonModal.locator("#reject-reason-input").fill(pastDetailReason);
    await reasonModal.locator("#reject-reason-confirm-btn").click();
    await page.waitForTimeout(1200);

    const pastRequest = await latestRequestByUserAndDate(db, tempUser.id, pastDate);
    assert(pastRequest, "Past request not saved");
    results.push({
      name: "지난 날짜 상세사유 저장",
      passed: String(pastRequest.detailReason || "") === pastDetailReason,
      stored: pastRequest.detailReason || "",
      date: pastDate
    });

    await closeRequestModalIfOpen(page);
    await page.getByRole("button", { name: "연차 신청" }).click();
    await page.locator("#req-type").selectOption("시간차(외출)");
    const today = kstToday();
    await page.locator("#req-start-date").fill(today);
    await page.locator("#req-duration-out").selectOption("1");
    await page.locator("#req-start-time-out").selectOption("9");
    await page.locator("#req-modal-btn").click();

    const timeReasonModal = await waitForReasonModal(page);
    const timeSubtitle = await timeReasonModal.locator("#reject-reason-subtitle").innerText();
    results.push({ name: "지난 시간차 팝업 표시", passed: timeSubtitle.includes("지난 시간"), subtitleText: timeSubtitle });

    const timeDetailReason = `지난시간차테스트_${Date.now()}`;
    await timeReasonModal.locator("#reject-reason-input").fill(timeDetailReason);
    await timeReasonModal.locator("#reject-reason-confirm-btn").click();
    await page.waitForTimeout(1200);

    const timeRequest = await latestRequestByUserAndDate(db, tempUser.id, today);
    assert(timeRequest, "Past time request not saved");
    results.push({
      name: "지난 시간차 상세사유 저장",
      passed: String(timeRequest.detailReason || "") === timeDetailReason,
      stored: timeRequest.detailReason || "",
      date: today,
      type: timeRequest.type,
      timeRange: timeRequest.timeRange || ""
    });

    const report = {
      result: results.every((item) => item.passed) ? "passed" : "failed",
      executedAt: nowIso(),
      tempUserId: tempUser.id,
      results
    };
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close().catch(() => {});
    await deleteTempData(db, tempUser.id).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
