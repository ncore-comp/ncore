"use strict";

const { normalizeRole, normalizePermissions, text, buildSpecialLeaveTypes, sanitizeUserSpecialLeaveObject } = require("../lib/common");
const { getUserById } = require("../repositories/firestore/usersRepo");
const {
  getAllSpecialLeaveTypes,
  replaceSpecialLeaveTypes,
  getUserSpecialLeavesByUserId,
  replaceUserSpecialLeaves
} = require("../repositories/firestore/specialLeaveRepo");
const { requireActor, resolveClientIp } = require("./sessionService");
const { writeLog } = require("./logService");

async function saveSpecialLeaveTypes(req, payload) {
  const { actor, actorUser } = await requireActor(payload);
  if (!actorUser || normalizeRole(actorUser.role) !== "master") {
    return { result: "fail", message: "MASTER_ONLY" };
  }

  const types = buildSpecialLeaveTypes(payload.types || []);
  if (!types.length) {
    return { result: "fail", message: "SPECIAL_LEAVE_TYPES_EMPTY_FORBIDDEN" };
  }

  for (const type of types) {
    const isBusinessDays = text(type.dayCountMode) === "business_days";
    if (!isBusinessDays) {
      type.expiryBasis = "";
      type.expiryDirection = "";
      type.expiryDays = 0;
      continue;
    }
    type.expiryBasis = "event_date";
    if (!text(type.expiryDirection) || Number(type.expiryDays || 0) <= 0) {
      return { result: "fail", message: "SPECIAL_LEAVE_EXPIRY_RULE_REQUIRED" };
    }
  }

  await replaceSpecialLeaveTypes(types);
  await writeLog(actor.id, actor.name, "SpecialLeaveTypeSave", resolveClientIp(req, payload), String(types.length));
  return { result: "success", types };
}

async function saveUserSpecialLeaves(req, payload) {
  const { actor, actorUser } = await requireActor(payload);
  const targetUserId = text(payload.userId);
  if (!actorUser || !targetUserId) {
    return { result: "fail", message: "INVALID_SPECIAL_LEAVE_REQUEST" };
  }

  const actorRole = normalizeRole(actorUser.role);
  const actorPerms = normalizePermissions(actorUser.permissions || {}, actorRole, actorUser.dept);
  if (!(actorRole === "master" || actorPerms.canManageUsers)) {
    return { result: "fail", message: "FORBIDDEN_USER_MANAGE" };
  }

  const targetUser = await getUserById(targetUserId);
  if (!targetUser) {
    return { result: "fail", message: "REQUEST_USER_NOT_FOUND" };
  }
  if (actorRole !== "master" && normalizeRole(targetUser.role) === "master") {
    return { result: "fail", message: "MASTER_TARGET_FORBIDDEN" };
  }

  const allTypes = await getAllSpecialLeaveTypes();
  const typeMap = new Map(allTypes.map((item) => [text(item.typeKey), item]));
  const cleanLeaves = (Array.isArray(payload.leaves) ? payload.leaves : [])
    .map((item) => sanitizeUserSpecialLeaveObject(item, targetUserId))
    .filter((item) => item.typeKey && typeMap.has(item.typeKey))
    .filter((item) => item.grantedHours > 0 || item.usedHours > 0 || item.note);

  const seenGrantIds = new Set();
  for (const item of cleanLeaves) {
    if (!item.grantId) {
      return { result: "fail", message: "SPECIAL_LEAVE_GRANT_ID_REQUIRED" };
    }
    if (seenGrantIds.has(item.grantId)) {
      return { result: "fail", message: "SPECIAL_LEAVE_GRANT_ID_DUPLICATED" };
    }
    seenGrantIds.add(item.grantId);

    const typeMeta = typeMap.get(item.typeKey);
    const requiresEventDate =
      text(typeMeta && typeMeta.dayCountMode) === "business_days" &&
      text(typeMeta && typeMeta.expiryBasis) === "event_date" &&
      !!text(typeMeta && typeMeta.expiryDirection) &&
      Number(typeMeta && typeMeta.expiryDays || 0) > 0;
    if (requiresEventDate && !text(item.eventDate)) {
      return { result: "fail", message: "SPECIAL_LEAVE_EVENT_DATE_REQUIRED" };
    }
  }

  await replaceUserSpecialLeaves(targetUserId, cleanLeaves);
  const leaves = await getUserSpecialLeavesByUserId(targetUserId);
  await writeLog(actor.id, actor.name, "UserSpecialLeaveSave", resolveClientIp(req, payload), targetUserId);
  return { result: "success", leaves };
}

module.exports = {
  saveSpecialLeaveTypes,
  saveUserSpecialLeaves
};
