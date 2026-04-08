"use strict";

const { getCollectionDocs } = require("../repositories/firestore/commonRepo");
const { getAllHolidayDocs } = require("../repositories/firestore/holidayRepo");
const {
  text,
  normalizeRole,
  normalizePermissions,
  buildSpecialLeaveTypes,
  sanitizeUserSpecialLeaveObject,
  sanitizeMailRouteObject,
  sanitizeUserForClient,
  toBool
} = require("../lib/common");
const { buildMergedHolidayMap } = require("./holidayService");

const MANUAL_DEPT = "\uB9E4\uB274\uC5BC\uD300";
const PARTS_DEPT = "\uD30C\uCE20\uBD81\uD300";

function getActorScopeInfo(actorUser) {
  const role = normalizeRole(actorUser && actorUser.role);
  const perms = normalizePermissions(
    actorUser && actorUser.permissions ? actorUser.permissions : {},
    role,
    actorUser && actorUser.dept
  );
  const userId = text(actorUser && actorUser.id);
  const dept = text(actorUser && actorUser.dept);
  const roleGroup = role === "team_leader" ? "leader" : "staff";
  const isMaster = role === "master";
  const elevated =
    isMaster ||
    perms.canAccessMasterSettings ||
    perms.canManageUsers ||
    perms.canAccessAdminOps;
  return { role, perms, userId, dept, roleGroup, isMaster, elevated };
}

function getVisibleDeptFlags(info) {
  if (info.isMaster || info.elevated) {
    return { all: true, manual: true, parts: true };
  }

  const flags = { all: false, manual: false, parts: false };

  if (info.perms.calendarAll) {
    flags.all = true;
    flags.manual = true;
    flags.parts = true;
  }
  if (info.perms.calendarManual) flags.manual = true;
  if (info.perms.calendarParts) flags.parts = true;
  if (info.perms.workReportViewAll) {
    flags.all = true;
    flags.manual = true;
    flags.parts = true;
  }
  if (info.perms.workReportViewManual) flags.manual = true;
  if (info.perms.workReportViewParts) flags.parts = true;

  [info.perms.approveScope, info.perms.memberStatusScope].forEach((scope) => {
    if (scope === "all") {
      flags.all = true;
      flags.manual = true;
      flags.parts = true;
      return;
    }
    if (scope === "manual") flags.manual = true;
    if (scope === "parts") flags.parts = true;
  });

  return flags;
}

function getMemberStatusDeptFlags(info) {
  if (info.isMaster || info.perms.canAccessMasterSettings || info.perms.canManageUsers || info.perms.canAccessAdminOps) {
    return { all: true, manual: true, parts: true };
  }

  const flags = { all: false, manual: false, parts: false };
  const scope = ["none", "manual", "parts", "all"].includes(info.perms.memberStatusScope) ? info.perms.memberStatusScope : "none";
  if (scope === "all") {
    flags.all = true;
    flags.manual = true;
    flags.parts = true;
  } else if (scope === "manual") {
    flags.manual = true;
  } else if (scope === "parts") {
    flags.parts = true;
  }
  return flags;
}

function getApprovalDeptFlags(info) {
  if (info.isMaster || info.perms.canAccessMasterSettings || info.perms.canManageUsers) {
    return { all: true, manual: true, parts: true };
  }

  const flags = { all: false, manual: false, parts: false };
  const scope = ["none", "manual", "parts", "all"].includes(info.perms.approveScope) ? info.perms.approveScope : "none";
  if (scope === "all") {
    flags.all = true;
    flags.manual = true;
    flags.parts = true;
  } else if (scope === "manual") {
    flags.manual = true;
  } else if (scope === "parts") {
    flags.parts = true;
  }
  return flags;
}

function getScopedUsers(allUsers, actorUser) {
  const info = getActorScopeInfo(actorUser);
  const visibleDepts = getVisibleDeptFlags(info);
  const safeUsers = allUsers.map(sanitizeUserForClient);
  if (visibleDepts.all) return safeUsers;

  const includeIds = new Set([info.userId]);
  safeUsers.forEach((user) => {
    const role = normalizeRole(user.role);
    if (role === "master" || role === "ceo") includeIds.add(String(user.id));
    if (role === "team_leader" && text(user.dept) === info.dept) includeIds.add(String(user.id));
  });

  if (visibleDepts.manual) {
    safeUsers.forEach((user) => {
      if (text(user.dept) === MANUAL_DEPT) includeIds.add(String(user.id));
    });
  }
  if (visibleDepts.parts) {
    safeUsers.forEach((user) => {
      if (text(user.dept) === PARTS_DEPT) includeIds.add(String(user.id));
    });
  }

  return safeUsers.filter((user) => includeIds.has(String(user.id)));
}

function getScopedRequests(allRequests, actorUser) {
  const info = getActorScopeInfo(actorUser);
  const visibleDepts = getVisibleDeptFlags(info);
  if (visibleDepts.all) return allRequests;

  return allRequests.filter((item) => {
    if (text(item.userId) === info.userId) return true;
    const dept = text(item.dept);
    if (visibleDepts.manual && dept === MANUAL_DEPT) return true;
    if (visibleDepts.parts && dept === PARTS_DEPT) return true;
    return false;
  });
}

function getScopedSituationRequests(allRequests, actorUser) {
  const info = getActorScopeInfo(actorUser);
  if (info.isMaster || info.perms.canAccessSituationBoard) return allRequests;
  return getScopedRequests(allRequests, actorUser);
}

function getScopedUserSpecialLeaves(allLeaves, actorUser, visibleUsers = []) {
  const info = getActorScopeInfo(actorUser);
  const visibleDepts = getMemberStatusDeptFlags(info);
  if (visibleDepts.all) return allLeaves;

  const allowedIds = new Set([info.userId]);
  (Array.isArray(visibleUsers) ? visibleUsers : []).forEach((item) => {
    const itemId = String(item.id || "");
    const itemDept = text(item.dept);
    if (!itemId) return;
    if (itemId === info.userId) {
      allowedIds.add(itemId);
      return;
    }
    if (visibleDepts.manual && itemDept === MANUAL_DEPT) allowedIds.add(itemId);
    if (visibleDepts.parts && itemDept === PARTS_DEPT) allowedIds.add(itemId);
  });
  return allLeaves.filter((item) => allowedIds.has(String(item.userId)));
}

function getScopedMailRoutes(allRoutes, actorUser) {
  const info = getActorScopeInfo(actorUser);
  if (info.isMaster || info.perms.canAccessMasterSettings || info.perms.canManageUsers) {
    return allRoutes;
  }

  const approvalDepts = getApprovalDeptFlags(info);
  const allowedKeys = new Set([`${info.dept}::${info.roleGroup}`]);
  if (approvalDepts.all) {
    return allRoutes;
  }
  if (approvalDepts.manual) {
    allowedKeys.add(`${MANUAL_DEPT}::staff`);
    allowedKeys.add(`${MANUAL_DEPT}::leader`);
  }
  if (approvalDepts.parts) {
    allowedKeys.add(`${PARTS_DEPT}::staff`);
    allowedKeys.add(`${PARTS_DEPT}::leader`);
  }
  return allRoutes.filter((item) => allowedKeys.has(`${text(item.dept)}::${text(item.roleGroup).toLowerCase() === "leader" ? "leader" : "staff"}`));
}

function getScopedSpecialLeaveTypes(allTypes, actorUser) {
  const info = getActorScopeInfo(actorUser);
  if (info.isMaster || info.perms.canAccessMasterSettings || info.perms.canManageUsers || info.perms.canAccessAdminOps) {
    return allTypes;
  }
  return allTypes.filter((item) => !!item.enabled);
}

function getScopedBoardPosts(allPosts, actorUser, visibleUsers = []) {
  const info = getActorScopeInfo(actorUser);
  const masterUser = (Array.isArray(visibleUsers) ? visibleUsers : []).find((user) => normalizeRole(user.role) === "master");
  const boardEnabled = masterUser ? toBool(masterUser.featureBoard, true) : toBool(actorUser && actorUser.featureBoard, true);
  if (!boardEnabled) return [];
  if (!info.isMaster && !toBool(info.perms.boardRead, true)) return [];
  return allPosts.filter((item) => text(item.status || "active") !== "deleted");
}

async function loadData(scope = "all", actorUser = null) {
  const safeScope = ["all", "boot", "rest", "board", "situation"].includes(scope) ? scope : "all";
  let users = [];
  let requests = [];
  let boardPosts = [];
  let holidays = {};
  let specialLeaveTypes = [];
  let userSpecialLeaves = [];
  let mailRoutes = [];

  const includeBootData = safeScope === "all" || safeScope === "boot";
  const includeRestRequests = safeScope === "all" || safeScope === "rest";
  const includeSituationRequests = safeScope === "situation";
  const includeBoardPosts = safeScope === "all" || safeScope === "board";

  if (includeBootData) {
    const rawUsers = await getCollectionDocs("users");
    users = getScopedUsers(rawUsers, actorUser);
    holidays = buildMergedHolidayMap(await getAllHolidayDocs());
    specialLeaveTypes = getScopedSpecialLeaveTypes(buildSpecialLeaveTypes(await getCollectionDocs("specialLeaveTypes")), actorUser);
    const rawUserSpecialLeaves = (await getCollectionDocs("userSpecialLeaves"))
      .map((item) => sanitizeUserSpecialLeaveObject(item, item.userId))
      .filter((item) => item.userId && item.typeKey);
    userSpecialLeaves = getScopedUserSpecialLeaves(rawUserSpecialLeaves, actorUser, users);
    const rawMailRoutes = (await getCollectionDocs("mailRoutes"))
      .map((item) => sanitizeMailRouteObject(item))
      .filter((item) => item.dept && item.toUserId);
    mailRoutes = getScopedMailRoutes(rawMailRoutes, actorUser);
  }

  if (includeRestRequests || includeSituationRequests) {
    const rawRequests = (await getCollectionDocs("requests")).map((item) => ({
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
      specialLeaveGrantId: text(item.specialLeaveGrantId),
      rejectReason: text(item.rejectReason),
      detailReason: text(item.detailReason),
      reportCategory: text(item.reportCategory),
      workDetail: text(item.workDetail),
      requestDept: text(item.requestDept),
      note: text(item.note),
      requestedStartAt: text(item.requestedStartAt),
      requestedEndAt: text(item.requestedEndAt),
      reportedHours: Number(item.reportedHours || item.hours || 0),
      settlementPeriodKey: text(item.settlementPeriodKey),
      settlementStatus: text(item.settlementStatus),
      settlementSubmittedAt: text(item.settlementSubmittedAt),
      settlementSubmittedBy: text(item.settlementSubmittedBy),
      settlementSubmittedByName: text(item.settlementSubmittedByName),
      settlementApprovedAt: text(item.settlementApprovedAt),
      settlementApprovedBy: text(item.settlementApprovedBy),
      settlementApprovedByName: text(item.settlementApprovedByName),
      settlementRejectedAt: text(item.settlementRejectedAt),
      settlementRejectedBy: text(item.settlementRejectedBy),
      settlementRejectedByName: text(item.settlementRejectedByName),
      settlementRejectReason: text(item.settlementRejectReason)
    }));
    requests = includeSituationRequests
      ? getScopedSituationRequests(rawRequests, actorUser)
      : getScopedRequests(rawRequests, actorUser);
  }

  if (includeBoardPosts) {
    const boardVisibleUsers = users.length ? users : getScopedUsers(await getCollectionDocs("users"), actorUser);
    boardPosts = getScopedBoardPosts(
      (await getCollectionDocs("boardPosts")).map((item) => ({
        id: text(item.id),
        title: text(item.title),
        content: text(item.content),
        category: text(item.category || "\uC77C\uBC18"),
        authorId: text(item.authorId),
        authorName: text(item.authorName),
        authorDept: text(item.authorDept),
        isNotice: toBool(item.isNotice, false),
        status: text(item.status || "active"),
        viewCount: Number(item.viewCount || 0),
        createdAt: text(item.createdAt),
        updatedAt: text(item.updatedAt)
      })),
      actorUser,
      boardVisibleUsers
    );
  }

  return {
    result: "success",
    meta: { scopedLoad: true, scope: safeScope },
    data: { users, requests, boardPosts, holidays, specialLeaveTypes, userSpecialLeaves, mailRoutes }
  };
}

module.exports = {
  loadData
};
