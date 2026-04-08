"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const admin = require("firebase-admin");
const { findServiceAccountPath } = require("./import-firestore");

const ROOT = path.join(__dirname, "..");
const APP_URL = "https://ncore.web.app";
const API_URL = "https://ncore.web.app/api";
const REPORT_DIR = path.join(ROOT, "reports");
const REPORT_PATH = path.join(REPORT_DIR, "real-simulation-test-last.json");

const MASTER = { id: "0", password: "0", name: "Web\uAD00\uB9AC\uC790" };
const TEAM_LEADER = { id: "\uC774\uB3D9\uC9C4", password: "0", name: "\uC774\uB3D9\uC9C4" };
const CEO = { id: "\uC774\uC218\uD615", password: "0", name: "\uC774\uC218\uD615" };

const RUN_ID = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const state = {
  tempUsers: [],
  tempRequests: [],
  tempBoards: [],
  tempUserSpecialLeaves: [],
  tokens: {},
  results: [],
  startedAt: new Date().toISOString()
};

function nowIso() {
  return new Date().toISOString();
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function datePlus(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

function push(status, phase, name, details = {}) {
  state.results.push({ status, phase, name, details, at: nowIso() });
}

function assert(condition, message, extra = {}) {
  if (!condition) {
    const error = new Error(message);
    error.extra = extra;
    throw error;
  }
}

async function apiPost(payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (error) {
    json = { result: "error", message: text, status: res.status };
  }
  return { ok: res.ok, status: res.status, json };
}

async function loginBoot(id, password) {
  const response = await apiPost({ action: "login_boot", id, password });
  assert(response.json && response.json.result === "success", "login_boot failed", { id, response });
  return response.json;
}

function rememberToken(key, token) {
  const safe = String(token || "").trim();
  state.tokens[key] = safe;
  return safe;
}

async function postAuthed(token, payload) {
  return apiPost({ ...payload, sessionToken: token });
}

function initAdmin() {
  if (admin.apps.length) return admin.firestore();
  admin.initializeApp({
    credential: admin.credential.cert(require(findServiceAccountPath()))
  });
  return admin.firestore();
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
  await page.goto(APP_URL, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.locator("#login-id").fill(id);
  await page.locator("#login-pw").fill(password);
  await page.locator("button[onclick=\"app.tryLogin()\"]").click();
  await page.waitForSelector("button[onclick=\"app.logout()\"]", { timeout: 60000 });
}

async function stubOutlookDraft(page) {
  await page.evaluate(() => {
    window.__lastMailto = "";
    window.openOutlookDraft = function (to, subject, body, cc = "") {
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
}

function tempUser(seed, dept = "\uB9E4\uB274\uC5BC\uD300") {
  return {
    id: `${seed}_${RUN_ID}`,
    password: "0",
    name: `${seed}_${RUN_ID}`,
    role: "employee",
    rank: "\uC0AC\uC6D0",
    dept,
    totalHours: 120,
    usedHours: 0,
    email: `${seed}_${RUN_ID}@example.com`,
    phone: "010-0000-0000",
    employeeNo: `${seed}_${RUN_ID}`,
    workQ1: "08:00 ~ 17:00",
    workQ2: "08:00 ~ 17:00",
    workQ3: "08:00 ~ 17:00",
    workQ4: "08:00 ~ 17:00",
    featureMemberCard: true,
    featureBoard: true,
    featureHomepage: false
  };
}

async function createTempUser(masterToken, userData) {
  const response = await postAuthed(masterToken, {
    action: "upsert_user",
    actor: { id: MASTER.id, name: MASTER.name },
    data: userData
  });
  assert(response.json && response.json.result === "success", "temp user create failed", { userData, response });
  state.tempUsers.push(userData.id);
}

async function deleteTempUser(masterToken, userId) {
  try {
    await postAuthed(masterToken, {
      action: "upsert_user",
      actor: { id: MASTER.id, name: MASTER.name },
      data: { id: userId, status: "deleted" }
    });
  } catch {}
}

async function cleanup(db) {
  const batch = db.batch();
  for (const id of state.tempRequests) batch.delete(db.collection("requests").doc(id));
  for (const id of state.tempBoards) batch.delete(db.collection("boardPosts").doc(id));
  for (const id of state.tempUserSpecialLeaves) batch.delete(db.collection("userSpecialLeaves").doc(id));
  for (const id of state.tempUsers) batch.delete(db.collection("users").doc(id));
  await batch.commit().catch(() => {});

  const sweepTargets = [
    { name: "users", fields: ["id", "name", "employeeNo", "email"] },
    { name: "requests", fields: ["id", "userId", "userName", "reason"] },
    { name: "boardPosts", fields: ["id", "title", "authorId", "authorName"] },
    { name: "userSpecialLeaves", fields: ["userId", "typeKey", "note"] }
  ];

  for (const target of sweepTargets) {
    const snap = await db.collection(target.name).get().catch(() => null);
    if (!snap) continue;
    const sweepBatch = db.batch();
    let hit = 0;
    snap.forEach((doc) => {
      const data = doc.data() || {};
      const values = [doc.id, ...target.fields.map((field) => data[field])].map((value) => String(value || ""));
      if (values.some((value) => value.includes(RUN_ID))) {
        sweepBatch.delete(doc.ref);
        hit += 1;
      }
    });
    if (hit > 0) {
      await sweepBatch.commit().catch(() => {});
    }
  }
}

async function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const db = initAdmin();
  const browser = await chromium.launch({ headless: true });

  const empA = tempUser("SIM_EMP_A");
  const empB = tempUser("SIM_EMP_B");
  const manageUiUser = tempUser("SIM_UI_USER");
  manageUiUser.password = "1111";
  const annualDate = datePlus(7);
  const specialDate = datePlus(8);
  const situationDate = annualDate;
  const halfDayDate = datePlus(9);
  const timeOffDate = datePlus(10);
  const concurrentDateA = datePlus(11);
  const concurrentDateB = datePlus(12);
  const duplicateDate = datePlus(13);
  const conflictDate = datePlus(14);

  try {
    // Phase 1
    await withPage(browser, async (page, dialogs, consoleErrors) => {
      await page.goto(APP_URL, { waitUntil: "load", timeout: 60000 });
      await page.waitForTimeout(1200);
      const loginVisible = await page.locator("#login-id").isVisible().catch(() => false);
      push(loginVisible && consoleErrors.length === 0 ? "passed" : "failed", "Phase 1", "????????????숇??????", {
        loginVisible,
        dialogs,
        consoleErrors
      });
    });

    const masterBoot = await loginBoot(MASTER.id, MASTER.password);
    const masterToken = rememberToken("master", masterBoot.sessionToken);
    const teamLeadBoot = await loginBoot(TEAM_LEADER.id, TEAM_LEADER.password);
    const teamLeadToken = rememberToken("teamLeader", teamLeadBoot.sessionToken);
    const ceoBoot = await loginBoot(CEO.id, CEO.password);
    const ceoToken = rememberToken("ceo", ceoBoot.sessionToken);

    await createTempUser(masterToken, empA);
    await createTempUser(masterToken, empB);
    state.tempUsers.push(manageUiUser.id);

    // Phase 5 master UI user management
    await withPage(browser, async (page, dialogs) => {
      await loginUi(page, MASTER.id, MASTER.password);
      await page.evaluate(() => app.renderUserManagement());
      await page.waitForTimeout(1200);


      await page.locator("#new-name").fill(manageUiUser.name);
      await page.locator("#new-dept").selectOption({ index: 0 });
      await page.locator("#new-id").fill(manageUiUser.id);
      await page.locator("#new-pw").fill(manageUiUser.password);
      await page.locator("#new-emp-no").fill(manageUiUser.employeeNo);
      await page.locator("#new-role").selectOption("employee");
      await page.locator("#new-rank").selectOption({ index: 0 });
      await page.locator("#new-days").fill("15");
      await page.locator("#new-email").fill(manageUiUser.email);
      await page.locator("#new-work-q1").selectOption({ label: "08:00 ~ 17:00" });
      await page.locator("#new-work-q2").selectOption({ label: "08:00 ~ 17:00" });
      await page.locator("#new-work-q3").selectOption({ label: "08:00 ~ 17:00" });
      await page.locator("#new-work-q4").selectOption({ label: "08:00 ~ 17:00" });
      await page.evaluate(() => app.addUser());
      await page.waitForTimeout(1800);

      const registerDialog = dialogs.some((d) => d.type === "confirm");
      const createdSnap = await db.collection("users").doc(manageUiUser.id).get();
      const rowVisible = createdSnap.exists;

      // update (API ?????筌띯뫔??????????????????轅붽틓????????????????????????롮쾸???????????????됰Ŧ????????????
      const updateRes = await postAuthed(masterToken, {
        action: "upsert_user",
        actor: { id: MASTER.id, name: MASTER.name },
        data: { ...manageUiUser, name: `${manageUiUser.name}_MOD` }
      });
      assert(updateRes.json && updateRes.json.result === "success", "master update failed", updateRes);
      await page.evaluate(() => app.renderUserManagement());
      await page.waitForTimeout(1200);
      const updatedSnap = await db.collection("users").doc(manageUiUser.id).get();
      const updatedVisible = updatedSnap.exists && String(updatedSnap.data()?.name || "") === `${manageUiUser.name}_MOD`;

      // delete
      await page.evaluate((userId) => app.deleteUser(userId), manageUiUser.id);
      await page.waitForTimeout(1200);
      const deleteConfirmCount = dialogs.length;
      const deletedSnap = await db.collection("users").doc(manageUiUser.id).get();
      const deletedVisible = deletedSnap.exists;

      push(registerDialog && rowVisible && updatedVisible && deleteConfirmCount >= 2 && !deletedVisible ? "passed" : "failed", "Phase 5", "Master user registration/update/delete", {
        registerDialog,
        rowVisible,
        updatedVisible,
        deleteConfirmCount,
        deletedVisible,
        dialogs,
        updateResult: updateRes.json
      });
    });

    // Phase 2 employee A annual request via UI
    await withPage(browser, async (page, dialogs) => {
      await loginUi(page, empA.id, empA.password);
      await stubOutlookDraft(page);
      await page.evaluate(() => app.openRequestModal());
      await page.waitForTimeout(500);
      await page.locator("#req-type").selectOption({ index: 0 });
      await page.locator("#req-start-date").fill(annualDate);
      const annualEndVisible = await page.locator("#req-end-date").isVisible().catch(() => false);
      if (annualEndVisible) {
        await page.locator("#req-end-date").fill(annualDate);
      }
      await page.locator("#req-reason").selectOption({ label: "Refresh" });
      await page.locator("#req-modal-btn").click();
      await page.waitForTimeout(2200);

      const reqDoc = await db.collection("requests")
        .where("userId", "==", empA.id)
        .where("startDate", "==", annualDate)
        .get();
      const req = reqDoc.docs.length
        ? reqDoc.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")))[0]
        : null;
      if (req) state.tempRequests.push(req.id);
      const mailto = await page.evaluate(() => String(window.__lastMailto || ""));
      push(req ? "passed" : "failed", "Phase 2", "Employee A annual request", {
        requestId: req ? req.id : "",
        mailto,
        dialogs
      });
    });

    // Half-day / timeoff via frontend db wrapper
    const empABoot = await loginBoot(empA.id, empA.password);
    const empAToken = rememberToken("empA", empABoot.sessionToken);
    const halfReqId = `SIM_HALF_${RUN_ID}`;
    state.tempRequests.push(halfReqId);
    const halfRes = await postAuthed(empAToken, {
      action: "upsert_request",
      data: {
        id: halfReqId,
        userId: empA.id,
        userName: empA.name,
        dept: empA.dept,
        role: empA.role,
        type: "??????熬곣뫖利당춯??쎾퐲?????????????????????????????????롮쾸?????",
        startDate: halfDayDate,
        endDate: halfDayDate,
        hours: 4,
        timeRange: "",
        reason: "SIM_HALF",
        status: "pending",
        timestamp: nowIso().slice(0, 19).replace("T", " "),
        specialLeaveTypeKey: "",
        specialLeaveTypeLabel: "",
        rejectReason: ""
      }
    });
    const timeReqId = `SIM_TIMEOUT_${RUN_ID}`;
    state.tempRequests.push(timeReqId);
    const timeRes = await postAuthed(empAToken, {
      action: "upsert_request",
      data: {
        id: timeReqId,
        userId: empA.id,
        userName: empA.name,
        dept: empA.dept,
        role: empA.role,
        type: "??????????꿔꺂????븍；留??????????",
        startDate: timeOffDate,
        endDate: timeOffDate,
        hours: 2,
        timeRange: "16:00~18:00",
        reason: "SIM_TIMEOUT",
        status: "pending",
        timestamp: nowIso().slice(0, 19).replace("T", " "),
        specialLeaveTypeKey: "",
        specialLeaveTypeLabel: "",
        rejectReason: ""
      }
    });
    push(halfRes.json?.result === "success" && timeRes.json?.result === "success" ? "passed" : "failed", "Phase 2", "Employee A half-day/time-off request", {
      half: halfRes.json,
      time: timeRes.json
    });

    // Special leave grant and employee B UI request
    const grantTypeKey = "celebration_5";
    const grantDocId = `${empB.id}__${grantTypeKey}`;
    state.tempUserSpecialLeaves.push(grantDocId);
    const grantRes = await postAuthed(masterToken, {
      action: "save_user_special_leaves",
      userId: empB.id,
      leaves: [
        {
          userId: empB.id,
          typeKey: grantTypeKey,
          totalHours: 40,
          usedHours: 0,
          note: "SIM_SPECIAL"
        }
      ]
    });
    assert(grantRes.json && grantRes.json.result === "success", "special leave grant failed", grantRes);

    await withPage(browser, async (page, dialogs) => {
      await loginUi(page, empB.id, empB.password);
      await stubOutlookDraft(page);
      await page.evaluate(() => app.openRequestModal());
      await page.waitForTimeout(600);
      const options = await page.locator("#req-type option").evaluateAll((nodes) =>
        nodes.map((n) => ({ label: String(n.textContent || "").trim(), value: String(n.value || "") }))
      );
      const specialOption = options.find((o) => String(o.value || "").startsWith("special:"));
      let req = null;
      if (specialOption) {
        await page.locator("#req-type").selectOption(specialOption.value);
        await page.locator("#req-start-date").fill(specialDate);
        const specialEndVisible = await page.locator("#req-end-date").isVisible().catch(() => false);
        if (specialEndVisible) {
          await page.locator("#req-end-date").fill(specialDate);
        }
        await page.locator("#req-reason").selectOption({ label: "Refresh" });
        await page.locator("#req-modal-btn").click();
        await page.waitForTimeout(2200);
        const reqDoc = await db.collection("requests")
          .where("userId", "==", empB.id)
          .where("specialLeaveTypeKey", "==", grantTypeKey)
          .get();
        req = reqDoc.docs.length
          ? reqDoc.docs
              .map((doc) => ({ id: doc.id, ...doc.data() }))
              .sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")))[0]
          : null;
        if (req) state.tempRequests.push(req.id);
      }
      push(specialOption && req ? "passed" : "failed", "Phase 2", "Employee B special leave request", {
        specialOption,
        requestId: req ? req.id : "",
        dialogs
      });
    });

    // Board by employee A via API
    const boardId = `SIM_BOARD_${RUN_ID}`;
    state.tempBoards.push(boardId);
    const boardCreate = await postAuthed(empAToken, {
      action: "upsert_board_post",
      data: {
        id: boardId,
        title: `SIM_BOARD_${RUN_ID}`,
        content: "simulation board content",
        category: "\uC77C\uBC18",
        authorId: empA.id,
        authorName: empA.name,
        authorDept: empA.dept,
        isNotice: false,
        status: "active",
        viewCount: 0,
        createdAt: nowIso().slice(0, 19).replace("T", " "),
        updatedAt: nowIso().slice(0, 19).replace("T", " ")
      }
    });
    const boardUpdate = await postAuthed(empAToken, {
      action: "upsert_board_post",
      data: {
        id: boardId,
        title: `SIM_BOARD_${RUN_ID}_EDIT`,
        content: "simulation board content edited",
        category: "\uC77C\uBC18",
        authorId: empA.id,
        authorName: empA.name,
        authorDept: empA.dept,
        isNotice: true,
        status: "active",
        viewCount: 0,
        createdAt: nowIso().slice(0, 19).replace("T", " "),
        updatedAt: nowIso().slice(0, 19).replace("T", " ")
      }
    });
    push(boardCreate.json?.result === "success" && boardUpdate.json?.result === "success" ? "passed" : "failed", "Phase 2", "Employee A board create/update", {
      create: boardCreate.json,
      update: boardUpdate.json
    });

    // Team leader approve/reject/cancel
    const empAAnnual = state.tempRequests.find((id) => id && id !== halfReqId && id !== timeReqId);
    const empBSpecial = state.tempRequests.find((id) => id && id !== empAAnnual && id !== halfReqId && id !== timeReqId);
    const approveRes = await postAuthed(teamLeadToken, {
      action: "upsert_request",
      expectedStatus: "pending",
      data: { ...(await db.collection("requests").doc(empAAnnual).get()).data(), id: empAAnnual, status: "approved" }
    });
    const rejectRes = await postAuthed(teamLeadToken, {
      action: "upsert_request",
      expectedStatus: "pending",
      data: { ...(await db.collection("requests").doc(empBSpecial).get()).data(), id: empBSpecial, status: "rejected", rejectReason: "SIM_REJECT_REASON" }
    });
    push(approveRes.json?.result === "success" && rejectRes.json?.result === "success" ? "passed" : "failed", "Phase 3", "Team leader approve/reject", {
      approve: approveRes.json,
      reject: rejectRes.json
    });

    // cancel flow using employee A then master/leader approve cancel
    const cancelReqId = empAAnnual;
    const cancelRequest = await db.collection("requests").doc(cancelReqId).get();
    const cancelReqRes = await postAuthed(empAToken, {
      action: "upsert_request",
      expectedStatus: "approved",
      data: { ...cancelRequest.data(), id: cancelReqId, status: "cancel_requested" }
    });
    const cancelApproveRes = await postAuthed(teamLeadToken, {
      action: "upsert_request",
      expectedStatus: "cancel_requested",
      data: { ...(await db.collection("requests").doc(cancelReqId).get()).data(), id: cancelReqId, status: "cancelled" }
    });
    push(cancelReqRes.json?.result === "success" && cancelApproveRes.json?.result === "success" ? "passed" : "failed", "Phase 3", "Team leader cancel approval", {
      cancelRequested: cancelReqRes.json,
      cancelApproved: cancelApproveRes.json
    });

    // Employee B sees reject reason in data
    await withPage(browser, async (page) => {
      await loginUi(page, empB.id, empB.password);
      const rejected = await page.evaluate((reqId) => {
        const req = (Array.isArray(appData.requests) ? appData.requests : []).find((r) => String(r.id) === String(reqId));
        return req ? { status: req.status, rejectReason: req.rejectReason || "" } : null;
      }, empBSpecial);
      push(rejected && rejected.status === "rejected" && rejected.rejectReason === "SIM_REJECT_REASON" ? "passed" : "failed", "Phase 3", "Employee B reject reason reflected", rejected || {});
    });

    // CEO whole situation board
    await withPage(browser, async (page, dialogs, consoleErrors) => {
      await loginUi(page, CEO.id, CEO.password);
      await page.evaluate(() => app.openSituationBoard());
      await page.waitForTimeout(1800);
      await page.evaluate(() => app.setSituationBoardDeptFilter("all"));
      await page.waitForTimeout(400);



      const targetCell = page.locator(".situation-board-cell").filter({
        has: page.locator(".member-absence-badge, .rounded-full, .bg-blue-50, .bg-yellow-50, .bg-red-50, .bg-emerald-50")
      }).first();
      const cellVisible = await targetCell.isVisible().catch(() => false);
      if (cellVisible) {
        await targetCell.click();
        await page.waitForTimeout(1200);
      }
      const modalVisible = await page.locator("#situation-board-seat-map-modal").isVisible().catch(() => false);
      const panelVisible = await page.locator("#situation-board-seat-map-content .situation-board-mini-scroll").isVisible().catch(() => false);
      const panelHasItems = (await page.locator("#situation-board-seat-map-content .situation-board-mini-scroll > .rounded-xl.border.border-gray-100.bg-white").count().catch(() => 0)) > 0;
      const closeVisible = await page.locator("#situation-board-seat-map-modal button").first().isVisible().catch(() => false);
      push(cellVisible && modalVisible && closeVisible && panelVisible && panelHasItems && consoleErrors.length === 0 ? "passed" : "failed", "Phase 4", "CEO situation board / seat map", {
        cellVisible,
        modalVisible,
        panelVisible,
        panelHasItems,
        closeVisible,
        dialogs,
        consoleErrors
      });
    });

    // Master mail routes save (save current routes unchanged)
    const currentMailRoutes = masterBoot.data.mailRoutes || [];
    const mailSave = await postAuthed(masterToken, {
      action: "save_mail_routes",
      routes: currentMailRoutes
    });
    push(mailSave.json?.result === "success" ? "passed" : "failed", "Phase 5", "Master mail route save", {
      result: mailSave.json
    });

    // Concurrency tests
    const concurrentLogins = await Promise.all([
      loginBoot(empA.id, empA.password),
      loginBoot(empB.id, empB.password),
      loginBoot(TEAM_LEADER.id, TEAM_LEADER.password),
      loginBoot(CEO.id, CEO.password),
      loginBoot(MASTER.id, MASTER.password)
    ]);
    push(concurrentLogins.every((r) => r.result === "success") ? "passed" : "failed", "Phase 6", "Concurrent logins", {
      success: concurrentLogins.filter((r) => r.result === "success").length
    });

    // concurrent different-date requests
    const reqA2 = `SIM_CONC_A_${RUN_ID}`;
    const reqB2 = `SIM_CONC_B_${RUN_ID}`;
    state.tempRequests.push(reqA2, reqB2);
    const [diffA, diffB] = await Promise.all([
      postAuthed(empAToken, {
        action: "upsert_request",
        data: {
          id: reqA2, userId: empA.id, userName: empA.name, dept: empA.dept, role: empA.role,
          type: "\uC5F0\uCC28", startDate: concurrentDateA, endDate: concurrentDateA, hours: 8, timeRange: "",
          reason: "SIM_CONC_A", status: "pending", timestamp: nowIso().slice(0, 19).replace("T", " "), specialLeaveTypeKey: "", specialLeaveTypeLabel: "", rejectReason: ""
        }
      }),
      postAuthed(rememberToken("empB", (await loginBoot(empB.id, empB.password)).sessionToken), {
        action: "upsert_request",
        data: {
          id: reqB2, userId: empB.id, userName: empB.name, dept: empB.dept, role: empB.role,
          type: "\uC5F0\uCC28", startDate: concurrentDateB, endDate: concurrentDateB, hours: 8, timeRange: "",
          reason: "SIM_CONC_B", status: "pending", timestamp: nowIso().slice(0, 19).replace("T", " "), specialLeaveTypeKey: "", specialLeaveTypeLabel: "", rejectReason: ""
        }
      })
    ]);
    push(diffA.json?.result === "success" && diffB.json?.result === "success" ? "passed" : "failed", "Phase 6", "Concurrent different-date requests", {
      diffA: diffA.json,
      diffB: diffB.json
    });

    // duplicate same-date request
    const dupA1 = `SIM_DUP1_${RUN_ID}`;
    const dupA2 = `SIM_DUP2_${RUN_ID}`;
    state.tempRequests.push(dupA1, dupA2);
    const [dup1, dup2] = await Promise.all([
      postAuthed(empAToken, {
        action: "upsert_request",
        data: { id: dupA1, userId: empA.id, userName: empA.name, dept: empA.dept, role: empA.role, type: "\uC5F0\uCC28", startDate: duplicateDate, endDate: duplicateDate, hours: 8, timeRange: "", reason: "SIM_DUP", status: "pending", timestamp: nowIso().slice(0, 19).replace("T", " "), specialLeaveTypeKey: "", specialLeaveTypeLabel: "", rejectReason: "" }
      }),
      postAuthed(empAToken, {
        action: "upsert_request",
        data: { id: dupA2, userId: empA.id, userName: empA.name, dept: empA.dept, role: empA.role, type: "\uC5F0\uCC28", startDate: duplicateDate, endDate: duplicateDate, hours: 8, timeRange: "", reason: "SIM_DUP", status: "pending", timestamp: nowIso().slice(0, 19).replace("T", " "), specialLeaveTypeKey: "", specialLeaveTypeLabel: "", rejectReason: "" }
      })
    ]);
    const dupSuccess = [dup1, dup2].filter((r) => r.json?.result === "success").length;
    push(dupSuccess === 1 ? "passed" : "failed", "Phase 6", "Concurrent duplicate-date request blocked", {
      dup1: dup1.json, dup2: dup2.json, dupSuccess
    });

    // concurrent approval vs reject
    const conflictReqId = `SIM_CONFLICT_${RUN_ID}`;
    state.tempRequests.push(conflictReqId);
    await postAuthed(empAToken, {
      action: "upsert_request",
      data: { id: conflictReqId, userId: empA.id, userName: empA.name, dept: empA.dept, role: empA.role, type: "\uC5F0\uCC28", startDate: conflictDate, endDate: conflictDate, hours: 8, timeRange: "", reason: "SIM_CONFLICT", status: "pending", timestamp: nowIso().slice(0, 19).replace("T", " "), specialLeaveTypeKey: "", specialLeaveTypeLabel: "", rejectReason: "" }
    });
    const conflictBase = (await db.collection("requests").doc(conflictReqId).get()).data();
    const [approveConflict, rejectConflict] = await Promise.all([
      postAuthed(teamLeadToken, { action: "upsert_request", expectedStatus: "pending", data: { ...conflictBase, id: conflictReqId, status: "approved" } }),
      postAuthed(masterToken, { action: "upsert_request", expectedStatus: "pending", data: { ...conflictBase, id: conflictReqId, status: "rejected", rejectReason: "SIM_CONFLICT_RJ" } })
    ]);
    const conflictMessages = [approveConflict.json?.message, rejectConflict.json?.message];
    push(conflictMessages.includes("REQUEST_STATE_CONFLICT") ? "passed" : "failed", "Phase 6", "Concurrent approve/reject conflict", {
      approve: approveConflict.json, reject: rejectConflict.json
    });

    // concurrent user registration
    const sameUserId = `SIM_SAME_${RUN_ID}`;
    const diffUser1 = tempUser("SIM_DIFF_U1");
    const diffUser2 = tempUser("SIM_DIFF_U2");
    state.tempUsers.push(diffUser1.id, diffUser2.id, sameUserId);
    const [userDiff1, userDiff2] = await Promise.all([
      postAuthed(masterToken, { action: "upsert_user", actor: { id: MASTER.id, name: MASTER.name }, data: diffUser1 }),
      postAuthed(masterToken, { action: "upsert_user", actor: { id: MASTER.id, name: MASTER.name }, data: diffUser2 })
    ]);
    const [same1, same2] = await Promise.all([
      postAuthed(masterToken, { action: "upsert_user", actor: { id: MASTER.id, name: MASTER.name }, data: { ...tempUser("SIM_SAME"), id: sameUserId, name: `${sameUserId}_A` } }),
      postAuthed(masterToken, { action: "upsert_user", actor: { id: MASTER.id, name: MASTER.name }, data: { ...tempUser("SIM_SAME"), id: sameUserId, name: `${sameUserId}_B` } })
    ]);
    const sameSnap = await db.collection("users").doc(sameUserId).get();
    push(userDiff1.json?.result === "success" && userDiff2.json?.result === "success" && sameSnap.exists ? "passed" : "failed", "Phase 6", "Concurrent user registration", {
      diff1: userDiff1.json, diff2: userDiff2.json, same1: same1.json, same2: same2.json, finalSameName: sameSnap.data()?.name || ""
    });

    // Firestore/log verification
    const accessLogSnap = await db.collection("accessLogs").where("userId", "in", [empA.id, empB.id]).get();
    const hasLogs = accessLogSnap.size > 0;
    const requestCount = (await db.collection("requests").where("userId", "in", [empA.id, empB.id]).get()).size;
    push(hasLogs && requestCount > 0 ? "passed" : "failed", "Phase 6", "Firestore and accessLogs verification", {
      accessLogCount: accessLogSnap.size,
      requestCount
    });

    const report = {
      runId: RUN_ID,
      startedAt: state.startedAt,
      finishedAt: nowIso(),
      counts: {
        passed: state.results.filter((r) => r.status === "passed").length,
        failed: state.results.filter((r) => r.status === "failed").length
      },
      results: state.results
    };
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    fs.writeFileSync(path.join(REPORT_DIR, "real-simulation-test-last.json"), JSON.stringify(report, null, 2), "utf8");
    console.log(JSON.stringify(report, null, 2));
    if (report.counts.failed > 0) process.exitCode = 1;
  } catch (error) {
    const report = {
      runId: RUN_ID,
      startedAt: state.startedAt,
      finishedAt: nowIso(),
      fatal: { message: error.message, extra: error.extra || null },
      results: state.results
    };
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    fs.writeFileSync(path.join(REPORT_DIR, "real-simulation-test-last.json"), JSON.stringify(report, null, 2), "utf8");
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } finally {
    await cleanup(db);
    await browser.close();
  }
}

main();
