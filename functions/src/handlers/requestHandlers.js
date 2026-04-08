"use strict";

const { upsertRequest, deleteRequest, submitWorkReportSettlement, approveWorkReportSettlement, rejectWorkReportSettlement } = require("../services/requestService");

async function handleUpsertRequest(req, payload) {
  return upsertRequest(req, payload);
}

async function handleDeleteRequest(req, payload) {
  return deleteRequest(req, payload);
}

async function handleSubmitWorkReportSettlement(req, payload) {
  return submitWorkReportSettlement(req, payload);
}

async function handleApproveWorkReportSettlement(req, payload) {
  return approveWorkReportSettlement(req, payload);
}

async function handleRejectWorkReportSettlement(req, payload) {
  return rejectWorkReportSettlement(req, payload);
}

module.exports = {
  handleUpsertRequest,
  handleDeleteRequest,
  handleSubmitWorkReportSettlement,
  handleApproveWorkReportSettlement,
  handleRejectWorkReportSettlement
};
