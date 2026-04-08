"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const BASE_URL = "https://ncore.web.app";
const REPORT_DIR = path.join(ROOT, "reports");
const SHOT_DIR = path.join(REPORT_DIR, "manual-v122-shots");
const REPORT_PATH = path.join(REPORT_DIR, "manual-v122-browser-check-last.json");

const ACCOUNTS = {
  master: { id: "0", password: "0", label: "master" },
  employee: { id: "고다현", password: "0", label: "employee" }
};

function nowIso() {
  return new Date().toISOString();
}

function ensureDirs() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.mkdirSync(SHOT_DIR, { recursive: true });
}

async function saveShot(page, name) {
  const safe = name.replace(/[^\w.-]+/g, "_");
  const file = path.join(SHOT_DIR, `${safe}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function login(page, id, password) {
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.getByPlaceholder("ID 입력").fill(id);
  await page.getByPlaceholder("비밀번호 입력").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1800);
}

async function collectNavButtons(page) {
  const texts = await page.locator("#nav-info button").allTextContents().catch(() => []);
  return texts.map((item) => String(item || "").trim()).filter(Boolean);
}

async function withPage(browser, results, name, fn) {
  const page = await browser.newPage();
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
    results.push({
      status: details.ok ? "passed" : "failed",
      name,
      details: {
        ...details,
        consoleErrors,
        pageErrors
      },
      at: nowIso()
    });
  } catch (error) {
    const screenshot = await saveShot(page, `${name}_error`).catch(() => "");
    results.push({
      status: "failed",
      name,
      details: {
        message: String(error && error.message ? error.message : error),
        screenshot,
        consoleErrors,
        pageErrors
      },
      at: nowIso()
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
    await withPage(browser, results, "마스터 홈/달력", async (page) => {
      await login(page, ACCOUNTS.master.id, ACCOUNTS.master.password);
      await page.waitForTimeout(1200);
      const navButtons = await collectNavButtons(page);

      const tabsToClick = ["개인", "매뉴얼팀", "파츠북팀", "모두"];
      for (const tab of tabsToClick) {
        const target = page.getByRole("button", { name: tab }).first();
        if (await target.isVisible().catch(() => false)) {
          await target.click();
          await page.waitForTimeout(300);
        }
      }

      const shot = await saveShot(page, "01_master_home_calendar");
      const ok = navButtons.includes("권한/설정") && navButtons.includes("구성원 관리");
      return { ok, navButtons, screenshot: shot };
    });

    await withPage(browser, results, "직원 잔업특근 신청 흐름", async (page) => {
      await login(page, ACCOUNTS.employee.id, ACCOUNTS.employee.password);
      const navButtons = await collectNavButtons(page);
      const applyButton = page.getByRole("button", { name: "잔업/특근 신청" }).first();
      const applyVisible = await applyButton.isVisible().catch(() => false);
      if (applyVisible) {
        await applyButton.click();
        await page.waitForTimeout(800);
      }

      const boardTitle = await page.locator("text=월별 잔업/특근").first().isVisible().catch(() => false);
      const reportAdd = page.locator("button").filter({ hasText: "보고추가" }).first();
      const reportAddVisible = await reportAdd.isVisible().catch(() => false);
      if (reportAddVisible) {
        await reportAdd.click();
        await page.waitForTimeout(600);
      }

      const formVisible = await page.locator("#work-report-modal").isVisible().catch(() => false);
      const shot = await saveShot(page, "02_employee_workreport_apply");
      return {
        ok: applyVisible && boardTitle,
        navButtons,
        applyVisible,
        boardTitle,
        reportAddVisible,
        formVisible,
        screenshot: shot
      };
    });

    await withPage(browser, results, "마스터 잔업특근 현황/상세", async (page) => {
      await login(page, ACCOUNTS.master.id, ACCOUNTS.master.password);
      const statusButton = page.getByRole("button", { name: "잔업/특근 현황" }).first();
      const statusVisible = await statusButton.isVisible().catch(() => false);
      if (statusVisible) {
        await statusButton.click();
        await page.waitForTimeout(1000);
      }

      const boardVisible = await page.locator("text=월별 잔업/특근 현황").first().isVisible().catch(() => false);
      const detailLink = page.locator("table").locator("text=상세확인").first();
      const detailVisible = await detailLink.isVisible().catch(() => false);
      if (detailVisible) {
        await detailLink.click();
        await page.waitForTimeout(1000);
      }

      const detailModalVisible = await page.locator("text=정산 상세").first().isVisible().catch(() => false);
      const shot = await saveShot(page, "03_master_workreport_status");
      return {
        ok: statusVisible && boardVisible && (detailVisible || detailModalVisible),
        statusVisible,
        boardVisible,
        detailVisible,
        detailModalVisible,
        screenshot: shot
      };
    });

    await withPage(browser, results, "마스터 권한설정/구성원관리", async (page) => {
      await login(page, ACCOUNTS.master.id, ACCOUNTS.master.password);

      await page.getByRole("button", { name: "권한/설정" }).click();
      await page.waitForTimeout(1200);
      const permissionsVisible = await page.locator("text=마스터 권한 관리").first().isVisible().catch(() => false);
      const workreportTab = page.getByRole("button", { name: "잔업/특근 설정" }).first();
      const workreportTabVisible = await workreportTab.isVisible().catch(() => false);
      if (workreportTabVisible) {
        await workreportTab.click();
        await page.waitForTimeout(600);
      }
      const workreportSettingsVisible = await page.locator("text=잔업/특근 설정").first().isVisible().catch(() => false);

      await page.getByRole("button", { name: "구성원 관리" }).click();
      await page.waitForTimeout(1200);
      const userMgmtVisible = await page.locator("text=구성원 관리").first().isVisible().catch(() => false);
      const shot = await saveShot(page, "04_master_permissions_users");
      return {
        ok: permissionsVisible && workreportTabVisible && workreportSettingsVisible && userMgmtVisible,
        permissionsVisible,
        workreportTabVisible,
        workreportSettingsVisible,
        userMgmtVisible,
        screenshot: shot
      };
    });

    await withPage(browser, results, "마스터 전체상황판/자리배치도", async (page) => {
      await login(page, ACCOUNTS.master.id, ACCOUNTS.master.password);
      await page.getByRole("button", { name: "전체 상황판" }).click();
      await page.waitForTimeout(1200);

      const boardVisible = await page.locator("text=전체 상황판").first().isVisible().catch(() => false);
      const seatCell = page.locator(".situation-board-cell").filter({
        has: page.locator(".member-absence-badge, .rounded-full, .bg-blue-50, .bg-yellow-50, .bg-red-50, .bg-emerald-50")
      }).first();
      const seatCellVisible = await seatCell.isVisible().catch(() => false);
      if (seatCellVisible) {
        await seatCell.click();
        await page.waitForTimeout(1000);
      }
      const seatMapVisible = await page.locator("text=당일 부재 인원").first().isVisible().catch(() => false);
      const shot = await saveShot(page, "05_master_situation_board");
      return {
        ok: seatCellVisible && seatMapVisible,
        boardVisible,
        seatCellVisible,
        seatMapVisible,
        screenshot: shot
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
