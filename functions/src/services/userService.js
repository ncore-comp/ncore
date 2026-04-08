"use strict";

const { store } = require("../lib/firebase");
const { nowKst } = require("../lib/time");
const { text, normalizeRole, normalizePermissions, cleanPhone, normalizeWorkShift, toBool, sanitizeUserForClient } = require("../lib/common");
const { createPasswordRecord, hasPasswordHash, verifyPassword } = require("../lib/password");
const { getUserById, getAllUsers, saveUser, updateUser } = require("../repositories/firestore/usersRepo");
const { requireActor, resolveClientIp } = require("./sessionService");
const { writeLog } = require("./logService");
const { writeSecurityLog } = require("./securityLogService");

function buildStoredUser(input, existingUser = null, actorRole = "") {
  const base = existingUser || {};
  const requestedRole = normalizeRole(input.role || base.role || "employee");
  const finalRole = actorRole === "master" || !existingUser ? requestedRole : normalizeRole(base.role || requestedRole);
  const finalDept = text(input.dept || base.dept);
  const finalPermissions =
    actorRole === "master"
      ? normalizePermissions(input.permissions || base.permissions || {}, finalRole, finalDept)
      : normalizePermissions(base.permissions || {}, finalRole, finalDept);
  const requestedPassword = text(input.password);
  const nextPasswordRecord = !existingUser
    ? createPasswordRecord(requestedPassword || "0")
    : (requestedPassword
        ? createPasswordRecord(requestedPassword)
        : {
            password: "",
            passwordAlgo: text(base.passwordAlgo || (hasPasswordHash(base) ? "scrypt" : "")),
            passwordSalt: text(base.passwordSalt),
            passwordHash: text(base.passwordHash)
          });

  return {
    id: text(input.id || base.id),
    loginId: text(input.id || base.loginId || base.id),
    password: "",
    passwordAlgo: nextPasswordRecord.passwordAlgo,
    passwordHash: nextPasswordRecord.passwordHash,
    passwordSalt: nextPasswordRecord.passwordSalt,
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
    calendarRejected: finalPermissions.calendarRejected,
    calendarWorkReport: finalPermissions.calendarWorkReport,
    workReportViewManual: finalPermissions.workReportViewManual,
    workReportViewParts: finalPermissions.workReportViewParts,
    workReportViewAll: finalPermissions.workReportViewAll,
    approveScope: finalPermissions.approveScope,
    canManageUsers: finalPermissions.canManageUsers,
    canManageUsersDesktop: finalPermissions.canManageUsersDesktop,
    canManageUsersMobile: finalPermissions.canManageUsersMobile,
    canAccessAdminOps: finalPermissions.canAccessAdminOps,
    canAccessAdminOpsDesktop: finalPermissions.canAccessAdminOpsDesktop,
    canAccessAdminOpsMobile: finalPermissions.canAccessAdminOpsMobile,
    canAccessSituationBoard: finalPermissions.canAccessSituationBoard,
    canAccessSituationBoardDesktop: finalPermissions.canAccessSituationBoardDesktop,
    canAccessSituationBoardMobile: finalPermissions.canAccessSituationBoardMobile,
    phone: cleanPhone(input.phone || base.phone),
    employeeNo: text(input.employeeNo || base.employeeNo),
    workQ1: normalizeWorkShift(input.workQ1 || base.workQ1),
    workQ2: normalizeWorkShift(input.workQ2 || base.workQ2),
    workQ3: normalizeWorkShift(input.workQ3 || base.workQ3),
    workQ4: normalizeWorkShift(input.workQ4 || base.workQ4),
    featureMemberCard: actorRole === "master" ? toBool(input.featureMemberCard, false) : toBool(base.featureMemberCard, false),
    featureBoard: actorRole === "master" ? toBool(input.featureBoard, true) : toBool(base.featureBoard, true),
    featureHomepage: actorRole === "master" ? toBool(input.featureHomepage, false) : toBool(base.featureHomepage, false),
    featureOvertime: actorRole === "master" ? toBool(input.featureOvertime, false) : toBool(base.featureOvertime, false),
    featureHolidayWork: actorRole === "master" ? toBool(input.featureHolidayWork, false) : toBool(base.featureHolidayWork, false),
    memberStatusScope: finalPermissions.memberStatusScope,
    canAccessMasterSettings: finalPermissions.canAccessMasterSettings,
    canAccessMasterSettingsDesktop: finalPermissions.canAccessMasterSettingsDesktop,
    canAccessMasterSettingsMobile: finalPermissions.canAccessMasterSettingsMobile,
    permissions: finalPermissions,
    updatedAt: nowKst()
  };
}

function findEmployeeNoOwner(users, employeeNo, excludeId = "") {
  const safeEmployeeNo = text(employeeNo);
  const safeExcludeId = text(excludeId);
  if (!safeEmployeeNo) return null;
  return users.find((item) => text(item.id) !== safeExcludeId && text(item.employeeNo) === safeEmployeeNo) || null;
}

function getDuplicateEmployeeNos(users) {
  const seen = new Set();
  const duplicates = new Set();
  users.forEach((item) => {
    const safeEmployeeNo = text(item && item.employeeNo);
    if (!safeEmployeeNo) return;
    if (seen.has(safeEmployeeNo)) {
      duplicates.add(safeEmployeeNo);
      return;
    }
    seen.add(safeEmployeeNo);
  });
  return Array.from(duplicates);
}

async function upsertUser(req, payload) {
  const { actor, actorUser } = await requireActor(payload);
  const input = payload.data && typeof payload.data === "object" ? payload.data : {};
  const targetId = text(input.id);
  if (!actorUser || !targetId) return { result: "fail", message: "INVALID_USER_INPUT" };

  const actorRole = normalizeRole(actorUser.role);
  const actorPerms = normalizePermissions(actorUser.permissions || {}, actorRole, actorUser.dept);
  if (!(actorRole === "master" || actorPerms.canManageUsers)) {
    return { result: "fail", message: "USER_MANAGE_FORBIDDEN" };
  }

  const existingUser = await getUserById(targetId);
  const oldRole = existingUser ? normalizeRole(existingUser.role) : "";
  const reqRole = normalizeRole(input.role || oldRole || "employee");
  if (actorRole !== "master" && oldRole === "master") return { result: "fail", message: "MASTER_ACCOUNT_UPDATE_FORBIDDEN" };
  if (actorRole !== "master" && reqRole === "master" && oldRole !== "master") return { result: "fail", message: "MASTER_ROLE_ASSIGN_FORBIDDEN" };

  const storedUser = buildStoredUser(input, existingUser, actorRole);
  if (!storedUser.employeeNo) return { result: "fail", message: "EMPLOYEE_NO_REQUIRED" };
  const allUsers = await getAllUsers();
  const duplicateOwner = findEmployeeNoOwner(allUsers, storedUser.employeeNo, targetId);
  if (duplicateOwner) {
    return { result: "fail", message: "EMPLOYEE_NO_DUPLICATE" };
  }
  await saveUser(targetId, storedUser, { merge: true });
  await writeLog(actor.id, actor.name, existingUser ? "UserUpdate" : "UserCreate", resolveClientIp(req, payload), targetId);
  await writeSecurityLog(req, payload, {
    userId: actor.id,
    userName: actor.name,
    eventType: existingUser ? "USER_PRIVILEGED_UPDATE" : "USER_CREATE",
    severity: "warn",
    detail: targetId,
    context: {
      targetUserId: targetId,
      targetRole: storedUser.role,
      targetDept: storedUser.dept
    }
  });
  return { result: "success", user: sanitizeUserForClient(storedUser) };
}

async function saveUsers(req, payload) {
  const { actor, actorUser } = await requireActor(payload);
  if (!actorUser) return { result: "fail", message: "AUTH_REQUIRED" };
  const actorRole = normalizeRole(actorUser.role);
  const actorPerms = normalizePermissions(actorUser.permissions || {}, actorRole, actorUser.dept);
  const canSave = actorRole === "master" || actorPerms.canManageUsers || actorPerms.canAccessMasterSettings;
  if (!canSave) return { result: "fail", message: "MASTER_SETTINGS_FORBIDDEN" };

  const existingUsers = await getAllUsers();
  const existingMap = new Map(existingUsers.map((item) => [item.id, item]));
  const incomingUsers = Array.isArray(payload.users) ? payload.users : [];
  const incomingIds = new Set();
  const preparedUsers = [];
  const batch = store.batch();

  incomingUsers.forEach((userInput) => {
    const userId = text(userInput.id);
    if (!userId) return;
    incomingIds.add(userId);
    const existingUser = existingMap.get(userId) || null;
    const storedUser = buildStoredUser(userInput, existingUser, actorRole);
    preparedUsers.push(storedUser);
  });

  const missingEmployeeNoUser = preparedUsers.find((item) => !text(item.employeeNo));
  if (missingEmployeeNoUser) {
    return { result: "fail", message: "EMPLOYEE_NO_REQUIRED" };
  }
  const duplicateEmployeeNos = getDuplicateEmployeeNos(preparedUsers);
  if (duplicateEmployeeNos.length) {
    return { result: "fail", message: "EMPLOYEE_NO_DUPLICATE" };
  }

  preparedUsers.forEach((storedUser) => {
    batch.set(store.collection("users").doc(storedUser.id), storedUser, { merge: true });
  });

  existingUsers.forEach((item) => {
    if (!incomingIds.has(item.id)) batch.delete(store.collection("users").doc(item.id));
  });

  await batch.commit();
  await writeLog(actor.id, actor.name, "UserSave", resolveClientIp(req, payload), `rows:${incomingIds.size}`);
  await writeSecurityLog(req, payload, {
    userId: actor.id,
    userName: actor.name,
    eventType: "PERMISSIONS_BULK_SAVE",
    severity: "high",
    detail: `rows:${incomingIds.size}`,
    context: {
      rowCount: incomingIds.size
    }
  });
  return { result: "success" };
}

async function changePassword(req, payload) {
  const { actor, actorUser } = await requireActor(payload);
  const currentPassword = text(payload.currentPassword);
  const newPassword = text(payload.newPassword);
  if (!actorUser) return { result: "fail", message: "PASSWORD_CHANGE_AUTH_REQUIRED" };
  if (!currentPassword) return { result: "fail", message: "CURRENT_PASSWORD_REQUIRED" };
  if (!verifyPassword(currentPassword, actorUser)) {
    await writeSecurityLog(req, payload, {
      userId: actor.id,
      userName: actor.name,
      eventType: "PASSWORD_CHANGE_FAILED",
      severity: "warn",
      detail: "CURRENT_PASSWORD_INVALID",
      context: {
        reason: "CURRENT_PASSWORD_INVALID"
      }
    });
    return { result: "fail", message: "CURRENT_PASSWORD_INVALID" };
  }
  if (!newPassword) return { result: "fail", message: "NEW_PASSWORD_REQUIRED" };
  if (newPassword.length < 4) return { result: "fail", message: "PASSWORD_TOO_SHORT" };
  const passwordRecord = createPasswordRecord(newPassword);
  await updateUser(actorUser.id, { ...passwordRecord, updatedAt: nowKst() });
  await writeLog(actor.id, actor.name, "PasswordChange", resolveClientIp(req, payload), "self");
  await writeSecurityLog(req, payload, {
    userId: actor.id,
    userName: actor.name,
    eventType: "PASSWORD_CHANGED",
    severity: "info",
    detail: "self",
    context: {
      targetUserId: actorUser.id
    }
  });
  return { result: "success" };
}

module.exports = {
  upsertUser,
  saveUsers,
  changePassword
};
