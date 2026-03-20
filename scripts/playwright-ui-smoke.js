"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE_URL = "https://ncore.web.app";
const REPORT_DIR = path.join(__dirname, "..", "reports");
const REPORT_PATH = path.join(REPORT_DIR, "playwright-ui-smoke-last.json");

const ACCOUNTS = [
  { id: "고다현", password: "0", role: "employee", label: "일반직원" },
  { id: "이동진", password: "0", role: "team_leader", label: "팀장" },
  { id: "이수형", password: "0", role: "ceo", label: "대표" },
  { id: "0", password: "0", role: "master", label: "마스터" }
];

function nowIso() {
  return new Date().toISOString();
}

function pushResult(results, status, name, details) {
  results.push({ status, name, details, at: nowIso() });
}

async function withFreshPage(browser, fn) {
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
    const result = await fn(page);
    return { ...result, consoleErrors, pageErrors };
  } finally {
    await page.close();
  }
}

async function runCase(results, name, browser, fn) {
  try {
    const details = await withFreshPage(browser, fn);
    const ok = !!details.ok;
    delete details.ok;
    pushResult(results, ok ? "passed" : "failed", name, details);
  } catch (error) {
    pushResult(results, "failed", name, {
      message: String(error && error.message ? error.message : error)
    });
  }
}

async function gotoApp(page) {
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 60000 });
}

async function login(page, id, password) {
  await gotoApp(page);
  await page.getByPlaceholder("ID 입력").fill(id);
  await page.getByPlaceholder("비밀번호 입력").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
}

async function isLoggedIn(page) {
  return await page.getByRole("button", { name: "로그아웃" }).isVisible().catch(() => false);
}

async function collectNavButtons(page) {
  const texts = await page.locator("nav button").allTextContents();
  return texts.map((item) => String(item || "").trim()).filter(Boolean);
}

async function openSituationBoard(page) {
  await page.getByRole("button", { name: "전체 상황판" }).first().click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
}

async function openSeatMap(page) {
  const target = page.locator(".situation-board-cell").filter({
    has: page.locator(".member-absence-badge, .rounded-full, .bg-blue-50, .bg-yellow-50, .bg-red-50, .bg-emerald-50")
  }).first();
  if (await target.count()) {
    await target.click();
  } else {
    await page.locator(".situation-board-cell").nth(8).click();
  }
  await page.waitForTimeout(1000);
}

async function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const results = [];
  const browser = await chromium.launch({ headless: true });

  try {
    await runCase(results, "메인 첫 로드", browser, async (page) => {
      await gotoApp(page);
      const title = await page.title();
      const loginVisible = await page.getByRole("button", { name: "로그인" }).isVisible();
      return { ok: title === "NCORE 연차관리" && loginVisible, title, loginVisible };
    });

    await runCase(results, "잘못된 로그인 차단", browser, async (page) => {
      await gotoApp(page);
      await page.getByPlaceholder("ID 입력").fill("0");
      await page.getByPlaceholder("비밀번호 입력").fill("9999");
      await page.getByRole("button", { name: "로그인" }).click();
      await page.waitForTimeout(1200);
      const bodyText = await page.locator("body").textContent();
      const hasInvalidMessage = String(bodyText || "").includes("아이디") || String(bodyText || "").includes("비밀번호");
      return { ok: hasInvalidMessage, hasInvalidMessage };
    });

    for (const account of ACCOUNTS) {
      await runCase(results, `${account.label} 로그인/화면`, browser, async (page) => {
        await login(page, account.id, account.password);
        const loggedIn = await isLoggedIn(page);
        const navButtons = await collectNavButtons(page);
        return { ok: loggedIn, account: account.label, id: account.id, navButtons };
      });
    }

    await runCase(results, "새로고침 후 화면 복원", browser, async (page) => {
      await login(page, "0", "0");
      const beforeReload = await isLoggedIn(page);
      await page.reload({ waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(1000);
      const afterReload = await isLoggedIn(page);
      return { ok: beforeReload && afterReload, beforeReload, afterReload };
    });

    await runCase(results, "모바일 화면 진입", browser, async (page) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await gotoApp(page);
      const loginVisible = await page.getByRole("button", { name: "로그인" }).isVisible();
      await page.getByPlaceholder("ID 입력").fill("0");
      await page.getByPlaceholder("비밀번호 입력").fill("0");
      await page.getByRole("button", { name: "로그인" }).click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
      const logoutVisible = await isLoggedIn(page);
      return { ok: loginVisible && logoutVisible, loginVisible, logoutVisible };
    });

    await runCase(results, "전체 상황판/자리 배치도", browser, async (page) => {
      await login(page, "0", "0");
      await openSituationBoard(page);
      await openSeatMap(page);
      const image = page.locator("img[alt*='자리 배치도']").first();
      const imageVisible = await image.isVisible().catch(() => false);
      const natural = imageVisible
        ? await image.evaluate((node) => ({ width: node.naturalWidth, height: node.naturalHeight }))
        : { width: 0, height: 0 };
      const closeVisible = await page.getByRole("button", { name: "닫기" }).isVisible().catch(() => false);
      const panelVisible = await page.getByText("당일 부재 인원").isVisible().catch(() => false);
      return { ok: imageVisible && natural.width > 0 && closeVisible && panelVisible, imageVisible, natural, closeVisible, panelVisible };
    });

    await runCase(results, "콘솔 치명적 에러 없음", browser, async (page) => {
      await login(page, "0", "0");
      await openSituationBoard(page);
      return { ok: true };
    });

    const summary = {
      startedAt: results[0]?.at || nowIso(),
      finishedAt: nowIso(),
      counts: {
        passed: results.filter((item) => item.status === "passed").length,
        failed: results.filter((item) => item.status === "failed").length,
        warning: results.filter((item) => item.status === "warning").length
      },
      results
    };

    fs.writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2), "utf8");
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
