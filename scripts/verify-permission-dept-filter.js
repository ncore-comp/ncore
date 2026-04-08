"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const APP_URL = "https://ncore.web.app";
const API_URL = "https://ncore.web.app/api";
const REPORT_DIR = path.join(__dirname, "..", "reports");
const REPORT_PATH = path.join(REPORT_DIR, "verify-permission-dept-filter-last.json");

function nowIso() {
  return new Date().toISOString();
}

async function loginBoot(id, password) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "login_boot", id, password })
  });
  return res.json();
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
      app.renderMasterPermissionPage();

      const getRows = () => Array.from(document.querySelectorAll("#master-perm-table tbody tr")).map((tr) => ({
        name: tr.children[0] ? tr.children[0].innerText.trim() : "",
        dept: tr.children[1] ? tr.children[1].innerText.replace(/\s+/g, " ").trim() : ""
      }));

      const allRows = getRows();
      app.setPermissionDeptFilter("manual");
      const manualRows = getRows();
      app.setPermissionDeptFilter("parts");
      const partsRows = getRows();

      const hasAllButton = !!Array.from(document.querySelectorAll("button")).find((el) => el.innerText.trim() === "전부");
      const hasManualButton = !!Array.from(document.querySelectorAll("button")).find((el) => el.innerText.trim() === "매뉴얼팀");
      const hasPartsButton = !!Array.from(document.querySelectorAll("button")).find((el) => el.innerText.trim() === "파츠북팀");

      return {
        hasAllButton,
        hasManualButton,
        hasPartsButton,
        allCount: allRows.length,
        manualCount: manualRows.length,
        partsCount: partsRows.length,
        manualOnly: manualRows.every((row) => row.dept.includes("매뉴얼팀")),
        partsOnly: partsRows.every((row) => row.dept.includes("파츠북팀")),
        manualPreview: manualRows.slice(0, 5),
        partsPreview: partsRows.slice(0, 5)
      };
    });

    const report = {
      executedAt: nowIso(),
      result: result.hasAllButton && result.hasManualButton && result.hasPartsButton && result.manualCount > 0 && result.partsCount > 0 && result.manualOnly && result.partsOnly ? "passed" : "failed",
      results: [
        {
          name: "팀 필터 버튼 표시",
          passed: result.hasAllButton && result.hasManualButton && result.hasPartsButton
        },
        {
          name: "매뉴얼팀 필터",
          passed: result.manualCount > 0 && result.manualOnly,
          count: result.manualCount,
          preview: result.manualPreview
        },
        {
          name: "파츠북팀 필터",
          passed: result.partsCount > 0 && result.partsOnly,
          count: result.partsCount,
          preview: result.partsPreview
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
