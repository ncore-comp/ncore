"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const APP_URL = "https://ncore.web.app";
const API_URL = "https://ncore.web.app/api";
const REPORT_DIR = path.join(__dirname, "..", "reports");
const REPORT_PATH = path.join(REPORT_DIR, "verify-situation-board-halfday-timeoff-split-last.json");

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

    const panelTexts = await page.evaluate(() => {
      app.openSituationBoard();
      const detailRoot = document.getElementById("situation-board-detail-panel-root");
      const summaryText = detailRoot ? detailRoot.innerText : "";
      app.openSituationBoardSeatMap("2026-03-20");
      const seatMapContent = document.getElementById("situation-board-seat-map-content");
      const seatMapText = seatMapContent ? seatMapContent.innerText : "";
      return { summaryText, seatMapText };
    });

    const report = {
      result:
        panelTexts.summaryText.includes("반차") &&
        panelTexts.summaryText.includes("시간차") &&
        panelTexts.seatMapText.includes("시간차(퇴근)") &&
        /\d{1,2}:\d{2}~\d{1,2}:\d{2}/.test(panelTexts.seatMapText)
          ? "passed"
          : "failed",
      executedAt: nowIso(),
      results: [
        {
          name: "전체상황판 요약에서 반차/시간차 분리",
          passed: panelTexts.summaryText.includes("반차") && panelTexts.summaryText.includes("시간차"),
          summaryPreview: panelTexts.summaryText.slice(0, 300)
        },
        {
          name: "당일 부재 인원 카드에 상세시간 표시",
          passed: panelTexts.seatMapText.includes("시간차(퇴근)") && /\d{1,2}:\d{2}~\d{1,2}:\d{2}/.test(panelTexts.seatMapText),
          seatMapPreview: panelTexts.seatMapText.slice(0, 500)
        }
      ]
    };

    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
