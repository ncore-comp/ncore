"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const REPORT_DIR = path.join(ROOT, "reports");
const REPORT_PATH = path.join(REPORT_DIR, "verify-master-permission-tabs-v128-last.json");
const BASE_URL = "https://ncore.web.app";

function ensureDir() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

async function clickButtonByText(page, text) {
  return page.evaluate((label) => {
    const buttons = Array.from(document.querySelectorAll("#app-container button"));
    const target = buttons.find((btn) => ((btn.innerText || "").trim().includes(label)) && btn.offsetParent !== null);
    if (!target) return false;
    target.click();
    return true;
  }, text);
}

async function loginAsMaster(page) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.fill("#login-id", "0");
  await page.fill("#login-pw", "0");
  await page.evaluate(() => app.tryLogin());
  await page.waitForTimeout(5000);
}

async function openMasterPermissions(page) {
  await page.evaluate(() => app.handleAdminNavAction("master-permissions"));
  await page.waitForTimeout(500);
}

async function getAppText(page) {
  return page.evaluate(() => document.getElementById("app-container")?.innerText || "");
}

async function run() {
  ensureDir();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
  const pageErrors = [];
  const consoleErrors = [];

  page.on("pageerror", (error) => {
    pageErrors.push(String(error && error.message ? error.message : error));
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  const result = {
    startedAt: nowIso(),
    checks: []
  };

  try {
    await loginAsMaster(page);
    await openMasterPermissions(page);

    let text = await getAppText(page);
    result.checks.push({
      name: "권한 탭",
      ok: text.includes("권한 탭") && text.includes("직원별로 체크박스를 선택하세요.") && text.includes("게시판") && text.includes("세부설정"),
      details: {
        hasTitle: text.includes("마스터 권한 관리"),
        hasPermissionTab: text.includes("권한 탭"),
        hasBoardGroup: text.includes("게시판"),
        hasAdvancedGroup: text.includes("세부설정")
      }
    });

    await page.evaluate(() => app.setMasterPermissionTab("settings"));
    await page.waitForTimeout(700);
    text = await getAppText(page);
    result.checks.push({
      name: "설정 테이블",
      ok: text.includes("설정 테이블") && text.includes("직원 카드 기능") && text.includes("홈페이지 기능") && text.includes("게시판 기능"),
      details: {
        hasSettingsTable: text.includes("설정 테이블"),
        hasMemberCardToggle: text.includes("직원 카드 기능"),
        hasHomepageToggle: text.includes("홈페이지 기능"),
        hasBoardToggle: text.includes("게시판 기능")
      }
    });

    await page.evaluate(() => app.setMasterPermissionTab("mail"));
    await page.waitForTimeout(700);
    text = await getAppText(page);
    result.checks.push({
      name: "메일 설정",
      ok: text.includes("메일 설정") && text.includes("수신인 (To)") && text.includes("참고인 (CC)"),
      details: {
        hasMailTitle: text.includes("메일 설정"),
        hasTo: text.includes("수신인 (To)"),
        hasCc: text.includes("참고인 (CC)")
      }
    });

    await page.evaluate(() => app.setMasterPermissionTab("workreport"));
    await page.waitForTimeout(700);
    text = await getAppText(page);
    const workreportSaveVisible = await clickButtonByText(page, "설정 저장");
    result.checks.push({
      name: "잔업/특근 설정",
      ok: text.includes("잔업/특근 설정") && text.includes("잔업 신청 기능") && text.includes("특근 신청 기능") && workreportSaveVisible,
      details: {
        hasWorkreportTitle: text.includes("잔업/특근 설정"),
        hasOvertimeToggle: text.includes("잔업 신청 기능"),
        hasHolidayWorkToggle: text.includes("특근 신청 기능"),
        saveButtonClickable: workreportSaveVisible
      }
    });

    await page.evaluate(() => app.setMasterPermissionTab("ops"));
    await page.waitForTimeout(1500);
    text = await getAppText(page);
    const proxyButtonExists = text.includes("선택 날짜로 대리 등록");
    const beforeHidden = await page.evaluate(() => document.getElementById("req-modal")?.classList.contains("hidden"));
    const proxyClicked = await clickButtonByText(page, "선택 날짜로 대리 등록");
    await page.waitForTimeout(200);
    const modalState = await page.evaluate(() => ({
      hidden: document.getElementById("req-modal")?.classList.contains("hidden"),
      title: document.getElementById("req-modal-title")?.innerText || "",
      proxyVisible: !document.getElementById("div-proxy-user")?.classList.contains("hidden"),
      targetValue: document.getElementById("req-target-user")?.value || ""
    }));
    result.checks.push({
      name: "운영실",
      ok: text.includes("운영실") &&
        text.includes("접속 로그 불러오기") &&
        text.includes("보안 로그 불러오기") &&
        proxyButtonExists &&
        proxyClicked &&
        beforeHidden === true &&
        modalState.hidden === false &&
        modalState.proxyVisible === true,
      details: {
        hasOpsTitle: text.includes("운영실"),
        hasAccessLoadButton: text.includes("접속 로그 불러오기"),
        hasSecurityLoadButton: text.includes("보안 로그 불러오기"),
        hasProxyButton: proxyButtonExists,
        proxyClicked,
        modalBeforeHidden: beforeHidden,
        modalAfterHidden: modalState.hidden,
        modalTitle: modalState.title,
        proxyVisible: modalState.proxyVisible,
        targetValue: modalState.targetValue
      }
    });
  } finally {
    result.finishedAt = nowIso();
    result.consoleErrors = consoleErrors;
    result.pageErrors = pageErrors;
    result.counts = {
      passed: result.checks.filter((item) => item.ok).length,
      failed: result.checks.filter((item) => !item.ok).length
    };
    fs.writeFileSync(REPORT_PATH, JSON.stringify(result, null, 2), "utf8");
    await browser.close();
  }

  console.log(JSON.stringify(result, null, 2));
}

run().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
