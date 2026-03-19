"use strict";

const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();

const store = admin.firestore();
const SESSION_COLLECTION = "sessions";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

function nowKst() {
  const f = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  return f.format(new Date());
}

function sendJson(res, payload, statusCode = 200) {
  res.status(statusCode);
  res.set("Content-Type", "application/json; charset=utf-8");
  res.send(JSON.stringify(payload));
}

function text(v) {
  return String(v ?? "").trim();
}

function cleanPhone(v) {
  return String(v || "").replace(/[^\d\-+\s]/g, "").trim();
}

function toBool(v, fallback = false) {
  if (v === true || v === false) return v;
  if (v === 1 || v === "1") return true;
  if (v === 0 || v === "0") return false;
  const t = text(v).toLowerCase();
  if (["true", "yes", "y", "on"].includes(t)) return true;
  if (["false", "no", "n", "off"].includes(t)) return false;
  return fallback;
}

function cleanLogType(v) {
  const t = text(v);
  return t ? t.replace(/[^\w\-:]/g, "_").slice(0, 40) : "Action";
}

function normalizeRole(v) {
  const t = text(v).toLowerCase();
  if (t === "master" || t === "마스터") return "master";
  if (t === "ceo" || t === "대표") return "ceo";
  if (["manager", "teamleader", "team_leader", "팀리더", "팀장"].includes(t)) return "team_leader";
  if (["partleader", "part_leader", "파트리더", "파트장"].includes(t)) return "part_leader";
  return "employee";
}

function normalizeScope(v, fallback = "none") {
  const t = text(v).toLowerCase();
  return ["none", "manual", "parts", "all"].includes(t) ? t : fallback;
}

function normalizeWorkShift(v) {
  const raw = text(v);
  if (!raw) return "";
  const compact = raw.replace(/\s+/g, "");
  if (compact === "07:00~16:00" || compact === "07:00-16:00") return "07:00 ~ 16:00";
  if (compact === "08:00~17:00" || compact === "08:00-17:00") return "08:00 ~ 17:00";
  if (compact === "09:00~18:00" || compact === "09:00-18:00") return "09:00 ~ 18:00";
  return "";
}

function normalizeRequestDateKey(v) {
  const t = text(v);
  if (!t) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const parsed = new Date(t);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function normalizeSpecialLeaveTypeKey(v) {
  return text(v).toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 40);
}

function normalizeSpecialLeaveColor(v) {
  const t = text(v).toLowerCase();
  return ["rose", "sky", "emerald", "amber", "violet", "indigo", "slate"].includes(t) ? t : "slate";
}

function normalizeSpecialLeaveRequestMode(v) {
  return text(v).toLowerCase() === "day_only" ? "day_only" : "same_as_annual";
}

function normalizeSpecialLeaveDayCountMode(v) {
  return text(v).toLowerCase() === "calendar_days" ? "calendar_days" : "business_days";
}

function getLegacyDefaultPermissions(role, dept) {
  const safeRole = normalizeRole(role);
  const base = {
    calendarSelf: true,
    calendarManual: false,
    calendarParts: false,
    calendarAll: false,
    approveScope: "none",
    memberStatusScope: "none",
    canAccessMasterSettings: false,
    canManageUsers: false
  };
  if (safeRole === "master") {
    return {
      calendarSelf: true,
      calendarManual: true,
      calendarParts: true,
      calendarAll: true,
      approveScope: "all",
      memberStatusScope: "all",
      canAccessMasterSettings: true,
      canManageUsers: true
    };
  }
  if (safeRole === "ceo") {
    return { ...base, calendarManual: true, calendarParts: true, calendarAll: true, approveScope: "all", memberStatusScope: "all", canManageUsers: true };
  }
  if (safeRole === "team_leader") {
    const approveScope = dept === "매뉴얼팀" ? "manual" : dept === "파츠북팀" ? "parts" : "none";
    return { ...base, calendarManual: dept === "매뉴얼팀", calendarParts: dept === "파츠북팀", approveScope, memberStatusScope: approveScope, canManageUsers: true };
  }
  return base;
}

function normalizePermissions(raw, role, dept) {
  const safeRole = normalizeRole(role);
  const src = raw && typeof raw === "object" ? raw : {};
  const defaults = getLegacyDefaultPermissions(safeRole, dept);
  const explicit =
    src.calendarSelf !== undefined ||
    src.calendarManual !== undefined ||
    src.calendarParts !== undefined ||
    src.calendarAll !== undefined ||
    src.approveScope !== undefined ||
    src.memberStatusScope !== undefined ||
    src.canAccessMasterSettings !== undefined ||
    src.canManageUsers !== undefined;
  const p = explicit
    ? {
        calendarSelf: toBool(src.calendarSelf, false),
        calendarManual: toBool(src.calendarManual, false),
        calendarParts: toBool(src.calendarParts, false),
        calendarAll: toBool(src.calendarAll, false),
        approveScope: normalizeScope(src.approveScope, "none"),
        memberStatusScope: normalizeScope(src.memberStatusScope, normalizeScope(src.approveScope, "none")),
        canAccessMasterSettings: toBool(src.canAccessMasterSettings, false),
        canManageUsers: toBool(src.canManageUsers, false)
      }
    : defaults;
  if (safeRole === "master") return getLegacyDefaultPermissions("master", dept);
  if (!p.calendarSelf && !p.calendarManual && !p.calendarParts && !p.calendarAll) p.calendarSelf = true;
  return p;
}

function sanitizeSpecialLeaveTypeObject(raw, fallback = {}) {
  const typeKey = normalizeSpecialLeaveTypeKey(raw?.typeKey || fallback.typeKey);
  return {
    typeKey,
    label: text(raw?.label || fallback.label) || typeKey,
    enabled: toBool(raw?.enabled, toBool(fallback.enabled, false)),
    sortOrder: Number.isFinite(Number(raw?.sortOrder)) ? Number(raw.sortOrder) : Number(fallback.sortOrder || 0),
    color: normalizeSpecialLeaveColor(raw?.color || fallback.color),
    grantHours: Math.max(0, Number.isFinite(Number(raw?.grantHours)) ? Number(raw.grantHours) : Number(fallback.grantHours || 0)),
    requestMode: normalizeSpecialLeaveRequestMode(raw?.requestMode || fallback.requestMode),
    allowHolidayRequest: toBool(raw?.allowHolidayRequest, toBool(fallback.allowHolidayRequest, false)),
    dayCountMode: normalizeSpecialLeaveDayCountMode(raw?.dayCountMode || fallback.dayCountMode)
  };
}

function buildSpecialLeaveTypes(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => sanitizeSpecialLeaveTypeObject(item))
    .filter((item) => item.typeKey && item.label)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || String(a.label || "").localeCompare(String(b.label || ""), "ko"));
}

function sanitizeUserSpecialLeaveObject(raw, fallbackUserId) {
  return {
    userId: text(raw?.userId || fallbackUserId),
    typeKey: normalizeSpecialLeaveTypeKey(raw?.typeKey),
    totalHours: Math.max(0, Number(raw?.totalHours || 0) || 0),
    usedHours: Math.max(0, Number(raw?.usedHours || 0) || 0),
    note: text(raw?.note),
    updatedAt: text(raw?.updatedAt) || nowKst()
  };
}

function sanitizeMailRouteObject(raw) {
  const ccSource = Array.isArray(raw?.ccUserIds) ? raw.ccUserIds : text(raw?.ccUserIds).split(/[;,]/);
  return {
    dept: text(raw?.dept),
    roleGroup: text(raw?.roleGroup).toLowerCase() === "leader" ? "leader" : "staff",
    toUserId: text(raw?.toUserId),
    ccUserIds: [...new Set(ccSource.map((item) => text(item)).filter(Boolean))]
  };
}

function buildMailRoutes(items) {
  const byKey = new Map();
  (Array.isArray(items) ? items : [])
    .map((item) => sanitizeMailRouteObject(item))
    .filter((item) => item.dept && item.toUserId)
    .forEach((item) => byKey.set(`${item.dept}::${item.roleGroup}`, item));
  return [...byKey.values()].sort((a, b) => `${a.dept}:${a.roleGroup}`.localeCompare(`${b.dept}:${b.roleGroup}`, "ko"));
}

function sanitizeUserForClient(user) {
  return {
    id: text(user.id),
    password: "",
    name: text(user.name),
    role: normalizeRole(user.role),
    rank: text(user.rank),
    dept: text(user.dept),
    totalHours: Number(user.totalHours || 0),
    usedHours: Number(user.usedHours || 0),
    email: text(user.email),
    phone: cleanPhone(user.phone),
    employeeNo: text(user.employeeNo),
    workQ1: normalizeWorkShift(user.workQ1),
    workQ2: normalizeWorkShift(user.workQ2),
    workQ3: normalizeWorkShift(user.workQ3),
    workQ4: normalizeWorkShift(user.workQ4),
    featureMemberCard: toBool(user.featureMemberCard, false),
    featureBoard: toBool(user.featureBoard, true),
    featureHomepage: toBool(user.featureHomepage, false),
    permissions: normalizePermissions(user.permissions || {}, user.role, user.dept)
  };
}

async function getUserById(userId) {
  const doc = await store.collection("users").doc(text(userId)).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function getCollectionDocs(collectionName) {
  const snap = await store.collection(collectionName).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

function createActionError(message, extra = {}) {
  const error = new Error(message);
  Object.assign(error, extra);
  return error;
}

function hashTokenSecret(secret) {
  return crypto.createHash("sha256").update(String(secret || "")).digest("hex");
}

function createSessionTokenParts() {
  const sessionId = crypto.randomUUID();
  const secret = crypto.randomBytes(24).toString("hex");
  return {
    sessionId,
    secret,
    token: `${sessionId}.${secret}`
  };
}

function parseSessionToken(rawToken) {
  const token = text(rawToken);
  const separatorIndex = token.indexOf(".");
  if (separatorIndex <= 0 || separatorIndex >= token.length - 1) return null;
  return {
    sessionId: token.slice(0, separatorIndex),
    secret: token.slice(separatorIndex + 1)
  };
}

function buildSessionExpiry(nowMs = Date.now()) {
  return admin.firestore.Timestamp.fromMillis(nowMs + SESSION_TTL_MS);
}

async function createSessionForUser(userId, req) {
  const parts = createSessionTokenParts();
  const now = admin.firestore.Timestamp.now();
  const expiresAt = buildSessionExpiry(now.toMillis());
  await store.collection(SESSION_COLLECTION).doc(parts.sessionId).set({
    id: parts.sessionId,
    userId: text(userId),
    tokenHash: hashTokenSecret(parts.secret),
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now,
    expiresAt,
    revokedAt: null,
    createdIp: resolveClientIp(req)
  });
  return {
    sessionToken: parts.token,
    sessionExpiresAt: expiresAt.toDate().toISOString()
  };
}

async function getSessionContext(payload, options = {}) {
  const rawToken = text(payload.sessionToken || payload.token);
  if (!rawToken) throw createActionError("SESSION_REQUIRED");
  const tokenParts = parseSessionToken(rawToken);
  if (!tokenParts) throw createActionError("SESSION_INVALID");

  const sessionRef = store.collection(SESSION_COLLECTION).doc(tokenParts.sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) throw createActionError("SESSION_INVALID");

  const sessionData = sessionSnap.data() || {};
  if (text(sessionData.tokenHash) !== hashTokenSecret(tokenParts.secret)) {
    throw createActionError("SESSION_INVALID");
  }
  if (sessionData.revokedAt) throw createActionError("SESSION_REVOKED");

  const expiresAtMs =
    sessionData.expiresAt && typeof sessionData.expiresAt.toMillis === "function"
      ? sessionData.expiresAt.toMillis()
      : 0;
  if (expiresAtMs && expiresAtMs < Date.now()) throw createActionError("SESSION_EXPIRED");

  const actorUser = await getUserById(text(sessionData.userId));
  if (!actorUser) throw createActionError("SESSION_USER_NOT_FOUND");

  if (options.touch !== false) {
    const lastSeenAtMs =
      sessionData.lastSeenAt && typeof sessionData.lastSeenAt.toMillis === "function"
        ? sessionData.lastSeenAt.toMillis()
        : 0;
    const nowMs = Date.now();
    if (!lastSeenAtMs || nowMs - lastSeenAtMs >= SESSION_TOUCH_INTERVAL_MS) {
      const touchedAt = admin.firestore.Timestamp.fromMillis(nowMs);
      await sessionRef.set(
        {
          updatedAt: touchedAt,
          lastSeenAt: touchedAt,
          expiresAt: buildSessionExpiry(nowMs)
        },
        { merge: true }
      );
    }
  }

  return {
    actor: {
      id: text(actorUser.id),
      name: text(actorUser.name)
    },
    actorUser,
    sessionRef,
    sessionData: { id: sessionSnap.id, ...sessionData },
    sessionToken: rawToken
  };
}

async function revokeSession(payload) {
  const sessionContext = await getSessionContext(payload, { touch: false });
  await sessionContext.sessionRef.set(
    {
      revokedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    },
    { merge: true }
  );
  return sessionContext;
}

async function writeLog(userId, userName, type, ip, detail) {
  await store.collection("accessLogs").add({
    timestamp: nowKst(),
    userId: text(userId),
    userName: text(userName),
    type: cleanLogType(type || "Action"),
    ip: text(ip),
    detail: text(detail)
  });
}

function resolveClientIp(req, body = {}) {
  const direct = text(body.clientIp);
  if (direct) return direct;
  const forwarded = text(req.headers["x-forwarded-for"]);
  return forwarded ? forwarded.split(",")[0].trim() : "";
}

function buildStoredUser(input, existingUser = null, actorRole = "") {
  const base = existingUser || {};
  const requestedRole = normalizeRole(input.role || base.role || "employee");
  const finalRole = actorRole === "master" || !existingUser ? requestedRole : normalizeRole(base.role || requestedRole);
  const finalDept = text(input.dept || base.dept);
  const finalPermissions =
    actorRole === "master"
      ? normalizePermissions(input.permissions || base.permissions || {}, finalRole, finalDept)
      : normalizePermissions(base.permissions || {}, finalRole, finalDept);
  return {
    id: text(input.id || base.id),
    loginId: text(input.id || base.loginId || base.id),
    password: text(input.password || base.password),
    passwordHash: text(input.passwordHash || base.passwordHash),
    passwordSalt: text(input.passwordSalt || base.passwordSalt),
    name: text(input.name || base.name),
    role: finalRole,
    rank: text(input.rank || base.rank),
    dept: finalDept,
    totalHours: Number.isFinite(Number(input.totalHours)) ? Number(input.totalHours) : Number(base.totalHours || 0),
    usedHours: existingUser ? Number(base.usedHours || 0) : Number(input.usedHours || 0),
    email: text(input.email || base.email),
    calendarSelf: finalPermissions.calendarSelf,
    calendarManual: finalPermissions.calendarManual,
    calendarParts: finalPermissions.calendarParts,
    calendarAll: finalPermissions.calendarAll,
    approveScope: finalPermissions.approveScope,
    canManageUsers: finalPermissions.canManageUsers,
    phone: cleanPhone(input.phone || base.phone),
    employeeNo: text(input.employeeNo || base.employeeNo),
    workQ1: normalizeWorkShift(input.workQ1 || base.workQ1),
    workQ2: normalizeWorkShift(input.workQ2 || base.workQ2),
    workQ3: normalizeWorkShift(input.workQ3 || base.workQ3),
    workQ4: normalizeWorkShift(input.workQ4 || base.workQ4),
    featureMemberCard: actorRole === "master" ? toBool(input.featureMemberCard, false) : toBool(base.featureMemberCard, false),
    featureBoard: actorRole === "master" ? toBool(input.featureBoard, true) : toBool(base.featureBoard, true),
    featureHomepage: actorRole === "master" ? toBool(input.featureHomepage, false) : toBool(base.featureHomepage, false),
    memberStatusScope: finalPermissions.memberStatusScope,
    canAccessMasterSettings: finalPermissions.canAccessMasterSettings,
    permissions: finalPermissions,
    updatedAt: nowKst()
  };
}

async function loadData(scope = "all") {
  const safeScope = ["all", "boot", "rest"].includes(scope) ? scope : "all";
  let users = [];
  let requests = [];
  let boardPosts = [];
  let holidays = {};
  let specialLeaveTypes = [];
  let userSpecialLeaves = [];
  let mailRoutes = [];

  if (safeScope !== "rest") {
    users = (await getCollectionDocs("users")).map(sanitizeUserForClient);
    (await getCollectionDocs("holidays")).forEach((item) => {
      if (item.date) holidays[item.date] = text(item.name);
    });
    specialLeaveTypes = buildSpecialLeaveTypes(await getCollectionDocs("specialLeaveTypes"));
    userSpecialLeaves = (await getCollectionDocs("userSpecialLeaves"))
      .map((item) => sanitizeUserSpecialLeaveObject(item, item.userId))
      .filter((item) => item.userId && item.typeKey);
    mailRoutes = (await getCollectionDocs("mailRoutes"))
      .map((item) => sanitizeMailRouteObject(item))
      .filter((item) => item.dept && item.toUserId);
  }

  if (safeScope !== "boot") {
    requests = (await getCollectionDocs("requests")).map((item) => ({
      id: text(item.id),
      userId: text(item.userId),
      userName: text(item.userName),
      dept: text(item.dept),
      role: text(item.role),
      type: text(item.type),
      startDate: text(item.startDate),
      endDate: text(item.endDate),
      hours: Number(item.hours || 0),
      timeRange: text(item.timeRange),
      reason: text(item.reason),
      status: text(item.status),
      timestamp: text(item.timestamp),
      specialLeaveTypeKey: text(item.specialLeaveTypeKey),
      specialLeaveTypeLabel: text(item.specialLeaveTypeLabel),
      rejectReason: text(item.rejectReason)
    }));
    boardPosts = (await getCollectionDocs("boardPosts"))
      .map((item) => ({
        id: text(item.id),
        title: text(item.title),
        content: text(item.content),
        category: text(item.category || "일반"),
        authorId: text(item.authorId),
        authorName: text(item.authorName),
        authorDept: text(item.authorDept),
        isNotice: toBool(item.isNotice, false),
        status: text(item.status || "active"),
        viewCount: Number(item.viewCount || 0),
        createdAt: text(item.createdAt),
        updatedAt: text(item.updatedAt)
      }))
      .filter((item) => item.status !== "deleted");
  }

  return {
    result: "success",
    meta: { scopedLoad: true, scope: safeScope },
    data: { users, requests, boardPosts, holidays, specialLeaveTypes, userSpecialLeaves, mailRoutes }
  };
}

function getActorAccess(actorUser) {
  const actorRole = normalizeRole(actorUser && actorUser.role);
  const actorPerms = normalizePermissions(actorUser && actorUser.permissions ? actorUser.permissions : {}, actorRole, actorUser && actorUser.dept);
  return { actorRole, actorPerms };
}

function canApproveRequestForActor(actorUser, requestData) {
  if (!actorUser || !requestData) return false;
  const { actorRole, actorPerms } = getActorAccess(actorUser);
  if (actorRole === "master") return true;
  if (text(actorUser.id) === text(requestData.userId)) return false;
  if (actorPerms.approveScope === "all") return true;
  if (actorPerms.approveScope === "manual") return text(requestData.dept) === "매뉴얼팀";
  if (actorPerms.approveScope === "parts") return text(requestData.dept) === "파츠북팀";
  return false;
}

function canRequesterCancelApprovedRequest(requestData) {
  const endDate = normalizeRequestDateKey(requestData && (requestData.endDate || requestData.startDate));
  if (!endDate) return false;
  return endDate >= nowKst().slice(0, 10);
}

function getRequestMutationMode(actorUser, currentRequest, nextStatus, targetUserId) {
  const actorId = text(actorUser && actorUser.id);
  const actorRole = normalizeRole(actorUser && actorUser.role);
  const safeNextStatus = text(nextStatus || "pending") || "pending";

  if (!currentRequest) {
    if (actorRole === "master") return "create";
    if (actorId && actorId === text(targetUserId)) return "create";
    return "";
  }

  const currentStatus = text(currentRequest.status);
  const isSelfRequest = actorId && actorId === text(currentRequest.userId);

  if (isSelfRequest) {
    if (currentStatus === "pending" && safeNextStatus === "pending") return "self_edit";
    if (currentStatus === "pending" && safeNextStatus === "cancelled") return "self_cancel_pending";
    if (currentStatus === "approved" && safeNextStatus === "cancel_requested" && canRequesterCancelApprovedRequest(currentRequest)) {
      return "self_cancel_request";
    }
  }

  if (canApproveRequestForActor(actorUser, currentRequest)) {
    if (currentStatus === "pending" && safeNextStatus === "approved") return "approve";
    if (currentStatus === "pending" && safeNextStatus === "rejected") return "reject";
    if (currentStatus === "cancel_requested" && safeNextStatus === "cancelled") return "cancel_approve";
    if (currentStatus === "cancel_requested" && safeNextStatus === "approved") return "cancel_reject";
  }

  return "";
}

function buildRequestPayloadForWrite(input, options = {}) {
  const currentRequest = options.currentRequest || null;
  const targetUser = options.targetUser || null;
  const nextStatus = text(input.status || (currentRequest && currentRequest.status) || "pending") || "pending";

  const base = currentRequest
    ? {
        id: text(currentRequest.id),
        userId: text(currentRequest.userId),
        userName: text(currentRequest.userName),
        dept: text(currentRequest.dept),
        role: text(currentRequest.role),
        type: text(currentRequest.type),
        startDate: text(currentRequest.startDate),
        endDate: text(currentRequest.endDate || currentRequest.startDate),
        hours: Number(currentRequest.hours || 0),
        timeRange: text(currentRequest.timeRange),
        reason: text(currentRequest.reason),
        status: text(currentRequest.status),
        timestamp: text(currentRequest.timestamp),
        specialLeaveTypeKey: text(currentRequest.specialLeaveTypeKey),
        specialLeaveTypeLabel: text(currentRequest.specialLeaveTypeLabel),
        rejectReason: text(currentRequest.rejectReason)
      }
    : {
        id: text(input.id),
        userId: text(targetUser && targetUser.id),
        userName: text(targetUser && targetUser.name),
        dept: text(targetUser && targetUser.dept),
        role: text(targetUser && targetUser.role),
        type: text(input.type),
        startDate: text(input.startDate),
        endDate: text(input.endDate || input.startDate),
        hours: Number(input.hours || 0),
        timeRange: text(input.timeRange),
        reason: text(input.reason),
        status: nextStatus,
        timestamp: text(input.timestamp) || nowKst(),
        specialLeaveTypeKey: text(input.specialLeaveTypeKey),
        specialLeaveTypeLabel: text(input.specialLeaveTypeLabel),
        rejectReason: text(input.rejectReason)
      };

  const mutationMode = text(options.mutationMode);
  if (mutationMode === "self_edit") {
    return {
      ...base,
      type: text(input.type),
      startDate: text(input.startDate),
      endDate: text(input.endDate || input.startDate),
      hours: Number(input.hours || 0),
      timeRange: text(input.timeRange),
      reason: text(input.reason),
      status: "pending",
      timestamp: text(currentRequest && currentRequest.timestamp) || text(input.timestamp) || nowKst(),
      specialLeaveTypeKey: text(input.specialLeaveTypeKey),
      specialLeaveTypeLabel: text(input.specialLeaveTypeLabel),
      rejectReason: ""
    };
  }

  if (mutationMode === "approve" || mutationMode === "cancel_approve") {
    return {
      ...base,
      status: mutationMode === "approve" ? "approved" : "cancelled",
      rejectReason: ""
    };
  }

  if (mutationMode === "reject") {
    return {
      ...base,
      status: "rejected",
      rejectReason: text(input.rejectReason)
    };
  }

  if (mutationMode === "cancel_reject") {
    return {
      ...base,
      status: "approved",
      rejectReason: ""
    };
  }

  if (mutationMode === "self_cancel_pending") {
    return {
      ...base,
      status: "cancelled",
      rejectReason: ""
    };
  }

  if (mutationMode === "self_cancel_request") {
    return {
      ...base,
      status: "cancel_requested",
      rejectReason: ""
    };
  }

  return {
    ...base,
    status: nextStatus
  };
}

async function requireActor(payload, options = {}) {
  return getSessionContext(payload, options);
}

async function handleLogin(req, payload, action) {
  const user = await getUserById(payload.id);
  const loginFailed = !user || text(user.password) !== text(payload.password);
  if (loginFailed) {
    return { result: "fail", message: "LOGIN_INVALID" };
  }
  if (false && loginFailed) {
    return { result: "fail", message: "아이디/비번 불일치" };
  }
  const safeUser = sanitizeUserForClient(user);
  const session = await createSessionForUser(safeUser.id, req);
  await writeLog(safeUser.id, safeUser.name, "Login", resolveClientIp(req, payload), "login_success");
  if (action === "login_boot") {
    const boot = await loadData("boot");
    return {
      result: "success",
      user: safeUser,
      sessionToken: session.sessionToken,
      sessionExpiresAt: session.sessionExpiresAt,
      meta: boot.meta,
      data: boot.data
    };
  }
  return {
    result: "success",
    user: safeUser,
    sessionToken: session.sessionToken,
    sessionExpiresAt: session.sessionExpiresAt
  };
}

async function handleSessionBoot(req, payload) {
  const { actorUser } = await requireActor(payload);
  const boot = await loadData("boot");
  return {
    result: "success",
    user: sanitizeUserForClient(actorUser),
    meta: boot.meta,
    data: boot.data
  };
}

async function handleLogout(req, payload) {
  const { actor, actorUser } = await revokeSession(payload);
  await writeLog(actor.id, actor.name, "Logout", resolveClientIp(req, payload), text(payload.reason || "manual"));
  return {
    result: "success",
    user: sanitizeUserForClient(actorUser)
  };
}

async function handleLogAccess(req, payload) {
  const { actorUser } = await requireActor(payload);
  await writeLog(actorUser.id, actorUser.name, payload.logType || "Action", resolveClientIp(req, payload), payload.detail);
  return { result: "success" };
}

async function handleUpsertRequest(req, payload) {
  const r = payload.data || {};
  const requestId = text(r.id);
  const { actor, actorUser } = await requireActor(payload);
  const actorId = text(actor.id);
  const actorName = text(actor.name);
  const expectedStatus = text(payload.expectedStatus);
  if (!requestId) return { result: "fail", message: "REQUEST_ID_REQUIRED" };
  const requestRef = store.collection("requests").doc(requestId);
  const targetUserId = text(r.userId);
  const targetUser = targetUserId ? await getUserById(targetUserId) : null;
  let existedBefore = false;
  let savedRequest = null;

  try {
    await store.runTransaction(async (transaction) => {
      const existingSnap = await transaction.get(requestRef);
      const currentRequest = existingSnap.exists ? { id: existingSnap.id, ...existingSnap.data() } : null;
      const resolvedTargetUserId = currentRequest ? text(currentRequest.userId) : targetUserId;
      const nextStatus = text(r.status || (currentRequest && currentRequest.status) || "pending") || "pending";
      const mutationMode = getRequestMutationMode(actorUser, currentRequest, nextStatus, resolvedTargetUserId);

      if (!mutationMode) throw createActionError("FORBIDDEN_REQUEST_WRITE");
      if (!currentRequest && !targetUser) throw createActionError("REQUEST_USER_NOT_FOUND");

      if (currentRequest && expectedStatus) {
        const currentStatus = text(currentRequest.status);
        if (currentStatus !== expectedStatus) {
          throw createActionError("REQUEST_STATE_CONFLICT", { currentStatus });
        }
      }

      const docData = buildRequestPayloadForWrite(r, {
        currentRequest,
        targetUser,
        mutationMode
      });

      const activeStatus = text(docData.status);
      if (!["cancelled", "rejected"].includes(activeStatus)) {
        const candidateStart = normalizeRequestDateKey(docData.startDate);
        const candidateEnd = normalizeRequestDateKey(docData.endDate || docData.startDate);
        const duplicateQuery = store.collection("requests").where("userId", "==", text(docData.userId));
        const duplicateSnap = await transaction.get(duplicateQuery);
        const duplicated = duplicateSnap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .find((item) => {
            if (text(item.id) === requestId) return false;
            if (["cancelled", "rejected"].includes(text(item.status))) return false;
            const existingStart = normalizeRequestDateKey(item.startDate);
            const existingEnd = normalizeRequestDateKey(item.endDate || item.startDate);
            if (!candidateStart || !candidateEnd || !existingStart || !existingEnd) return false;
            return candidateStart <= existingEnd && candidateEnd >= existingStart;
          });
        if (duplicated) {
          throw createActionError("REQUEST_DUPLICATE_CONFLICT", {
            duplicateId: text(duplicated.id),
            duplicateStartDate: text(duplicated.startDate),
            duplicateEndDate: text(duplicated.endDate || duplicated.startDate)
          });
        }
      }

      savedRequest = {
        ...docData,
        id: requestId,
        updatedAt: nowKst()
      };
      existedBefore = existingSnap.exists;
      transaction.set(requestRef, savedRequest, { merge: true });
    });
  } catch (error) {
    if (error && error.message === "REQUEST_DUPLICATE_CONFLICT") {
      return {
        result: "error",
        message: "REQUEST_DUPLICATE_CONFLICT",
        duplicateId: text(error.duplicateId),
        duplicateStartDate: text(error.duplicateStartDate),
        duplicateEndDate: text(error.duplicateEndDate)
      };
    }
    if (error && error.message === "REQUEST_STATE_CONFLICT") {
      return {
        result: "error",
        message: "REQUEST_STATE_CONFLICT",
        currentStatus: text(error.currentStatus)
      };
    }
    if (error && error.message) {
      return { result: "fail", message: error.message };
    }
    throw error;
  }

  await writeLog(actorId, actorName, existedBefore ? "RequestUpdate" : "RequestCreate", resolveClientIp(req, payload), `${requestId}|${savedRequest.type}|${savedRequest.status}`);
  return { result: "success" };
}

async function handleDeleteRequest(req, payload) {
  const { actor, actorUser } = await requireActor(payload);
  const targetId = text(payload.id);
  const existing = await store.collection("requests").doc(targetId).get();
  if (!existing.exists) return { result: "fail", message: "REQUEST_NOT_FOUND" };
  const requestData = existing.data() || {};
  if (!(normalizeRole(actorUser.role) === "master" || text(requestData.userId) === text(actorUser.id))) {
    return { result: "fail", message: "REQUEST_DELETE_FORBIDDEN" };
  }
  await store.collection("requests").doc(targetId).delete();
  await writeLog(actor.id, actor.name, "RequestDelete", resolveClientIp(req, payload), targetId);
  return { result: "success" };
}

async function handleUpsertUser(req, payload) {
  const { actor, actorUser } = await requireActor(payload);
  const input = payload.data && typeof payload.data === "object" ? payload.data : {};
  const targetId = text(input.id);
  if (!actorUser || !targetId) return { result: "fail", message: "요청 정보가 올바르지 않습니다." };

  const actorRole = normalizeRole(actorUser.role);
  const actorPerms = normalizePermissions(actorUser.permissions || {}, actorRole, actorUser.dept);
  if (!(actorRole === "master" || actorPerms.canManageUsers)) {
    return { result: "fail", message: "구성원 관리 권한이 없습니다." };
  }

  const existingUser = await getUserById(targetId);
  const oldRole = existingUser ? normalizeRole(existingUser.role) : "";
  const reqRole = normalizeRole(input.role || oldRole || "employee");
  if (actorRole !== "master" && oldRole === "master") return { result: "fail", message: "마스터 계정은 수정할 수 없습니다." };
  if (actorRole !== "master" && reqRole === "master" && oldRole !== "master") return { result: "fail", message: "마스터 권한은 변경할 수 없습니다." };

  let finalPassword = text(input.password);
  if (existingUser) {
    if (actorRole !== "master" || !finalPassword) finalPassword = text(existingUser.password);
  } else if (!finalPassword) {
    return { result: "fail", message: "신규 계정 비밀번호가 필요합니다." };
  }

  const storedUser = buildStoredUser({ ...input, password: finalPassword }, existingUser, actorRole);
  await store.collection("users").doc(targetId).set(storedUser, { merge: true });
  await writeLog(actor.id, actor.name, existingUser ? "UserUpdate" : "UserCreate", resolveClientIp(req, payload), targetId);
  return { result: "success", user: sanitizeUserForClient(storedUser) };
}

async function handleSaveSpecialLeaveTypes(req, payload) {
  const { actor, actorUser } = await requireActor(payload);
  if (!actorUser || normalizeRole(actorUser.role) !== "master") return { result: "fail", message: "설정 저장은 마스터만 가능합니다." };
  const types = buildSpecialLeaveTypes(payload.types || []);
  const batch = store.batch();
  (await getCollectionDocs("specialLeaveTypes")).forEach((item) => batch.delete(store.collection("specialLeaveTypes").doc(item.typeKey)));
  types.forEach((item) => batch.set(store.collection("specialLeaveTypes").doc(item.typeKey), item));
  await batch.commit();
  await writeLog(actor.id, actor.name, "SpecialLeaveTypeSave", resolveClientIp(req, payload), String(types.length));
  return { result: "success", types };
}

async function handleSaveUserSpecialLeaves(req, payload) {
  const { actor, actorUser } = await requireActor(payload);
  const targetUserId = text(payload.userId);
  if (!actorUser || !targetUserId) return { result: "fail", message: "요청 정보가 올바르지 않습니다." };
  const actorRole = normalizeRole(actorUser.role);
  const actorPerms = normalizePermissions(actorUser.permissions || {}, actorRole, actorUser.dept);
  if (!(actorRole === "master" || actorPerms.canManageUsers)) return { result: "fail", message: "구성원 관리 권한이 없습니다." };
  const targetUser = await getUserById(targetUserId);
  if (!targetUser) return { result: "fail", message: "사용자를 찾을 수 없습니다." };
  if (actorRole !== "master" && normalizeRole(targetUser.role) === "master") return { result: "fail", message: "마스터 계정은 수정할 수 없습니다." };

  const typeKeys = new Set((await getCollectionDocs("specialLeaveTypes")).map((item) => item.typeKey));
  const cleanLeaves = (Array.isArray(payload.leaves) ? payload.leaves : [])
    .map((item) => sanitizeUserSpecialLeaveObject(item, targetUserId))
    .filter((item) => item.typeKey && typeKeys.has(item.typeKey));

  const existing = await store.collection("userSpecialLeaves").where("userId", "==", targetUserId).get();
  const batch = store.batch();
  existing.forEach((doc) => batch.delete(doc.ref));
  cleanLeaves.filter((item) => item.totalHours > 0 || item.usedHours > 0 || item.note).forEach((item) => {
    const docId = `${item.userId}__${item.typeKey}`;
    batch.set(store.collection("userSpecialLeaves").doc(docId), { ...item, id: docId });
  });
  await batch.commit();
  const leaves = await store.collection("userSpecialLeaves").where("userId", "==", targetUserId).get();
  await writeLog(actor.id, actor.name, "UserSpecialLeaveSave", resolveClientIp(req, payload), targetUserId);
  return { result: "success", leaves: leaves.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
}

async function handleSaveMailRoutes(req, payload) {
  const { actor, actorUser } = await requireActor(payload);
  if (!actorUser || normalizeRole(actorUser.role) !== "master") return { result: "fail", message: "메일 설정 저장은 마스터만 가능합니다." };
  const routes = buildMailRoutes(payload.routes || []);
  const batch = store.batch();
  (await getCollectionDocs("mailRoutes")).forEach((item) => batch.delete(store.collection("mailRoutes").doc(item.id)));
  routes.forEach((item) => {
    const docId = `${item.dept}__${item.roleGroup}`;
    batch.set(store.collection("mailRoutes").doc(docId), { ...item, id: docId });
  });
  await batch.commit();
  await writeLog(actor.id, actor.name, "MailRouteSave", resolveClientIp(req, payload), String(routes.length));
  return { result: "success", routes };
}

async function handleSaveUsers(req, payload) {
  const { actor, actorUser } = await requireActor(payload);
  if (!actorUser) return { result: "fail", message: "권한 확인 실패" };
  const actorRole = normalizeRole(actorUser.role);
  const actorPerms = normalizePermissions(actorUser.permissions || {}, actorRole, actorUser.dept);
  const canSave = actorRole === "master" || actorPerms.canManageUsers || actorPerms.canAccessMasterSettings;
  if (!canSave) return { result: "fail", message: "권한/설정 권한이 없습니다." };

  const existingUsers = await getCollectionDocs("users");
  const existingMap = new Map(existingUsers.map((item) => [item.id, item]));
  const incomingUsers = Array.isArray(payload.users) ? payload.users : [];
  const incomingIds = new Set();
  const batch = store.batch();

  incomingUsers.forEach((userInput) => {
    const userId = text(userInput.id);
    if (!userId) return;
    incomingIds.add(userId);
    const existingUser = existingMap.get(userId) || null;
    const storedUser = buildStoredUser({ ...userInput, password: text(userInput.password) || text(existingUser?.password) }, existingUser, actorRole);
    batch.set(store.collection("users").doc(userId), storedUser, { merge: true });
  });
  existingUsers.forEach((item) => {
    if (!incomingIds.has(item.id)) batch.delete(store.collection("users").doc(item.id));
  });
  await batch.commit();
  await writeLog(actor.id, actor.name, "UserSave", resolveClientIp(req, payload), `rows:${incomingIds.size}`);
  return { result: "success" };
}

async function handleChangePassword(req, payload) {
  const { actor, actorUser } = await requireActor(payload);
  const newPassword = text(payload.newPassword);
  if (!actorUser) return { result: "fail", message: "로그인 정보가 없습니다." };
  if (!newPassword) return { result: "fail", message: "비밀번호는 1자 이상이어야 합니다." };
  await store.collection("users").doc(actorUser.id).set({ password: newPassword, updatedAt: nowKst() }, { merge: true });
  await writeLog(actor.id, actor.name, "PasswordChange", resolveClientIp(req, payload), "self");
  return { result: "success" };
}

async function handleUpsertBoardPost(req, payload) {
  const { actor, actorUser } = await requireActor(payload);
  const input = payload.data || {};
  const postId = text(input.id || Date.now());
  const now = nowKst();
  const existing = await store.collection("boardPosts").doc(postId).get();
  const actorRole = normalizeRole(actorUser.role);
  const existingPost = existing.exists ? existing.data() || {} : null;
  if (existingPost && !(actorRole === "master" || text(existingPost.authorId) === text(actorUser.id))) {
    return { result: "fail", message: "BOARD_POST_FORBIDDEN" };
  }
  const docData = {
    id: postId,
    title: text(input.title),
    content: text(input.content),
    category: text(input.category || "일반"),
    authorId: existingPost ? text(existingPost.authorId) : text(actorUser.id),
    authorName: existingPost ? text(existingPost.authorName) : text(actorUser.name),
    authorDept: existingPost ? text(existingPost.authorDept) : text(actorUser.dept),
    isNotice: actorRole === "master" ? toBool(input.isNotice, false) : toBool(existingPost && existingPost.isNotice, false),
    status: text(input.status || "active"),
    viewCount: Number(input.viewCount || 0),
    createdAt: existingPost ? text(existingPost.createdAt) : text(input.createdAt) || now,
    updatedAt: now
  };
  await store.collection("boardPosts").doc(postId).set(docData, { merge: true });
  await writeLog(actor.id, actor.name, existing.exists ? "BoardPostUpdate" : "BoardPostCreate", resolveClientIp(req, payload), postId);
  return { result: "success", id: postId };
}

async function handleDeleteBoardPost(req, payload) {
  const { actor, actorUser } = await requireActor(payload);
  const targetId = text(payload.id);
  const existing = await store.collection("boardPosts").doc(targetId).get();
  if (!existing.exists) return { result: "fail", message: "BOARD_POST_NOT_FOUND" };
  const existingPost = existing.data() || {};
  if (!(normalizeRole(actorUser.role) === "master" || text(existingPost.authorId) === text(actorUser.id))) {
    return { result: "fail", message: "BOARD_POST_DELETE_FORBIDDEN" };
  }
  await store.collection("boardPosts").doc(targetId).set({ status: "deleted", updatedAt: nowKst() }, { merge: true });
  await writeLog(actor.id, actor.name, "BoardPostDelete", resolveClientIp(req, payload), targetId);
  return { result: "success" };
}

async function handlePost(req, payload) {
  const action = text(payload.action);
  if (action === "login" || action === "login_boot") return handleLogin(req, payload, action);
  if (action === "session_boot") return handleSessionBoot(req, payload);
  if (action === "logout") return handleLogout(req, payload);
  if (action === "log_access") return handleLogAccess(req, payload);
  if (action === "upsert_request") return handleUpsertRequest(req, payload);
  if (action === "delete_request") return handleDeleteRequest(req, payload);
  if (action === "upsert_user") return handleUpsertUser(req, payload);
  if (action === "save_special_leave_types") return handleSaveSpecialLeaveTypes(req, payload);
  if (action === "save_user_special_leaves") return handleSaveUserSpecialLeaves(req, payload);
  if (action === "save_mail_routes") return handleSaveMailRoutes(req, payload);
  if (action === "save_users") return handleSaveUsers(req, payload);
  if (action === "change_password") return handleChangePassword(req, payload);
  if (action === "upsert_board_post") return handleUpsertBoardPost(req, payload);
  if (action === "delete_board_post") return handleDeleteBoardPost(req, payload);
  return { result: "error", message: "지원하지 않는 action" };
}

exports.api = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 60,
    invoker: "public"
  },
  async (req, res) => {
    try {
      if (req.method === "GET") {
        if (text(req.query.action) === "load") return sendJson(res, await loadData(text(req.query.scope || "all").toLowerCase()));
        return sendJson(res, { result: "error", message: "지원하지 않는 action" });
      }
      if (req.method === "POST") {
        const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
        return sendJson(res, await handlePost(req, payload));
      }
      return sendJson(res, { result: "error", message: "METHOD_NOT_ALLOWED" }, 405);
    } catch (error) {
      return sendJson(res, { result: "error", message: String(error && error.message ? error.message : error) });
    }
  }
);
