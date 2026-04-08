"use strict";

const { nowKst } = require("../lib/time");
const { text, normalizeRole, normalizePermissions, toBool } = require("../lib/common");
const { getBoardPostById, saveBoardPost } = require("../repositories/firestore/boardRepo");
const { getAllUsers } = require("../repositories/firestore/usersRepo");
const { requireActor, resolveClientIp } = require("./sessionService");
const { writeLog } = require("./logService");

async function isBoardGloballyEnabled() {
  const users = await getAllUsers();
  const masterUser = users.find((user) => normalizeRole(user.role) === "master");
  return masterUser ? toBool(masterUser.featureBoard, true) : true;
}

async function upsertBoardPost(req, payload) {
  const { actor, actorUser } = await requireActor(payload);
  const input = payload.data || {};
  const postId = text(input.id || Date.now());
  const now = nowKst();
  const existingPost = await getBoardPostById(postId);
  const actorRole = normalizeRole(actorUser.role);
  const actorPerms = normalizePermissions(actorUser.permissions || {}, actorRole, actorUser.dept);
  if (!(await isBoardGloballyEnabled())) {
    return { result: "fail", message: "BOARD_DISABLED" };
  }
  const canWriteBoard = actorRole === "master" || toBool(actorPerms.boardWrite, false);
  if (!canWriteBoard) {
    return { result: "fail", message: "BOARD_WRITE_FORBIDDEN" };
  }
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
  await saveBoardPost(postId, docData, { merge: true });
  await writeLog(actor.id, actor.name, existingPost ? "BoardPostUpdate" : "BoardPostCreate", resolveClientIp(req, payload), postId);
  return { result: "success", id: postId };
}

async function deleteBoardPost(req, payload) {
  const { actor, actorUser } = await requireActor(payload);
  const targetId = text(payload.id);
  const existingPost = await getBoardPostById(targetId);
  if (!existingPost) return { result: "fail", message: "BOARD_POST_NOT_FOUND" };
  const actorRole = normalizeRole(actorUser.role);
  const actorPerms = normalizePermissions(actorUser.permissions || {}, actorRole, actorUser.dept);
  if (!(await isBoardGloballyEnabled())) {
    return { result: "fail", message: "BOARD_DISABLED" };
  }
  const canWriteBoard = actorRole === "master" || toBool(actorPerms.boardWrite, false);
  if (!(canWriteBoard && (actorRole === "master" || text(existingPost.authorId) === text(actorUser.id)))) {
    return { result: "fail", message: "BOARD_POST_DELETE_FORBIDDEN" };
  }
  await saveBoardPost(targetId, { status: "deleted", updatedAt: nowKst() }, { merge: true });
  await writeLog(actor.id, actor.name, "BoardPostDelete", resolveClientIp(req, payload), targetId);
  return { result: "success" };
}

module.exports = {
  upsertBoardPost,
  deleteBoardPost
};
