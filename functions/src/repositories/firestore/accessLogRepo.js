"use strict";

const { store } = require("../../lib/firebase");
const { normalizeLogSortTimestamp } = require("../../lib/common");

async function addAccessLog(entry) {
  await store.collection("accessLogs").add(entry);
}

async function listRecentAccessLogs(limit = 100) {
  const safeLimit = Math.max(1, Math.min(300, Number(limit || 100) || 100));
  const snap = await store.collection("accessLogs").orderBy("sortTimestamp", "desc").limit(safeLimit).get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => normalizeLogSortTimestamp(b.sortTimestamp || b.timestamp) - normalizeLogSortTimestamp(a.sortTimestamp || a.timestamp));
}

async function listAllAccessLogs() {
  const snap = await store.collection("accessLogs").orderBy("sortTimestamp", "desc").get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => normalizeLogSortTimestamp(b.sortTimestamp || b.timestamp) - normalizeLogSortTimestamp(a.sortTimestamp || a.timestamp));
}

module.exports = {
  addAccessLog,
  listRecentAccessLogs,
  listAllAccessLogs
};
