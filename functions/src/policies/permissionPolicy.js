"use strict";

const { normalizeRole, normalizePermissions, text } = require("../lib/common");

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

function canUseAdminOps(actorUser) {
  if (!actorUser) return false;
  const { actorRole, actorPerms } = getActorAccess(actorUser);
  return actorRole === "master" || actorPerms.canAccessMasterSettings || actorPerms.canAccessAdminOps;
}

function canManageTargetUserForActor(actorUser, targetUser) {
  if (!actorUser || !targetUser) return false;
  const { actorRole, actorPerms } = getActorAccess(actorUser);
  const targetRole = normalizeRole(targetUser.role);
  if (targetRole === "master" && actorRole !== "master") return false;
  if (actorRole === "master") return true;
  if (actorPerms.canAccessMasterSettings || actorPerms.canManageUsers || actorPerms.canAccessAdminOps) return true;
  return text(actorUser.id) === text(targetUser.id);
}

module.exports = {
  getActorAccess,
  canApproveRequestForActor,
  canUseAdminOps,
  canManageTargetUserForActor
};
