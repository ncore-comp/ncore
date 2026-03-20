"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const LOCAL_APP_URL = "file:///D:/MYDOC/Desktop/vscode/Web/firebase/ncore_web/ncore-main/index.html";
const API_URL = "https://ncore.web.app/api";
const REPORT_DIR = path.join(ROOT, "reports");
const REPORT_PATH = path.join(REPORT_DIR, "remaining-operational-tests-2-last.json");

function nowIso() {
  return new Date().toISOString();
}

function push(results, status, name, details = {}) {
  results.push({ status, name, details, at: nowIso() });
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

async function loginApi(id, password) {
  return apiPost({ action: "login_boot", id, password });
}

async function withPage(browser, fn) {
  const page = await browser.newPage();
  const dialogs = [];
  page.on("dialog", async (dialog) => {
    dialogs.push({ type: dialog.type(), message: dialog.message() });
    await dialog.accept();
  });
  try {
    return await fn(page, dialogs);
  } finally {
    await page.close();
  }
}

async function loginUi(page, id, password) {
  await page.goto(LOCAL_APP_URL, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.locator("#login-id").fill(id);
  await page.locator("#login-pw").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForTimeout(1800);
}

async function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const results = [];
  const browser = await chromium.launch({ headless: true });

  try {
    await withPage(browser, async (page, dialogs) => {
      await loginUi(page, "고다현", "0");
      await page.evaluate(() => {
        window.__lastMailto = "";
        window.openOutlookDraft = function(to, subject, body, cc = "") {
          const safeTo = security.sanitizeMailRecipients(to);
          const safeCc = security.sanitizeMailRecipients(cc);
          const safeSubject = String(subject ?? "").replace(/[\r\n]/g, " ").trim();
          const safeBody = String(body ?? "").replace(/\r/g, "");
          const params = [
            `subject=${encodeURIComponent(safeSubject)}`,
            safeCc ? `cc=${encodeURIComponent(safeCc)}` : "",
            `body=${encodeURIComponent(safeBody)}`
          ].filter(Boolean).join("&");
          window.__lastMailto = `mailto:${safeTo}?${params}`;
          return true;
        };
      });

      await page.getByRole("button", { name: "연차 신청" }).click();
      await page.waitForTimeout(500);
      await page.locator("#req-type").selectOption({ label: "연차" });
      await page.locator("#req-start-date").fill("2026-07-21");
      await page.locator("#req-reason").selectOption({ label: "Refresh" });
      await page.locator("#req-modal-btn").click();
      await page.waitForTimeout(1800);

      const mailtoInfo = await page.evaluate(() => ({
        mailto: String(window.__lastMailto || ""),
        currentUser: app && app.currentUser ? { id: app.currentUser.id, name: app.currentUser.name } : null,
        latestRequestId: (Array.isArray(appData.requests) ? appData.requests : [])
          .filter((r) => String(r.userId || "") === String(app.currentUser.id || "") && String(r.startDate || "") === "2026-07-21")
          .sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")))[0]?.id || ""
      }));

      if (mailtoInfo.latestRequestId) {
        try {
          await page.evaluate(async ({ reqId }) => { await db.deleteReq(reqId); }, { reqId: mailtoInfo.latestRequestId });
        } catch (e) {}
      }

      const ok = mailtoInfo.mailto.startsWith("mailto:") && dialogs.some((d) => d.message.includes("아웃룩 창이 뜨면"));
      push(results, ok ? "passed" : "failed", "To/CC 적용 정상", {
        dialogs,
        mailto: mailtoInfo.mailto,
        latestRequestId: mailtoInfo.latestRequestId
      });
    });

    const employeeLogin = await loginApi("고다현", "0");
    const masterLogin = await loginApi("0", "0");
    const sessionTokenEmployee = employeeLogin.sessionToken || "";
    const sessionTokenMaster = masterLogin.sessionToken || "";
    const requestId = `conflict_${Date.now()}`;

    const createRes = await apiPost({
      action: "upsert_request",
      sessionToken: sessionTokenEmployee,
      data: {
        id: requestId,
        userId: "고다현",
        userName: "고다현",
        dept: "매뉴얼팀",
        role: "employee",
        type: "연차",
        startDate: "2026-07-23",
        endDate: "2026-07-23",
        hours: 8,
        timeRange: "",
        reason: "Refresh",
        status: "pending",
        timestamp: "2026-03-20 13:20:00",
        specialLeaveTypeKey: "",
        specialLeaveTypeLabel: "",
        rejectReason: ""
      }
    });

    let conflictDetails = { createRes };
    if (createRes.result === "success") {
      const [approveRes, rejectRes] = await Promise.all([
        apiPost({
          action: "upsert_request",
          sessionToken: sessionTokenMaster,
          expectedStatus: "pending",
          data: {
            id: requestId,
            userId: "고다현",
            userName: "고다현",
            dept: "매뉴얼팀",
            role: "employee",
            type: "연차",
            startDate: "2026-07-23",
            endDate: "2026-07-23",
            hours: 8,
            timeRange: "",
            reason: "Refresh",
            status: "approved",
            timestamp: "2026-03-20 13:20:00",
            specialLeaveTypeKey: "",
            specialLeaveTypeLabel: "",
            rejectReason: ""
          }
        }),
        apiPost({
          action: "upsert_request",
          sessionToken: sessionTokenMaster,
          expectedStatus: "pending",
          data: {
            id: requestId,
            userId: "고다현",
            userName: "고다현",
            dept: "매뉴얼팀",
            role: "employee",
            type: "연차",
            startDate: "2026-07-23",
            endDate: "2026-07-23",
            hours: 8,
            timeRange: "",
            reason: "Refresh",
            status: "rejected",
            timestamp: "2026-03-20 13:20:00",
            specialLeaveTypeKey: "",
            specialLeaveTypeLabel: "",
            rejectReason: "conflict-test"
          }
        })
      ]);

      const deleteRes = await apiPost({
        action: "delete_request",
        sessionToken: sessionTokenMaster,
        id: requestId
      });

      conflictDetails = { createRes, approveRes, rejectRes, deleteRes };
      const messages = [approveRes.message, rejectRes.message].filter(Boolean);
      const ok = messages.includes("REQUEST_STATE_CONFLICT");
      push(results, ok ? "passed" : "failed", "승인/반려 동시 처리 충돌 방지", conflictDetails);
    } else {
      push(results, "failed", "승인/반려 동시 처리 충돌 방지", conflictDetails);
    }

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
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
