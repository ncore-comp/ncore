"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const APP_URL = "https://ncore.web.app";
const API_URL = "https://ncore.web.app/api";
const REPORT_DIR = path.join(__dirname, "..", "reports");
const REPORT_PATH = path.join(REPORT_DIR, "verify-situation-board-timeaware-seatmap-last.json");

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

async function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const loginData = await loginBoot("0", "0");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

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

    const result = await page.evaluate(() => {
      const originalRequests = JSON.parse(JSON.stringify(Array.isArray(appData.requests) ? appData.requests : []));
      const originalUsers = JSON.parse(JSON.stringify(Array.isArray(appData.users) ? appData.users : []));
      const today = moment().format("YYYY-MM-DD");
      const now = moment();
      const users = Array.isArray(appData.users) ? appData.users : [];

      const pickUser = (name) => users.find((user) => String(user && user.name || "").trim() === name);
      const selected = {
        leave: pickUser("김효창"),
        annual: pickUser("김유진"),
        out: pickUser("이우석"),
        halfday: pickUser("최진"),
        inactiveOut: pickUser("박채원")
      };

      const missingUsers = Object.entries(selected)
        .filter(([, user]) => !user)
        .map(([key]) => key);
      if (missingUsers.length) {
        return {
          result: "failed",
          reason: "required users missing",
          missingUsers
        };
      }

      const formatHourRange = (startHour, endHour) => `${startHour}:00~${endHour}:00`;
      const currentHour = now.hours();
      const activeStartHour = Math.max(0, Math.min(currentHour, 23));
      const activeEndHour = Math.min(activeStartHour + 1, 24);

      let inactiveStartHour = currentHour + 2;
      let inactiveEndHour = inactiveStartHour + 1;
      if (inactiveEndHour > 24) {
        inactiveStartHour = Math.max(0, currentHour - 3);
        inactiveEndHour = Math.max(inactiveStartHour + 1, currentHour - 2);
      }

      const approvedStatus = "approved";
      const halfdayType = now.hours() < 12 ? "반차(오전)" : "반차(오후)";

      const createRequest = (id, user, type, timeRange = "", hours = 8) => ({
        id,
        userId: String(user.id),
        userName: user.name,
        dept: user.dept || "",
        type,
        reason: "verify",
        startDate: today,
        endDate: today,
        status: approvedStatus,
        hours,
        timeRange,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      });

      const sampleRequests = [
        createRequest("verify-annual", selected.annual, "연차", "", 8),
        createRequest("verify-halfday", selected.halfday, halfdayType, "", 4),
        createRequest("verify-leave", selected.leave, "시간차(퇴근)", formatHourRange(activeStartHour, activeEndHour), 1),
        createRequest("verify-out", selected.out, "시간차(외출)", formatHourRange(activeStartHour, activeEndHour), 1),
        createRequest("verify-out-inactive", selected.inactiveOut, "시간차(외출)", formatHourRange(inactiveStartHour, inactiveEndHour), 1)
      ];

      appData.requests = sampleRequests;

      const dayEvents = app.getSituationBoardEventsForDate(today);
      const summary = app.getSituationBoardDailySummary(dayEvents);
      const statusMap = app.getSituationBoardSeatStatusMap(today);
      const seatMapHtml = app.renderSituationBoardSeatMapModalContent(today);

      const seatMapRoot = document.createElement("div");
      seatMapRoot.innerHTML = seatMapHtml;

      const absentNames = Array.from(statusMap.values()).map((req) => String(req.userName || ""));
      const chipsText = app.renderSituationBoardDetailPanel(today, dayEvents, [], app.getSituationBoardScaleConfig());

      const report = {
        result:
          summary.annualCount === 1 &&
          summary.halfDayCount === 1 &&
          summary.timeOffLeaveCount === 1 &&
          summary.timeOffOutCount === 2 &&
          statusMap.size === 4 &&
          absentNames.includes(selected.annual.name) &&
          absentNames.includes(selected.halfday.name) &&
          absentNames.includes(selected.leave.name) &&
          absentNames.includes(selected.out.name) &&
          !absentNames.includes(selected.inactiveOut.name) &&
          seatMapHtml.includes("is-halfday") &&
          seatMapHtml.includes("is-timeoff-leave") &&
          seatMapHtml.includes("is-timeoff-out") &&
          seatMapHtml.includes("bg-cyan-50") &&
          seatMapHtml.includes("bg-violet-50"),
        today,
        currentHour,
        activeRange: formatHourRange(activeStartHour, activeEndHour),
        inactiveRange: formatHourRange(inactiveStartHour, inactiveEndHour),
        summary,
        absentNames,
        statusMapSize: statusMap.size,
        chipsPreview: chipsText.slice(0, 500),
        seatMapPreview: seatMapRoot.innerText.slice(0, 500)
      };

      appData.requests = originalRequests;
      appData.users = originalUsers;
      return report;
    });

    fs.writeFileSync(REPORT_PATH, JSON.stringify({
      executedAt: nowIso(),
      ...result
    }, null, 2), "utf8");
    console.log(JSON.stringify({
      executedAt: nowIso(),
      ...result
    }, null, 2));
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
