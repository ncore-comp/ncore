"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const admin = require("firebase-admin");

const ROOT = path.join(__dirname, "..");
const LOCAL_APP_URL = "file:///D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/index.html";
const API_URL = "https://ncore.web.app/api";
const REPORT_DIR = path.join(ROOT, "reports");
const REPORT_PATH = path.join(REPORT_DIR, "remaining-operational-tests-last.json");
const SERVICE_ACCOUNT_PATH = path.join(ROOT, "ncore-vacation-system-firebase-adminsdk-fbsvc-ddef59ca56.json");

function nowIso() {
  return new Date().toISOString();
}

function push(results, status, name, details = {}) {
  results.push({ status, name, details, at: nowIso() });
}

async function apiGet(url) {
  const res = await fetch(url);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return { result: "error", message: text, status: res.status };
  }
}

async function apiPost(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return { result: "error", message: text, status: res.status };
  }
}

function initAdmin() {
  if (admin.apps.length) return admin.firestore();
  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin.firestore();
}

async function loginApi(id, password) {
  return apiPost({ action: "login_boot", id, password });
}

async function withPage(browser, fn) {
  const page = await browser.newPage();
  const dialogs = [];
  const consoleErrors = [];
  page.on("dialog", async (dialog) => {
    dialogs.push({ type: dialog.type(), message: dialog.message() });
    await dialog.accept();
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  try {
    return await fn(page, dialogs, consoleErrors);
  } finally {
    await page.close();
  }
}

async function loginUi(page, id, password) {
  await page.goto(LOCAL_APP_URL, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.getByPlaceholder("ID 입력").fill(id);
  await page.getByPlaceholder("비밀번호 입력").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForTimeout(1800);
}

async function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const db = initAdmin();
  const results = [];
  const browser = await chromium.launch({ headless: true });

  try {
    push(results, "info", "context", { localApp: LOCAL_APP_URL, api: API_URL });

    await withPage(browser, async (page, dialogs, consoleErrors) => {
      await loginUi(page, "0", "0");
      const before = await page.getByRole("button", { name: "로그아웃" }).isVisible().catch(() => false);
      await page.reload({ waitUntil: "load", timeout: 60000 });
      await page.waitForTimeout(2000);
      const after = await page.getByRole("button", { name: "로그아웃" }).isVisible().catch(() => false);
      push(results, before && after && dialogs.length === 0 ? "passed" : "failed", "새로고침 후 화면/세션 복원", {
        beforeLogoutVisible: before,
        afterLogoutVisible: after,
        dialogs,
        consoleErrors
      });
    });

    const masterLogin = await loginApi("0", "0");
    const masterToken = masterLogin.sessionToken || "";

    await apiPost({
      action: "save_user_special_leaves",
      sessionToken: masterToken,
      userId: "고다현",
      leaves: [
        {
          userId: "고다현",
          typeKey: "celebration_5",
          totalHours: 40,
          usedHours: 0,
          note: "remaining-test-grant"
        }
      ]
    });

    await withPage(browser, async (page, dialogs) => {
      await loginUi(page, "고다현", "0");
      await page.getByRole("button", { name: "연차 신청" }).click();
      await page.waitForTimeout(600);
      const typeSelect = page.locator("#req-type");
      const optionRows = await typeSelect.locator("option").evaluateAll((nodes) =>
        nodes.map((node) => ({
          label: String(node.textContent || "").trim(),
          value: String(node.value || "").trim()
        }))
      );
      const specialOption = optionRows.find((row) => row.label.includes("결혼(본인)"));
      const hasSpecial = !!specialOption;
      if (hasSpecial) {
        await typeSelect.selectOption(specialOption.value);
        await page.locator("#req-start-date").fill("2026-03-22");
        await page.waitForTimeout(500);
      }
      const specialStatus = await page.locator("#date-status").textContent().catch(() => "");
      await typeSelect.selectOption({ label: "연차" });
      await page.locator("#req-start-date").fill("2026-03-22");
      await page.waitForTimeout(500);
      const annualStatus = await page.locator("#date-status").textContent().catch(() => "");
      push(results, hasSpecial && String(specialStatus).includes("신청이 가능") && String(specialStatus).includes("달력일 기준") && String(annualStatus).includes("신청 불가") ? "passed" : "failed", "경조휴가 차감 방식/주말공휴일 허용 규칙", {
        hasSpecial,
        specialStatus,
        annualStatus,
        dialogs
      });
    });

    const concurrentCount = 20;
    const concurrentResults = await Promise.all(
      Array.from({ length: concurrentCount }, () => loginApi("0", "0"))
    );
    const concurrentSuccess = concurrentResults.filter((item) => item && item.result === "success").length;
    push(results, concurrentSuccess === concurrentCount ? "passed" : "failed", "동시 로그인 다수 처리", {
      attempted: concurrentCount,
      success: concurrentSuccess
    });

    const beforeLoginLogs = Date.now();
    await loginApi("0", "0");
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const recentLoginLogs = await db.collection("accessLogs").where("type", "==", "Login").get();
    const foundRecentLogin = recentLoginLogs.docs
      .map((doc) => doc.data())
      .some((item) => String(item.userId || "") === "0" && String(item.detail || "") === "login_success");
    push(results, foundRecentLogin ? "passed" : "failed", "로그인 로그 기록 정상", {
      foundRecentLogin,
      checkedAfter: beforeLoginLogs
    });

    const timings = [];
    for (let i = 0; i < 5; i++) {
      const t0 = Date.now();
      const json = await loginApi("0", "0");
      timings.push({ name: "login_boot", ms: Date.now() - t0, ok: json.result === "success" });
    }
    for (let i = 0; i < 5; i++) {
      const t0 = Date.now();
      const json = await apiGet(`${API_URL}?action=load&scope=boot`);
      timings.push({ name: "load_boot", ms: Date.now() - t0, ok: json.result === "success" });
    }
    const maxMs = Math.max(...timings.map((item) => item.ms));
    const avgMs = Math.round(timings.reduce((sum, item) => sum + item.ms, 0) / timings.length);
    push(results, timings.every((item) => item.ok) && maxMs < 5000 ? "passed" : "failed", "Functions 응답 시간 확인", {
      avgMs,
      maxMs,
      timings
    });

    await withPage(browser, async (page, dialogs) => {
      await loginUi(page, "고다현", "0");
      let intercepted = 0;
      await page.route("https://ncore.web.app/api", async (route, request) => {
        if (request.method() !== "POST") return route.continue();
        const body = request.postData() || "";
        let parsed = null;
        try { parsed = JSON.parse(body); } catch (e) {}
        if (parsed && parsed.action === "upsert_request" && intercepted < 2) {
          intercepted += 1;
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ result: "error", message: "busy" })
          });
        }
        return route.continue();
      });
      const reqId = `retry_${Date.now()}`;
      const saved = await page.evaluate(async ({ reqId }) => {
        const u = app.currentUser;
        return await db.upsertReq({
          id: reqId,
          userId: u.id,
          userName: u.name,
          dept: u.dept,
          role: u.role,
          type: "연차",
          startDate: "2026-07-20",
          endDate: "2026-07-20",
          hours: 8,
          timeRange: "",
          reason: "Refresh",
          status: "pending",
          timestamp: moment().format("YYYY-MM-DD HH:mm:ss"),
          specialLeaveTypeKey: "",
          specialLeaveTypeLabel: "",
          rejectReason: ""
        }, "");
      }, { reqId });
      push(results, saved === true && intercepted === 2 ? "passed" : "failed", "Firestore 쓰기 실패 시 재시도 동작 확인", {
        saved,
        intercepted,
        dialogs
      });
      await page.unroute("https://ncore.web.app/api");
      try {
        await page.evaluate(async ({ reqId }) => { await db.deleteReq(reqId); }, { reqId });
      } catch (e) {}
    });

    await withPage(browser, async (page, dialogs) => {
      await loginUi(page, "0", "0");
      await page.context().setOffline(true);
      await page.reload({ waitUntil: "load", timeout: 60000 });
      await page.waitForTimeout(1200);
      const offlineDialogs = [...dialogs];
      await page.context().setOffline(false);
      await page.reload({ waitUntil: "load", timeout: 60000 });
      await page.waitForTimeout(1800);
      const recovered = await page.getByRole("button", { name: "로그아웃" }).isVisible().catch(() => false);
      push(results, recovered && offlineDialogs.length > 0 ? "passed" : "failed", "네트워크 끊김/복구 시 UI 처리 확인", {
        offlineDialogs,
        recovered
      });
    });

    const report = {
      startedAt: results[0]?.at || nowIso(),
      finishedAt: nowIso(),
      counts: {
        passed: results.filter((item) => item.status === "passed").length,
        failed: results.filter((item) => item.status === "failed").length,
        info: results.filter((item) => item.status === "info").length
      },
      results
    };
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
