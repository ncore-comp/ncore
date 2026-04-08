"use strict";

const { nowKst } = require("../lib/time");
const { text, toBool, normalizeLogSortTimestamp } = require("../lib/common");
const { createActionError } = require("../lib/errors");
const { requireActor, resolveClientIp } = require("./sessionService");
const { canUseAdminOps } = require("../policies/permissionPolicy");
const { listRecentAccessLogs, listAllAccessLogs } = require("../repositories/firestore/accessLogRepo");
const { listRecentSecurityLogs, listAllSecurityLogs } = require("../repositories/firestore/securityLogRepo");
const { getAllHolidayDocs, saveHolidayDoc, deleteHolidayDoc } = require("../repositories/firestore/holidayRepo");
const { sanitizeHolidayObject } = require("./holidayService");
const { writeLog } = require("./logService");
const { writeSecurityLog } = require("./securityLogService");
const { syncPublicHolidays, DEFAULT_SYNC_END_YEAR } = require("./publicHolidaySyncService");

function isIntegratedCompanyHoliday(item = {}) {
  const source = text(item.source).toLowerCase();
  const provider = text(item.provider).toLowerCase();
  const category = text(item.category).toLowerCase();
  const id = text(item.id).toLowerCase();
  return source === "company_fixed" || provider === "ncore-fixed" || category === "company_fixed" || id.startsWith("company-fixed-");
}

function sanitizeAccessLogEntry(item = {}) {
  return {
    id: text(item.id),
    timestamp: text(item.timestamp),
    sortTimestamp: normalizeLogSortTimestamp(item.sortTimestamp || item.timestamp, 0),
    userId: text(item.userId),
    userName: text(item.userName),
    type: text(item.type),
    ip: text(item.ip),
    detail: text(item.detail)
  };
}

function sanitizeManualHolidayInput(raw = {}) {
  const safe = sanitizeHolidayObject({
    id: raw.id,
    date: raw.date,
    name: raw.name,
    source: "manual",
    enabled: raw.enabled
  });
  return {
    id: safe.id || safe.date,
    date: safe.date,
    name: safe.name,
    source: "manual",
    enabled: raw.enabled === undefined ? true : toBool(raw.enabled, true)
  };
}

async function requireAdminOpsActor(payload) {
  const ctx = await requireActor(payload);
  if (!canUseAdminOps(ctx.actorUser)) throw createActionError("ADMIN_OPS_FORBIDDEN");
  return ctx;
}

async function loadAdminOpsData(payload) {
  await requireAdminOpsActor(payload);
  const includeAccessLogs = toBool(payload && payload.includeAccessLogs, false);
  const includeSecurityLogs = toBool(payload && payload.includeSecurityLogs, false);
  const [logs, securityLogs, holidays] = await Promise.all([
    includeAccessLogs ? listRecentAccessLogs(20) : Promise.resolve([]),
    includeSecurityLogs ? listRecentSecurityLogs(20) : Promise.resolve([]),
    getAllHolidayDocs()
  ]);
  const manualHolidays = holidays
    .map((item) => sanitizeHolidayObject(item))
    .filter((item) => item.date && item.name && (item.source === "manual" || isIntegratedCompanyHoliday(item)))
    .sort((a, b) => String(a.date).localeCompare(String(b.date), "ko"));
  const companyHolidayCount = manualHolidays.filter((item) => isIntegratedCompanyHoliday(item)).length;
  const holidaySummary = {
    auto: holidays.filter((item) => text(item.source).toLowerCase() === "auto").length,
    companyFixed: companyHolidayCount,
    manual: manualHolidays.length
  };
  return {
    result: "success",
    accessLogs: includeAccessLogs ? logs.map(sanitizeAccessLogEntry) : null,
    securityLogs: includeSecurityLogs ? securityLogs.map((item) => ({
      id: text(item.id),
      timestamp: text(item.timestamp),
      sortTimestamp: normalizeLogSortTimestamp(item.sortTimestamp || item.timestamp, 0),
      userId: text(item.userId),
      userName: text(item.userName),
      eventType: text(item.eventType),
      severity: text(item.severity),
      ip: text(item.ip),
      userAgentHash: text(item.userAgentHash),
      detail: text(item.detail),
      context: item.context && typeof item.context === "object" && !Array.isArray(item.context) ? item.context : {}
    })) : null,
    accessLogsLoaded: includeAccessLogs,
    securityLogsLoaded: includeSecurityLogs,
    manualHolidays,
    holidaySummary
  };
}

function escapeCsvCell(value) {
  const safe = String(value ?? "");
  if (/[",\r\n]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

function buildAccessLogsCsv(logs = []) {
  const rows = [
    ["timestamp", "userName", "userId", "type", "ip", "detail", "sortTimestamp"]
  ];
  logs.forEach((log) => {
    rows.push([
      text(log.timestamp),
      text(log.userName),
      text(log.userId),
      text(log.type),
      text(log.ip),
      text(log.detail),
      String(normalizeLogSortTimestamp(log.sortTimestamp || log.timestamp, 0))
    ]);
  });
  return "\uFEFF" + rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

function buildSecurityLogsCsv(logs = []) {
  const rows = [
    ["timestamp", "userName", "userId", "eventType", "severity", "ip", "detail", "userAgentHash", "context", "sortTimestamp"]
  ];
  logs.forEach((log) => {
    rows.push([
      text(log.timestamp),
      text(log.userName),
      text(log.userId),
      text(log.eventType),
      text(log.severity),
      text(log.ip),
      text(log.detail),
      text(log.userAgentHash),
      text(JSON.stringify(log.context || {})),
      String(normalizeLogSortTimestamp(log.sortTimestamp || log.timestamp, 0))
    ]);
  });
  return "\uFEFF" + rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

async function upsertManualHoliday(req, payload) {
  const { actor, actorUser } = await requireAdminOpsActor(payload);
  const input = sanitizeManualHolidayInput(payload.data || {});
  if (!input.date) return { result: "fail", message: "HOLIDAY_DATE_REQUIRED" };
  if (!input.name) return { result: "fail", message: "HOLIDAY_NAME_REQUIRED" };
  const docId = text(input.id || input.date);
  await saveHolidayDoc(docId, { ...input, id: docId, updatedAt: nowKst() }, { merge: true });
  await writeLog(actor.id, actor.name, "ManualHolidaySave", resolveClientIp(req, payload), `${docId}:${input.name}`);
  await writeSecurityLog(req, payload, {
    userId: actor.id,
    userName: actor.name,
    eventType: "MANUAL_HOLIDAY_SAVE",
    severity: "info",
    detail: `${docId}:${input.name}`,
    context: {
      holidayId: docId,
      date: input.date,
      name: input.name
    }
  });
  return { result: "success", holiday: { ...input, id: docId } };
}

async function deleteManualHoliday(req, payload) {
  const { actor } = await requireAdminOpsActor(payload);
  const holidayId = text(payload.id);
  if (!holidayId) return { result: "fail", message: "HOLIDAY_ID_REQUIRED" };
  const all = await getAllHolidayDocs();
  const target = all.find((item) => text(item.id) === holidayId);
  const safeTarget = sanitizeHolidayObject(target || {});
  if (!target || safeTarget.source !== "manual") {
    return { result: "fail", message: "HOLIDAY_DELETE_FORBIDDEN" };
  }
  await deleteHolidayDoc(holidayId);
  await writeLog(actor.id, actor.name, "ManualHolidayDelete", resolveClientIp(req, payload), holidayId);
  await writeSecurityLog(req, payload, {
    userId: actor.id,
    userName: actor.name,
    eventType: "MANUAL_HOLIDAY_DELETE",
    severity: "warn",
    detail: holidayId,
    context: {
      holidayId
    }
  });
  return { result: "success" };
}

async function syncAdminPublicHolidays(req, payload) {
  const { actor } = await requireAdminOpsActor(payload);
  const currentYear = new Date().getFullYear();
  const startYear = Number(payload.startYear || currentYear);
  const endYear = Number(payload.endYear || DEFAULT_SYNC_END_YEAR);
  const syncResult = await syncPublicHolidays(startYear, endYear);
  await writeLog(
    actor.id,
    actor.name,
    "ManualHolidaySync",
    resolveClientIp(req, payload),
    `${syncResult.startYear}-${syncResult.endYear}|auto:${syncResult.autoCount}|company:${syncResult.companyFixedCount}`
  );
  await writeSecurityLog(req, payload, {
    userId: actor.id,
    userName: actor.name,
    eventType: "PUBLIC_HOLIDAY_SYNC",
    severity: "warn",
    detail: `${syncResult.startYear}-${syncResult.endYear}`,
    context: {
      startYear: syncResult.startYear,
      endYear: syncResult.endYear,
      autoCount: syncResult.autoCount,
      companyFixedCount: syncResult.companyFixedCount,
      manualIntegratedCount: syncResult.manualIntegratedCount
    }
  });
  return syncResult;
}

async function downloadAccessLogsCsv(req, payload) {
  const { actor } = await requireAdminOpsActor(payload);
  const logs = await listAllAccessLogs();
  const csv = buildAccessLogsCsv(logs.map(sanitizeAccessLogEntry));
  await writeLog(actor.id, actor.name, "AccessLogCsvDownload", resolveClientIp(req, payload), `rows:${logs.length}`);
  await writeSecurityLog(req, payload, {
    userId: actor.id,
    userName: actor.name,
    eventType: "ACCESS_LOG_CSV_DOWNLOAD",
    severity: "warn",
    detail: `rows:${logs.length}`,
    context: {
      rowCount: logs.length
    }
  });
  return {
    result: "success",
    fileName: `accessLogs_${nowKst().replace(/[: ]/g, "-")}.csv`,
    mimeType: "text/csv;charset=utf-8",
    csv,
    rowCount: logs.length
  };
}

async function downloadSecurityLogsCsv(req, payload) {
  const { actor } = await requireAdminOpsActor(payload);
  const logs = await listAllSecurityLogs();
  const csv = buildSecurityLogsCsv(logs);
  await writeLog(actor.id, actor.name, "SecurityLogCsvDownload", resolveClientIp(req, payload), `rows:${logs.length}`);
  await writeSecurityLog(req, payload, {
    userId: actor.id,
    userName: actor.name,
    eventType: "SECURITY_LOG_CSV_DOWNLOAD",
    severity: "warn",
    detail: `rows:${logs.length}`,
    context: {
      rowCount: logs.length
    }
  });
  return {
    result: "success",
    fileName: `securityLogs_${nowKst().replace(/[: ]/g, "-")}.csv`,
    mimeType: "text/csv;charset=utf-8",
    csv,
    rowCount: logs.length
  };
}

module.exports = {
  loadAdminOpsData,
  upsertManualHoliday,
  deleteManualHoliday,
  syncAdminPublicHolidays,
  downloadAccessLogsCsv,
  downloadSecurityLogsCsv
};
