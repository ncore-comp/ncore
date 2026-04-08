"use strict";

const { nowKst } = require("../lib/time");
const { text, cleanLogType, normalizeLogSortTimestamp } = require("../lib/common");
const { addAccessLog } = require("../repositories/firestore/accessLogRepo");

async function writeLog(userId, userName, type, ip, detail) {
  const now = nowKst();
  await addAccessLog({
    timestamp: now,
    sortTimestamp: normalizeLogSortTimestamp(now, Date.now()),
    userId: text(userId),
    userName: text(userName),
    type: cleanLogType(type || "Action"),
    ip: text(ip),
    detail: text(detail)
  });
}

module.exports = {
  writeLog
};
