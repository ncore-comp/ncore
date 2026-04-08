"use strict";

const crypto = require("crypto");
const { Timestamp } = require("firebase-admin/firestore");
const { admin } = require("../lib/firebase");
const { SESSION_TTL_MS, SESSION_TOUCH_INTERVAL_MS } = require("../config/constants");
const { text } = require("../lib/common");
const { createActionError } = require("../lib/errors");
const { getUserById } = require("../repositories/firestore/usersRepo");
const { getSessionRef } = require("../repositories/firestore/sessionRepo");

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
  return Timestamp.fromMillis(nowMs + SESSION_TTL_MS);
}

function resolveClientIp(req, body = {}) {
  const forwarded = text(req.headers["x-forwarded-for"]);
  if (forwarded) return forwarded.split(",")[0].trim();
  const direct = text(body.clientIp);
  if (direct) return direct;
  return "";
}

async function createSessionForUser(userId, req) {
  const parts = createSessionTokenParts();
  const now = Timestamp.now();
  const expiresAt = buildSessionExpiry(now.toMillis());
  await getSessionRef(parts.sessionId).set({
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

  const sessionRef = getSessionRef(tokenParts.sessionId);
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
      const touchedAt = Timestamp.fromMillis(nowMs);
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
      revokedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    },
    { merge: true }
  );
  return sessionContext;
}

async function requireActor(payload, options = {}) {
  return getSessionContext(payload, options);
}

module.exports = {
  resolveClientIp,
  createSessionForUser,
  getSessionContext,
  revokeSession,
  requireActor
};
