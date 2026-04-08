"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const BASE_URL = "https://ncore.web.app";
const REPORT_DIR = path.join(ROOT, "reports");
const SHOT_DIR = path.join(REPORT_DIR, "full-regression-v123-shots");
const REPORT_PATH = path.join(REPORT_DIR, "full-regression-v123-browser-check-last.json");

const ACCOUNTS = {
  master: { id: "0", password: "0", label: "master" },
  employee: { id: "고다현", password: "0", label: "employee" },
  teamLeader: { id: "이동진", password: "0", label: "teamLeader" },
  ceo: { id: "이수형", password: "0", label: "ceo" }
};

function nowIso() {
  return new Date().toISOString();
}

function ensureDirs() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.mkdirSync(SHOT_DIR, { recursive: true });
}

function push(results, status, area, name, details = {}) {
  results.push({ status, area, name, details, at: nowIso() });
}

async function saveShot(page, name) {
  const safe = name.replace(/[^\w.-]+/g, "_");
  const file = path.join(SHOT_DIR, `${safe}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function clickVisibleButtonByText(page, text) {
  const buttons = page.locator("button");
  const count = await buttons.count();
  for (let i = 0; i < count; i += 1) {
    const btn = buttons.nth(i);
    const visible = await btn.isVisible().catch(() => false);
    if (!visible) continue;
    const inner = String((await btn.innerText().catch(() => "")) || "").trim();
    if (inner === text) {
      await btn.click();
      return true;
    }
  }
  return false;
}

async function clickNavButton(page, text) {
  const buttons = page.locator("#nav-info button");
  const count = await buttons.count();
  for (let i = 0; i < count; i += 1) {
    const btn = buttons.nth(i);
    const visible = await btn.isVisible().catch(() => false);
    if (!visible) continue;
    const inner = String((await btn.innerText().catch(() => "")) || "").trim();
    if (inner === text) {
      await btn.click();
      return true;
    }
  }
  return false;
}

async function clickButtonByTextAnywhere(page, text) {
  return page.evaluate((label) => {
    const btn = Array.from(document.querySelectorAll("button")).find((el) => {
      return (el.innerText || "").trim() === label && el.offsetParent !== null;
    });
    if (!btn) return false;
    btn.click();
    return true;
  }, text);
}

async function bodyText(page) {
  return page.locator("body").innerText();
}

async function login(page, id, password) {
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 60000 });
  const inputs = page.locator("input");
  await inputs.nth(0).fill(id);
  await inputs.nth(1).fill(password);
  const buttons = page.locator("button");
  const count = await buttons.count();
  for (let i = 0; i < count; i += 1) {
    const btn = buttons.nth(i);
    const visible = await btn.isVisible().catch(() => false);
    if (!visible) continue;
    const txt = String((await btn.innerText().catch(() => "")) || "").trim();
    if (txt === "로그인") {
      await btn.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2500);
      return;
    }
  }
  throw new Error("로그인 버튼을 찾지 못했습니다.");
}

async function withPage(browser, results, area, name, fn) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (error) => {
    pageErrors.push(String(error && error.message ? error.message : error));
  });

  try {
    const details = await fn(page);
    push(results, details.ok ? "passed" : "failed", area, name, {
      ...details,
      consoleErrors,
      pageErrors
    });
  } catch (error) {
    const screenshot = await saveShot(page, `${area}_${name}_error`).catch(() => "");
    push(results, "failed", area, name, {
      message: String(error && error.message ? error.message : error),
      screenshot,
      consoleErrors,
      pageErrors
    });
  } finally {
    await page.close();
  }
}

async function run() {
  ensureDirs();
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    await withPage(browser, results, "master", "permissions_tabs", async (page) => {
      await login(page, ACCOUNTS.master.id, ACCOUNTS.master.password);
      const clicked = await clickNavButton(page, "권한/설정");
      await page.waitForTimeout(2200);
      const body = await bodyText(page);
      const shot = await saveShot(page, "master_permissions");
      return {
        ok: clicked && body.includes("마스터 권한 관리") && body.includes("메일 설정") && body.includes("운영실"),
        clicked,
        hasMasterPermission: body.includes("마스터 권한 관리"),
        hasMailTab: body.includes("메일 설정"),
        hasOpsTab: body.includes("운영실"),
        screenshot: shot
      };
    });

    await withPage(browser, results, "master", "admin_ops", async (page) => {
      await login(page, ACCOUNTS.master.id, ACCOUNTS.master.password);
      await clickNavButton(page, "권한/설정");
      await page.waitForTimeout(1800);
      await clickVisibleButtonByText(page, "운영실");
      await page.waitForTimeout(3000);
      const body = await bodyText(page);
      const holidayCount = (body.match(/창립기념일/g) || []).length;
      const shot = await saveShot(page, "master_admin_ops");
      return {
        ok: body.includes("운영실") && body.includes("접속 로그 불러오기") && body.includes("보안 로그 불러오기"),
        hasOps: body.includes("운영실"),
        hasAccessLoad: body.includes("접속 로그 불러오기"),
        hasSecurityLoad: body.includes("보안 로그 불러오기"),
        hasAccessEmpty: body.includes("접속 로그를 아직 불러오지 않았습니다."),
        hasSecurityEmpty: body.includes("보안 로그를 아직 불러오지 않았습니다."),
        founderHolidayOccurrences: holidayCount,
        screenshot: shot
      };
    });

    await withPage(browser, results, "master", "user_management", async (page) => {
      await login(page, ACCOUNTS.master.id, ACCOUNTS.master.password);
      const clicked = await clickNavButton(page, "구성원 관리");
      await page.waitForTimeout(2200);
      const body = await bodyText(page);
      const tableWrap = await page.locator("#app-container .overflow-x-auto").first().evaluate((el) => ({
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth
      })).catch(() => null);
      const shot = await saveShot(page, "master_user_management");
      return {
        ok: clicked && body.includes("새 직원 등록") && body.includes("Web관리자") && !body.includes("DBG_") && !body.includes("SIM_"),
        clicked,
        hasNewUserForm: body.includes("새 직원 등록"),
        hasMasterRow: body.includes("Web관리자"),
        hasDBG: body.includes("DBG_"),
        hasSIM: body.includes("SIM_"),
        horizontalFit: tableWrap ? tableWrap.scrollWidth <= tableWrap.clientWidth : null,
        screenshot: shot
      };
    });

    await withPage(browser, results, "master", "workreport_status", async (page) => {
      await login(page, ACCOUNTS.master.id, ACCOUNTS.master.password);
      const clicked = await clickVisibleButtonByText(page, "잔업/특근 현황");
      await page.waitForTimeout(1500);
      const body = await bodyText(page);
      const detailClicked = await clickButtonByTextAnywhere(page, "상세확인");
      await page.waitForTimeout(1500);
      const detailBody = await bodyText(page);
      const shot = await saveShot(page, "master_workreport_status");
      return {
        ok: clicked && body.includes("월별 잔업/특근 현황") && detailBody.includes("정산 상세"),
        clicked,
        hasBoard: body.includes("월별 잔업/특근 현황"),
        detailClicked,
        hasDetail: detailBody.includes("정산 상세"),
        screenshot: shot
      };
    });

    await withPage(browser, results, "employee", "dashboard_and_workreport", async (page) => {
      await login(page, ACCOUNTS.employee.id, ACCOUNTS.employee.password);
      const bodyBefore = await bodyText(page);
      const annualClicked = await clickVisibleButtonByText(page, "연차 신청");
      await page.waitForTimeout(1200);
      const annualBody = await bodyText(page);
      const modalClose = await clickVisibleButtonByText(page, "취소").catch(() => false);
      if (modalClose) await page.waitForTimeout(600);
      const workApplyClicked = await clickVisibleButtonByText(page, "잔업/특근 신청");
      await page.waitForTimeout(1200);
      const workApplyBody = await bodyText(page);
      const workStatusClicked = await clickVisibleButtonByText(page, "잔업/특근 현황");
      await page.waitForTimeout(1200);
      const workStatusBody = await bodyText(page);
      const shot = await saveShot(page, "employee_workreport");
      return {
        ok: bodyBefore.includes("내 연차 현황") && annualClicked && annualBody.includes("연차 신청") && workApplyClicked && workApplyBody.includes("잔업/특근 신청") && workStatusBody.includes("월별 잔업/특근 현황"),
        hasDashboard: bodyBefore.includes("내 연차 현황"),
        annualClicked,
        annualModal: annualBody.includes("연차 신청"),
        workApplyClicked,
        workApplyModal: workApplyBody.includes("잔업/특근 신청"),
        workStatusClicked,
        workStatusBoard: workStatusBody.includes("월별 잔업/특근 현황"),
        screenshot: shot
      };
    });

    await withPage(browser, results, "teamLeader", "role_nav", async (page) => {
      await login(page, ACCOUNTS.teamLeader.id, ACCOUNTS.teamLeader.password);
      const body = await bodyText(page);
      const navTexts = await page.locator("#nav-info button").allTextContents().catch(() => []);
      return {
        ok: !body.includes("권한/설정") && !body.includes("구성원 관리") && body.includes("비번변경"),
        navTexts,
        hasPermissions: body.includes("권한/설정"),
        hasUserMgmt: body.includes("구성원 관리")
      };
    });

    await withPage(browser, results, "ceo", "role_nav_and_situation", async (page) => {
      await login(page, ACCOUNTS.ceo.id, ACCOUNTS.ceo.password);
      const before = await bodyText(page);
      const clicked = await clickNavButton(page, "전체 상황판");
      await page.waitForTimeout(1800);
      const after = await bodyText(page);
      return {
        ok: clicked && before.includes("전체 상황판") && after.includes("전체 상황판"),
        clicked,
        hasSituationButton: before.includes("전체 상황판"),
        hasPermissions: before.includes("권한/설정")
      };
    });

    await withPage(browser, results, "mobile", "mobile_core_flow", async (page) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await login(page, ACCOUNTS.master.id, ACCOUNTS.master.password);
      await page.evaluate(() => {
        if (window.app && typeof window.app.toggleMobileNavMenu === "function") {
          window.app.toggleMobileNavMenu();
        }
      });
      await page.waitForTimeout(800);
      const body = await bodyText(page);
      return {
        ok: body.includes("로그아웃") && body.includes("잔업/특근 신청"),
        hasLogout: body.includes("로그아웃"),
        hasWorkReportApply: body.includes("잔업/특근 신청"),
        hasPermissions: body.includes("권한/설정")
      };
    });

    const report = {
      startedAt: results[0]?.at || nowIso(),
      finishedAt: nowIso(),
      counts: {
        passed: results.filter((item) => item.status === "passed").length,
        failed: results.filter((item) => item.status === "failed").length
      },
      results
    };

    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
    console.log(JSON.stringify(report, null, 2));
    if (report.counts.failed > 0) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  ensureDirs();
  const report = {
    startedAt: nowIso(),
    finishedAt: nowIso(),
    fatal: { message: String(error && error.message ? error.message : error) }
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
});
