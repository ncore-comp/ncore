"use strict";

const { chromium } = require("playwright");

const BASE_URL = "https://ncore.web.app";
const LOGIN_ID = "0";
const LOGIN_PW = "0";
const TARGET_USER_NAME = "김효창";
const TARGET_DATE = "2026-03-27";
const UPDATED_REASON = "여행";
const UPDATED_DURATION = "3";

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });

  let createdRequestId = "";

  try {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.fill("#login-id", LOGIN_ID);
    await page.fill("#login-pw", LOGIN_PW);
    await Promise.all([
      page.waitForLoadState("networkidle"),
      page.click("button:has-text('로그인')")
    ]);

    await page.click("button:has-text('권한/설정')");
    await page.waitForTimeout(500);
    await page.click("button:has-text('운영실')");
    await page.waitForTimeout(800);

    const setup = await page.evaluate(async ({ targetUserName, targetDate }) => {
      const targetUser = app.getAdminOpsTargetUsers().find((user) => String(user.name) === String(targetUserName));
      if (!targetUser) throw new Error("TARGET_USER_NOT_FOUND");

      app.adminOpsTargetUserId = String(targetUser.id);
      app.adminOpsSelectedDate = targetDate;
      app.adminOpsViewYear = moment(targetDate).year();
      app.adminOpsViewMonth = moment(targetDate).month();
      await app.loadAdminOpsPanelData({ force: true });
      app.renderMasterPermissionPage();

      const endHour = app.getTimeoffEndHourForDate(targetUser, targetDate);
      const startHour = timeLogic.calcStart(2, endHour);
      const requestId = String(Date.now());
      const tempReq = {
        id: requestId,
        userId: targetUser.id,
        userName: targetUser.name,
        dept: targetUser.dept,
        role: targetUser.role,
        type: "시간차(퇴근)",
        startDate: targetDate,
        endDate: targetDate,
        hours: 2,
        timeRange: `${startHour}:00~${endHour}:00`,
        reason: "Refresh",
        status: "approved",
        timestamp: new Date().toISOString()
      };

      const ok = await db.upsertReq(tempReq, { keepOverlayOnSuccess: false, expectedStatus: "" });
      if (!ok) throw new Error("TEMP_REQUEST_CREATE_FAILED");
      await db.load();
      app.adminOpsSelectedDate = targetDate;
      app.renderMasterPermissionPage();
      return { requestId, targetUserId: String(targetUser.id), expectedEndHour: String(endHour) };
    }, { targetUserName: TARGET_USER_NAME, targetDate: TARGET_DATE });

    createdRequestId = setup.requestId;

    await page.evaluate((requestId) => {
      app.editAdminManagedRequest(requestId);
    }, createdRequestId);
    await page.waitForTimeout(500);

    const modalCheck = await page.evaluate(() => {
      return {
        title: document.getElementById("req-modal-title")?.innerText || "",
        targetUserText: document.getElementById("req-target-user")?.selectedOptions?.[0]?.text || "",
        endHour: document.getElementById("req-end-time-timeoff")?.value || "",
        reason: document.getElementById("req-reason")?.value || "",
        duration: document.getElementById("req-duration-timeoff")?.value || "",
        editingId: String(app.editingId || "")
      };
    });

    if (modalCheck.title !== "관리자 대리 수정") throw new Error(`MODAL_TITLE_MISMATCH:${modalCheck.title}`);
    if (!modalCheck.targetUserText.includes(TARGET_USER_NAME)) throw new Error(`TARGET_USER_MISMATCH:${modalCheck.targetUserText}`);
    if (modalCheck.endHour !== setup.expectedEndHour) throw new Error(`END_HOUR_MISMATCH:${modalCheck.endHour}:${setup.expectedEndHour}`);

    await page.selectOption("#req-duration-timeoff", UPDATED_DURATION);
    await page.selectOption("#req-reason", UPDATED_REASON);
    await page.click("#req-modal-btn");
    await page.waitForTimeout(1500);

    const postSave = await page.evaluate(async ({ requestId, targetDate }) => {
      await db.load();
      await db.loadAdminOpsData();
      app.adminOpsSelectedDate = targetDate;
      app.renderMasterPermissionPage();
      const req = (appData.requests || []).find((item) => String(item.id) === String(requestId));
      if (!req) throw new Error("REQUEST_NOT_FOUND_AFTER_SAVE");
      const relatedLog = (appData.accessLogs || []).find((item) =>
        String(item.type || "") === "AdminRequestEdit" &&
        String(item.detail || "").includes(String(requestId))
      );
      return {
        id: String(req.id),
        status: String(req.status || ""),
        reason: String(req.reason || ""),
        timeRange: String(req.timeRange || ""),
        hours: Number(req.hours || 0),
        hasAdminEditLog: !!relatedLog,
        logType: relatedLog ? String(relatedLog.type || "") : "",
        logDetail: relatedLog ? String(relatedLog.detail || "") : ""
      };
    }, { requestId: createdRequestId, targetDate: TARGET_DATE });

    if (postSave.status !== "approved") throw new Error(`STATUS_CHANGED:${postSave.status}`);
    if (postSave.reason !== UPDATED_REASON) throw new Error(`REASON_NOT_UPDATED:${postSave.reason}`);
    if (postSave.hours !== 3) throw new Error(`HOURS_NOT_UPDATED:${postSave.hours}`);
    if (postSave.timeRange !== `13:00~${setup.expectedEndHour}:00`) {
      throw new Error(`TIME_RANGE_MISMATCH:${postSave.timeRange}`);
    }
    if (!postSave.hasAdminEditLog) throw new Error("ADMIN_EDIT_LOG_NOT_FOUND");

    await page.evaluate(async (requestId) => {
      await db.deleteReq(requestId);
      await db.load();
    }, createdRequestId);
    createdRequestId = "";

    console.log(JSON.stringify({
      ok: true,
      targetUser: TARGET_USER_NAME,
      targetDate: TARGET_DATE,
      expectedEndHour: setup.expectedEndHour,
      modal: modalCheck,
      saved: postSave
    }, null, 2));
  } finally {
    if (createdRequestId) {
      try {
        await page.evaluate(async (requestId) => {
          await db.deleteReq(requestId);
        }, createdRequestId);
      } catch (e) {
        // ignore cleanup errors
      }
    }
    await wait(300);
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
