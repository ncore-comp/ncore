"use strict";

const { onRequest } = require("firebase-functions/v2/https");
const { sendJson } = require("./src/lib/response");
const { text } = require("./src/lib/common");
const { handleLogin, handleSessionBoot, handleLogout } = require("./src/handlers/authHandlers");
const { handleLoadData } = require("./src/handlers/loadHandlers");
const { handleLogAccess } = require("./src/handlers/logHandlers");
const { handleUpsertRequest, handleDeleteRequest, handleSubmitWorkReportSettlement, handleApproveWorkReportSettlement, handleRejectWorkReportSettlement } = require("./src/handlers/requestHandlers");
const { handleUpsertUser, handleSaveUsers, handleChangePassword } = require("./src/handlers/userHandlers");
const { handleSaveSpecialLeaveTypes, handleSaveUserSpecialLeaves } = require("./src/handlers/specialLeaveHandlers");
const { handleSaveMailRoutes } = require("./src/handlers/mailHandlers");
const { handleUpsertBoardPost, handleDeleteBoardPost } = require("./src/handlers/boardHandlers");
const { handleLoadAdminOpsData, handleUpsertManualHoliday, handleDeleteManualHoliday, handleSyncAdminPublicHolidays, handleDownloadAccessLogsCsv, handleDownloadSecurityLogsCsv } = require("./src/handlers/adminOpsHandlers");

async function handlePost(req, payload) {
  const action = text(payload.action);
  if (action === "login" || action === "login_boot") return handleLogin(req, payload, action);
  if (action === "session_boot") return handleSessionBoot(req, payload);
  if (action === "load_data") return handleLoadData(req, payload);
  if (action === "logout") return handleLogout(req, payload);
  if (action === "log_access") return handleLogAccess(req, payload);
    if (action === "upsert_request") return handleUpsertRequest(req, payload);
    if (action === "delete_request") return handleDeleteRequest(req, payload);
    if (action === "submit_work_report_settlement") return handleSubmitWorkReportSettlement(req, payload);
    if (action === "approve_work_report_settlement") return handleApproveWorkReportSettlement(req, payload);
    if (action === "reject_work_report_settlement") return handleRejectWorkReportSettlement(req, payload);
  if (action === "upsert_user") return handleUpsertUser(req, payload);
  if (action === "save_special_leave_types") return handleSaveSpecialLeaveTypes(req, payload);
  if (action === "save_user_special_leaves") return handleSaveUserSpecialLeaves(req, payload);
  if (action === "save_mail_routes") return handleSaveMailRoutes(req, payload);
  if (action === "load_admin_ops_data") return handleLoadAdminOpsData(req, payload);
  if (action === "upsert_manual_holiday") return handleUpsertManualHoliday(req, payload);
  if (action === "delete_manual_holiday") return handleDeleteManualHoliday(req, payload);
  if (action === "sync_public_holidays") return handleSyncAdminPublicHolidays(req, payload);
  if (action === "download_access_logs_csv") return handleDownloadAccessLogsCsv(req, payload);
  if (action === "download_security_logs_csv") return handleDownloadSecurityLogsCsv(req, payload);
  if (action === "save_users") return handleSaveUsers(req, payload);
  if (action === "change_password") return handleChangePassword(req, payload);
  if (action === "upsert_board_post") return handleUpsertBoardPost(req, payload);
  if (action === "delete_board_post") return handleDeleteBoardPost(req, payload);
  return { result: "error", message: "지원하지 않는 action" };
}

exports.api = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 60,
    invoker: "public",
    secrets: ["PUBLIC_DATA_API_KEY"]
  },
  async (req, res) => {
    try {
      if (req.method === "GET") {
        if (text(req.query.action) === "load") return sendJson(res, { result: "fail", message: "AUTH_REQUIRED" }, 403);
        return sendJson(res, { result: "error", message: "지원하지 않는 action" });
      }
      if (req.method === "POST") {
        const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
        return sendJson(res, await handlePost(req, payload));
      }
      return sendJson(res, { result: "error", message: "METHOD_NOT_ALLOWED" }, 405);
    } catch (error) {
      return sendJson(res, { result: "error", message: String(error && error.message ? error.message : error) });
    }
  }
);
