"use strict";

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { findServiceAccountPath } = require("./import-firestore");

const API_BASE_URL = String(process.env.API_BASE_URL || "https://ncore.web.app/api").replace(/\/+$/, "");
const RUN_ID = `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const REPORT_DIR = path.join(__dirname, "..", "reports");
const REPORT_PATH = path.join(REPORT_DIR, "firestore-e2e-last.json");

admin.initializeApp({
  credential: admin.credential.cert(require(findServiceAccountPath()))
});

const db = admin.firestore();

const state = {
  tempUserId: `e2e_user_${RUN_ID}`,
  tempUserName: `E2E ${RUN_ID}`,
  tempUserPassword: "0",
  masterSessionToken: "",
  tempUserSessionToken: "",
  sessionIds: new Set(),
  requestIds: new Set(),
  boardPostIds: new Set(),
  userSpecialLeaveIds: new Set(),
  actor0LogDetails: new Set(),
  results: [],
  startedAt: new Date().toISOString()
};

function nowIso() {
  return new Date().toISOString();
}

function logResult(status, name, details) {
  state.results.push({
    status,
    name,
    details,
    at: nowIso()
  });
}

async function getJson(params = {}) {
  const url = new URL(API_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  const res = await fetch(url, { method: "GET" });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (error) {
    json = { parseError: error.message, raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

async function postJson(payload) {
  const res = await fetch(API_BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (error) {
    json = { parseError: error.message, raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

function rememberSessionToken(token) {
  const safeToken = String(token || "").trim();
  if (!safeToken) return "";
  const sessionId = safeToken.split(".")[0];
  if (sessionId) state.sessionIds.add(sessionId);
  return safeToken;
}

async function postAuthed(sessionToken, payload) {
  return postJson({
    ...payload,
    sessionToken: String(sessionToken || "").trim()
  });
}

async function loginAs(userId, password) {
  const response = await postJson({
    action: "login",
    id: userId,
    password
  });
  assert(response.json && response.json.result === "success", "login failed", { userId, response });
  return {
    user: response.json.user || null,
    sessionToken: rememberSessionToken(response.json.sessionToken)
  };
}

async function loginBootAs(userId, password) {
  const response = await postJson({
    action: "login_boot",
    id: userId,
    password
  });
  assert(response.json && response.json.result === "success", "login_boot failed", { userId, response });
  return {
    user: response.json.user || null,
    sessionToken: rememberSessionToken(response.json.sessionToken),
    data: response.json.data || {},
    meta: response.json.meta || {}
  };
}

function assert(condition, message, extra = {}) {
  if (!condition) {
    const error = new Error(message);
    error.extra = extra;
    throw error;
  }
}

async function runCheck(name, fn) {
  try {
    const details = await fn();
    logResult("passed", name, details);
  } catch (error) {
    logResult("failed", name, {
      message: error.message,
      extra: error.extra || null
    });
  }
}

async function runWarningCheck(name, fn) {
  try {
    const details = await fn();
    logResult("warning", name, details);
  } catch (error) {
    logResult("failed", name, {
      message: error.message,
      extra: error.extra || null
    });
  }
}

async function getDoc(collectionName, docId) {
  const snap = await db.collection(collectionName).doc(String(docId)).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function deleteByIds(collectionName, ids) {
  const batch = db.batch();
  let count = 0;
  for (const id of ids) {
    batch.delete(db.collection(collectionName).doc(String(id)));
    count += 1;
  }
  if (count) await batch.commit();
  return count;
}

async function deleteAccessLogsForTempUser() {
  const snap = await db.collection("accessLogs").where("userId", "==", state.tempUserId).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snap.size;
}

async function deleteAccessLogsByDetail() {
  let total = 0;
  for (const detail of state.actor0LogDetails) {
    const snap = await db.collection("accessLogs").where("detail", "==", detail).get();
    if (snap.empty) continue;
    const batch = db.batch();
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    total += snap.size;
  }
  return total;
}

async function createTempUser() {
  const payload = {
    action: "upsert_user",
    actor: { id: "0", name: "Web관리자" },
    data: {
      id: state.tempUserId,
      password: state.tempUserPassword,
      name: state.tempUserName,
      role: "employee",
      rank: "사원",
      dept: "매뉴얼팀",
      totalHours: 120,
      usedHours: 0,
      email: `${state.tempUserId}@example.com`,
      phone: "010-0000-0000",
      employeeNo: state.tempUserId,
      workQ1: "08:00 ~ 17:00",
      workQ2: "08:00 ~ 17:00",
      workQ3: "",
      workQ4: "",
      featureMemberCard: true,
      featureBoard: false,
      featureHomepage: false
    }
  };
  const response = await postAuthed(state.masterSessionToken, payload);
  assert(response.json && response.json.result === "success", "temp user create failed", response);
  state.actor0LogDetails.add(state.tempUserId);
}

async function cleanup() {
  const removed = {
    requests: await deleteByIds("requests", state.requestIds),
    boardPosts: await deleteByIds("boardPosts", state.boardPostIds),
    userSpecialLeaves: await deleteByIds("userSpecialLeaves", state.userSpecialLeaveIds),
    users: await deleteByIds("users", [state.tempUserId]),
    sessions: await deleteByIds("sessions", state.sessionIds),
    accessLogsByUser: await deleteAccessLogsForTempUser(),
    accessLogsByDetail: await deleteAccessLogsByDetail()
  };
  return removed;
}

async function main() {
  const masterLogin = await loginBootAs("0", "0");
  state.masterSessionToken = masterLogin.sessionToken;
  const types = ((masterLogin.data || {}).specialLeaveTypes || []).map((item) => item.typeKey).filter(Boolean);

  await runCheck("boot load", async () => {
    assert(masterLogin.sessionToken, "boot session token missing", masterLogin);
    assert(Array.isArray((masterLogin.data || {}).users) && masterLogin.data.users.length > 0, "boot load users missing", masterLogin);
    return {
      users: masterLogin.data.users.length,
      holidays: Object.keys(masterLogin.data.holidays || {}).length,
      specialLeaveTypes: (masterLogin.data.specialLeaveTypes || []).length
    };
  });

  await createTempUser();

  await runCheck("temp user exists in Firestore", async () => {
    const user = await getDoc("users", state.tempUserId);
    assert(user, "temp user not found");
    assert(user.password === "0", "temp user password mismatch", user);
    return { id: user.id, dept: user.dept };
  });

  await runCheck("temp user login", async () => {
    const login = await loginAs(state.tempUserId, state.tempUserPassword);
    state.tempUserSessionToken = login.sessionToken;
    assert(state.tempUserSessionToken, "temp user session token missing");
    return { userId: state.tempUserId };
  });

  await runCheck("write blocked without session token", async () => {
    const response = await postJson({
      action: "upsert_request",
      actor: { id: state.tempUserId, name: state.tempUserName },
      data: {
        id: `e2e_req_blocked_${RUN_ID}`,
        userId: state.tempUserId,
        userName: state.tempUserName,
        dept: "매뉴얼팀",
        role: "employee",
        type: "연차",
        startDate: "2099-01-02",
        endDate: "2099-01-02",
        hours: 8,
        timeRange: "",
        reason: `blocked-${RUN_ID}`,
        status: "pending",
        timestamp: "2099-01-01 09:00:00",
        specialLeaveTypeKey: "",
        specialLeaveTypeLabel: "",
        rejectReason: ""
      }
    });
    assert(response.json && response.json.result !== "success", "unauthenticated write unexpectedly succeeded", response);
    assert(String(response.json.message || "").includes("SESSION_"), "missing session error", response.json);
    return { message: response.json.message };
  });

  await runCheck("temp user update", async () => {
    const response = await postAuthed(state.masterSessionToken, {
      action: "upsert_user",
      actor: { id: "0", name: "Web관리자" },
      data: {
        id: state.tempUserId,
        name: `${state.tempUserName} Updated`,
        phone: "010-1234-5678",
        dept: "매뉴얼팀",
        role: "employee",
        rank: "사원"
      }
    });
    assert(response.json && response.json.result === "success", "temp user update failed", response);
    state.actor0LogDetails.add(state.tempUserId);
    const user = await getDoc("users", state.tempUserId);
    assert(user && user.name.endsWith("Updated"), "temp user name not updated", user);
    assert(user.phone === "010-1234-5678", "temp user phone not updated", user);
    return { id: state.tempUserId, phone: user.phone };
  });

  await runCheck("temp user password change", async () => {
    const response = await postAuthed(state.tempUserSessionToken, {
      action: "change_password",
      actor: { id: state.tempUserId, name: `${state.tempUserName} Updated` },
      newPassword: "9"
    });
    assert(response.json && response.json.result === "success", "password change failed", response);
    const user = await getDoc("users", state.tempUserId);
    assert(user && user.password === "9", "password change not reflected", user);
    state.tempUserPassword = "9";
    return { id: state.tempUserId, password: user.password };
  });

  await runCheck("temp user relogin with changed password", async () => {
    const login = await loginAs(state.tempUserId, state.tempUserPassword);
    state.tempUserSessionToken = login.sessionToken;
    assert(state.tempUserSessionToken, "relogin session token missing");
    return { userId: state.tempUserId };
  });

  await runCheck("single request create/update/delete", async () => {
    const requestId = `e2e_req_single_${RUN_ID}`;
    state.requestIds.add(requestId);
    const baseData = {
      id: requestId,
      userId: state.tempUserId,
      userName: `${state.tempUserName} Updated`,
      dept: "매뉴얼팀",
      role: "employee",
      type: "연차",
      startDate: "2099-01-05",
      endDate: "2099-01-05",
      hours: 8,
      timeRange: "",
      reason: `single-create-${RUN_ID}`,
      status: "pending",
      timestamp: "2099-01-01 09:00:00",
      specialLeaveTypeKey: "",
      specialLeaveTypeLabel: "",
      rejectReason: ""
    };
    let response = await postAuthed(state.tempUserSessionToken, {
      action: "upsert_request",
      actor: { id: state.tempUserId, name: `${state.tempUserName} Updated` },
      data: baseData
    });
    assert(response.json && response.json.result === "success", "request create failed", response);
    const created = await getDoc("requests", requestId);
    assert(created && created.reason === baseData.reason, "request not stored", created);

    response = await postAuthed(state.tempUserSessionToken, {
      action: "upsert_request",
      actor: { id: state.tempUserId, name: `${state.tempUserName} Updated` },
      expectedStatus: "pending",
      data: { ...baseData, status: "pending", reason: `single-update-${RUN_ID}` }
    });
    assert(response.json && response.json.result === "success", "request update failed", response);
    const updated = await getDoc("requests", requestId);
    assert(updated && updated.status === "pending", "request status not updated", updated);
    assert(updated && updated.reason === `single-update-${RUN_ID}`, "request reason not updated", updated);

    response = await postAuthed(state.tempUserSessionToken, {
      action: "delete_request",
      actor: { id: state.tempUserId, name: `${state.tempUserName} Updated` },
      id: requestId
    });
    assert(response.json && response.json.result === "success", "request delete failed", response);
    const deleted = await getDoc("requests", requestId);
    assert(!deleted, "request still exists after delete", deleted);
    return { requestId, finalState: "deleted" };
  });

  await runCheck("concurrent boot loads", async () => {
    const responses = await Promise.all(
      Array.from({ length: 20 }, () =>
        postAuthed(state.masterSessionToken, {
          action: "load_data",
          scope: "boot"
        })
      )
    );
    const failed = responses.filter((item) => !item.ok || !item.json || item.json.result !== "success");
    assert(failed.length === 0, "concurrent boot load failures", { failed: failed.length });
    return { total: responses.length };
  });

  await runCheck("concurrent access log writes", async () => {
    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        postAuthed(state.tempUserSessionToken, {
          action: "log_access",
          userId: state.tempUserId,
          userName: `${state.tempUserName} Updated`,
          logType: "E2E",
          detail: `${RUN_ID}_log_${index + 1}`
        })
      )
    );
    const failed = responses.filter((item) => !item.json || item.json.result !== "success");
    assert(failed.length === 0, "concurrent log writes failed", { failed: failed.length });
    const logs = await db.collection("accessLogs").where("userId", "==", state.tempUserId).where("type", "==", "E2E").get();
    assert(logs.size >= 20, "log writes missing", { found: logs.size });
    return { inserted: logs.size };
  });

  await runCheck("concurrent unique request writes", async () => {
    const requestIds = Array.from({ length: 12 }, (_, index) => `e2e_req_batch_${RUN_ID}_${index + 1}`);
    requestIds.forEach((id) => state.requestIds.add(id));
    const responses = await Promise.all(
      requestIds.map((requestId, index) =>
        postAuthed(state.tempUserSessionToken, {
          action: "upsert_request",
          actor: { id: state.tempUserId, name: `${state.tempUserName} Updated` },
          data: {
            id: requestId,
            userId: state.tempUserId,
            userName: `${state.tempUserName} Updated`,
            dept: "매뉴얼팀",
            role: "employee",
            type: "연차",
            startDate: `2099-02-${String(index + 1).padStart(2, "0")}`,
            endDate: `2099-02-${String(index + 1).padStart(2, "0")}`,
            hours: 8,
            timeRange: "",
            reason: `batch-${index + 1}`,
            status: "pending",
            timestamp: `2099-01-01 09:${String(index).padStart(2, "0")}:00`,
            specialLeaveTypeKey: "",
            specialLeaveTypeLabel: "",
            rejectReason: ""
          }
        })
      )
    );
    const failed = responses.filter((item) => !item.json || item.json.result !== "success");
    assert(failed.length === 0, "concurrent unique request writes failed", { failed: failed.length });
    const docs = await Promise.all(requestIds.map((id) => getDoc("requests", id)));
    assert(docs.every(Boolean), "some batch requests missing", {
      missingIds: requestIds.filter((id, index) => !docs[index])
    });
    return { inserted: requestIds.length };
  });

  await runCheck("concurrent duplicate request protection", async () => {
    const duplicateIds = Array.from({ length: 8 }, (_, index) => `e2e_req_dup_${RUN_ID}_${index + 1}`);
    duplicateIds.forEach((id) => state.requestIds.add(id));
    const responses = await Promise.all(
      duplicateIds.map((requestId) =>
        postAuthed(state.tempUserSessionToken, {
          action: "upsert_request",
          actor: { id: state.tempUserId, name: `${state.tempUserName} Updated` },
          data: {
            id: requestId,
            userId: state.tempUserId,
            userName: `${state.tempUserName} Updated`,
            dept: "매뉴얼팀",
            role: "employee",
            type: "연차",
            startDate: "2099-03-15",
            endDate: "2099-03-15",
            hours: 8,
            timeRange: "",
            reason: `duplicate-${RUN_ID}`,
            status: "pending",
            timestamp: "2099-01-01 10:00:00",
            specialLeaveTypeKey: "",
            specialLeaveTypeLabel: "",
            rejectReason: ""
          }
        })
      )
    );
    const successCount = responses.filter((item) => item.json && item.json.result === "success").length;
    const duplicateErrors = responses.filter((item) => item.json && item.json.message === "REQUEST_DUPLICATE_CONFLICT").length;
    assert(successCount === 1, "duplicate protection accepted more than one request", {
      successCount,
      duplicateErrors
    });
    assert(duplicateErrors === responses.length - 1, "duplicate conflict count mismatch", {
      successCount,
      duplicateErrors
    });
    return {
      attempted: responses.length,
      successCount,
      duplicateErrors
    };
  });

  await runCheck("board post create/delete", async () => {
    const postId = `e2e_board_${RUN_ID}`;
    state.boardPostIds.add(postId);
    let response = await postAuthed(state.tempUserSessionToken, {
      action: "upsert_board_post",
      actor: { id: state.tempUserId, name: `${state.tempUserName} Updated` },
      data: {
        id: postId,
        title: `E2E board ${RUN_ID}`,
        content: `Board content ${RUN_ID}`,
        category: "일반",
        authorId: state.tempUserId,
        authorName: `${state.tempUserName} Updated`,
        authorDept: "매뉴얼팀",
        isNotice: false,
        status: "active",
        viewCount: 0,
        createdAt: "2099-01-01 10:10:00",
        updatedAt: "2099-01-01 10:10:00"
      }
    });
    assert(response.json && response.json.result === "success", "board create failed", response);
    let post = await getDoc("boardPosts", postId);
    assert(post && post.status === "active", "board post missing after create", post);

    response = await postAuthed(state.tempUserSessionToken, {
      action: "delete_board_post",
      actor: { id: state.tempUserId, name: `${state.tempUserName} Updated` },
      id: postId
    });
    assert(response.json && response.json.result === "success", "board delete failed", response);
    post = await getDoc("boardPosts", postId);
    assert(post && post.status === "deleted", "board post not marked deleted", post);
    return { postId, finalStatus: post.status };
  });

  await runCheck("temp user special leave write", async () => {
    assert(types.length > 0, "no special leave types loaded");
    const typeKey = types[0];
    const response = await postAuthed(state.masterSessionToken, {
      action: "save_user_special_leaves",
      actor: { id: "0", name: "Web관리자" },
      userId: state.tempUserId,
      leaves: [
        {
          userId: state.tempUserId,
          typeKey,
          totalHours: 8,
          usedHours: 0,
          note: `e2e-${RUN_ID}`,
          updatedAt: "2099-01-01 10:20:00"
        }
      ]
    });
    assert(response.json && response.json.result === "success", "user special leave save failed", response);
    const docId = `${state.tempUserId}__${typeKey}`;
    state.userSpecialLeaveIds.add(docId);
    const leave = await getDoc("userSpecialLeaves", docId);
    assert(leave && leave.totalHours === 8, "user special leave not stored", leave);
    state.actor0LogDetails.add(state.tempUserId);
    return { docId, typeKey };
  });

  const fullLoad = await postAuthed(state.masterSessionToken, {
    action: "load_data",
    scope: "all"
  });
  await runCheck("full load after writes", async () => {
    assert(fullLoad.ok, "full load http failed", fullLoad);
    assert(fullLoad.json && fullLoad.json.result === "success", "full load result failed", fullLoad.json);
    assert(Array.isArray(fullLoad.json.data.requests), "requests missing from full load", fullLoad.json);
    assert(Array.isArray(fullLoad.json.data.boardPosts), "boardPosts missing from full load", fullLoad.json);
    return {
      requests: fullLoad.json.data.requests.length,
      boardPosts: fullLoad.json.data.boardPosts.length
    };
  });

  const removed = await cleanup();
  logResult("info", "cleanup", removed);

  const summary = {
    runId: RUN_ID,
    apiBaseUrl: API_BASE_URL,
    startedAt: state.startedAt,
    finishedAt: nowIso(),
    counts: {
      passed: state.results.filter((item) => item.status === "passed").length,
      failed: state.results.filter((item) => item.status === "failed").length,
      warning: state.results.filter((item) => item.status === "warning").length,
      info: state.results.filter((item) => item.status === "info").length
    },
    results: state.results
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));

  if (summary.counts.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  try {
    const removed = await cleanup();
    logResult("info", "cleanup_after_error", removed);
  } catch (cleanupError) {
    logResult("failed", "cleanup_after_error", { message: cleanupError.message });
  }

  const summary = {
    runId: RUN_ID,
    apiBaseUrl: API_BASE_URL,
    startedAt: state.startedAt,
    finishedAt: nowIso(),
    counts: {
      passed: state.results.filter((item) => item.status === "passed").length,
      failed: state.results.filter((item) => item.status === "failed").length + 1,
      warning: state.results.filter((item) => item.status === "warning").length,
      info: state.results.filter((item) => item.status === "info").length
    },
    fatal: {
      message: error.message,
      extra: error.extra || null
    },
    results: state.results
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2));
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
});
