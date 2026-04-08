"use strict";

const { loadAdminOpsData, upsertManualHoliday, deleteManualHoliday, syncAdminPublicHolidays, downloadAccessLogsCsv, downloadSecurityLogsCsv } = require("../services/adminOpsService");

async function handleLoadAdminOpsData(req, payload) {
  return loadAdminOpsData(payload);
}

async function handleUpsertManualHoliday(req, payload) {
  return upsertManualHoliday(req, payload);
}

async function handleDeleteManualHoliday(req, payload) {
  return deleteManualHoliday(req, payload);
}

async function handleSyncAdminPublicHolidays(req, payload) {
  return syncAdminPublicHolidays(req, payload);
}

async function handleDownloadAccessLogsCsv(req, payload) {
  return downloadAccessLogsCsv(req, payload);
}

async function handleDownloadSecurityLogsCsv(req, payload) {
  return downloadSecurityLogsCsv(req, payload);
}

module.exports = {
  handleLoadAdminOpsData,
  handleUpsertManualHoliday,
  handleDeleteManualHoliday,
  handleSyncAdminPublicHolidays,
  handleDownloadAccessLogsCsv,
  handleDownloadSecurityLogsCsv
};
