"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { getUserById } = require("../repositories/firestore/usersRepo");
const { text, sanitizeUserForClient } = require("../lib/common");
const { verifyPassword } = require("../lib/password");
const { LOGIN_FAIL_LIMIT, LOGIN_BLOCK_MS } = require("../config/constants");
const { getLoginAttemptRef } = require("../repositories/firestore/loginAttemptRepo");
const { loadData } = require("./loadService");
const { writeLog } = require("./logService");
const { writeSecurityLog } = require("./securityLogService");
const { createSessionForUser, requireActor, revokeSession, resolveClientIp } = require("./sessionService");

async function login(req, payload, action) {
  const loginId = text(payload.id);
  const clientIp = resolveClientIp(req, payload);
  const attemptRef = getLoginAttemptRef(loginId, clientIp);
  const attemptSnap = await attemptRef.get();
  const attemptData = attemptSnap.exists ? attemptSnap.data() || {} : {};
  const blockedUntilMs =
    attemptData.blockedUntil && typeof attemptData.blockedUntil.toMillis === "function"
      ? attemptData.blockedUntil.toMillis()
      : 0;
  if (blockedUntilMs && blockedUntilMs > Date.now()) {
    await writeSecurityLog(req, payload, {
      userId: loginId,
      userName: "",
      eventType: "LOGIN_BLOCKED",
      severity: "high",
      detail: `retryAfterSec:${Math.max(1, Math.ceil((blockedUntilMs - Date.now()) / 1000))}`,
      context: {
        loginId,
        blockedUntilMs
      }
    });
    return {
      result: "fail",
      message: "LOGIN_BLOCKED",
      retryAfterSec: Math.max(1, Math.ceil((blockedUntilMs - Date.now()) / 1000))
    };
  }

  const user = await getUserById(payload.id);
  const loginFailed = !user || !verifyPassword(payload.password, user);
  if (loginFailed) {
    const previousFailCount = blockedUntilMs && blockedUntilMs <= Date.now()
      ? 0
      : Number(attemptData.failCount || 0);
    const nextFailCount = previousFailCount + 1;
    const nextBlockedUntil = nextFailCount >= LOGIN_FAIL_LIMIT
      ? Timestamp.fromMillis(Date.now() + LOGIN_BLOCK_MS)
      : null;
    await attemptRef.set({
      id: attemptRef.id,
      loginId,
      ip: clientIp,
      failCount: nextFailCount,
      lastFailedAt: Timestamp.now(),
      blockedUntil: nextBlockedUntil,
      updatedAt: Timestamp.now()
    }, { merge: true });
    await writeSecurityLog(req, payload, {
      userId: user ? text(user.id) : loginId,
      userName: user ? text(user.name) : "",
      eventType: "LOGIN_FAILED",
      severity: "warn",
      detail: `failCount:${nextFailCount}`,
      context: {
        loginId,
        failCount: nextFailCount
      }
    });
    return {
      result: "fail",
      message: "LOGIN_INVALID",
      failCount: nextFailCount,
      failLimit: LOGIN_FAIL_LIMIT
    };
  }
  if (attemptSnap.exists) {
    await attemptRef.delete().catch(() => null);
  }
  const safeUser = sanitizeUserForClient(user);
  const session = await createSessionForUser(safeUser.id, req);
  await writeLog(safeUser.id, safeUser.name, "Login", clientIp, "login_success");
  if (action === "login_boot") {
    const boot = await loadData("boot", user);
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

async function sessionBoot(payload) {
  const { actorUser } = await requireActor(payload);
  const boot = await loadData("boot", actorUser);
  return {
    result: "success",
    user: sanitizeUserForClient(actorUser),
    meta: boot.meta,
    data: boot.data
  };
}

async function logout(req, payload) {
  const { actor, actorUser } = await revokeSession(payload);
  await writeLog(actor.id, actor.name, "Logout", resolveClientIp(req, payload), text(payload.reason || "manual"));
  return {
    result: "success",
    user: sanitizeUserForClient(actorUser)
  };
}

module.exports = {
  login,
  sessionBoot,
  logout
};
