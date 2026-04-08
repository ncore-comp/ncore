"use strict";

const crypto = require("crypto");
const { nowKst } = require("../lib/time");
const { text, normalizeLogSortTimestamp } = require("../lib/common");
const { addSecurityLog } = require("../repositories/firestore/securityLogRepo");
const { resolveClientIp } = require("./sessionService");

function normalizeSeverity(value) {
  const safe = text(value).toLowerCase();
  return ["info", "warn", "high"].includes(safe) ? safe : "info";
}

function cleanEventType(value) {
  const safe = text(value);
  return safe ? safe.replace(/[^\w\-:]/g, "_").slice(0, 60) : "SECURITY_EVENT";
}

function hashUserAgent(value) {
  const safe = text(value);
  if (!safe) return "";
  return crypto.createHash("sha256").update(safe).digest("hex");
}

function sanitizeContext(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out = {};
  Object.entries(input).forEach(([key, value]) => {
    const safeKey = text(key).replace(/[^\w\-:]/g, "_").slice(0, 40);
    if (!safeKey) return;
    if (value === null || value === undefined) {
      out[safeKey] = "";
      return;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      out[safeKey] = value;
      return;
    }
    if (typeof value === "string") {
      out[safeKey] = text(value).slice(0, 300);
      return;
    }
    out[safeKey] = text(JSON.stringify(value)).slice(0, 300);
  });
  return out;
}

async function writeSecurityLog(req, payload, options = {}) {
  const now = nowKst();
  const userAgent = text((req && req.headers && req.headers["user-agent"]) || "");
  const entry = {
    timestamp: now,
    sortTimestamp: normalizeLogSortTimestamp(now, Date.now()),
    userId: text(options.userId),
    userName: text(options.userName),
    eventType: cleanEventType(options.eventType),
    severity: normalizeSeverity(options.severity),
    ip: text(options.ip || resolveClientIp(req, payload)),
    userAgentHash: hashUserAgent(userAgent),
    detail: text(options.detail).slice(0, 500),
    context: sanitizeContext(options.context)
  };
  await addSecurityLog(entry);
}

module.exports = {
  writeSecurityLog,
  hashUserAgent
};
