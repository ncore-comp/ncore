"use strict";

const { text, normalizeRequestDateKey } = require("../lib/common");
const { nowKst } = require("../lib/time");
const { canApproveRequestForActor, canManageTargetUserForActor } = require("./permissionPolicy");

function canRequesterCancelApprovedRequest(requestData) {
  const endDate = normalizeRequestDateKey(requestData && (requestData.endDate || requestData.startDate));
  if (!endDate) return false;
  return endDate >= nowKst().slice(0, 10);
}

function isReportRequest(input = {}) {
  const safeType = text(input.type);
  const safeCategory = text(input.reportCategory);
  return ["잔업", "특근"].includes(safeType) || ["overtime", "holiday_work"].includes(safeCategory);
}

function getRequestMutationMode(actorUser, currentRequest, nextStatus, targetUserId) {
  const actorId = text(actorUser && actorUser.id);
  const actorRole = text(actorUser && actorUser.role);
  const safeNextStatus = text(nextStatus || "pending") || "pending";

  if (!currentRequest) {
    const targetUser = targetUserId && typeof targetUserId === "object" ? targetUserId : { id: targetUserId };
    if (actorId && actorId === text(targetUser.id || targetUserId)) return "create";
    if (actorRole === "master") return "admin_create";
    if (canManageTargetUserForActor(actorUser, targetUser)) return "admin_create";
    return "";
  }

  const currentStatus = text(currentRequest.status);
  const isSelfRequest = actorId && actorId === text(currentRequest.userId);

  if (isSelfRequest) {
    if (currentStatus === "pending" && safeNextStatus === "pending") return "self_edit";
    if (currentStatus === "pending" && safeNextStatus === "cancelled") return "self_cancel_pending";
    if (currentStatus === "approved" && safeNextStatus === "cancel_requested" && canRequesterCancelApprovedRequest(currentRequest)) {
      return "self_cancel_request";
    }
  }

  if (canApproveRequestForActor(actorUser, currentRequest)) {
    if (currentStatus === "pending" && safeNextStatus === "approved") return "approve";
    if (currentStatus === "pending" && safeNextStatus === "rejected") return "reject";
    if (currentStatus === "cancel_requested" && safeNextStatus === "cancelled") return "cancel_approve";
    if (currentStatus === "cancel_requested" && safeNextStatus === "approved") return "cancel_reject";
  }

  if (currentRequest) {
    const targetUser = {
      id: text(currentRequest.userId),
      name: text(currentRequest.userName),
      dept: text(currentRequest.dept),
      role: text(currentRequest.role)
    };
    if (
      canManageTargetUserForActor(actorUser, targetUser) &&
      currentStatus !== "cancelled" &&
      safeNextStatus === currentStatus
    ) {
      return "admin_edit";
    }
  }

  return "";
}

function buildRequestPayloadForWrite(input, options = {}) {
  const currentRequest = options.currentRequest || null;
  const targetUser = options.targetUser || null;
  const nextStatus = text(input.status || (currentRequest && currentRequest.status) || "pending") || "pending";

  const base = currentRequest
      ? {
        id: text(currentRequest.id),
        userId: text(currentRequest.userId),
        employeeNo: text(currentRequest.employeeNo),
        userName: text(currentRequest.userName),
        dept: text(currentRequest.dept),
        role: text(currentRequest.role),
        type: text(currentRequest.type),
        startDate: text(currentRequest.startDate),
        endDate: text(currentRequest.endDate || currentRequest.startDate),
        hours: Number(currentRequest.hours || 0),
        timeRange: text(currentRequest.timeRange),
        reason: text(currentRequest.reason),
        status: text(currentRequest.status),
        timestamp: text(currentRequest.timestamp),
        specialLeaveTypeKey: text(currentRequest.specialLeaveTypeKey),
        specialLeaveTypeLabel: text(currentRequest.specialLeaveTypeLabel),
        specialLeaveGrantId: text(currentRequest.specialLeaveGrantId),
        rejectReason: text(currentRequest.rejectReason),
        detailReason: text(currentRequest.detailReason),
        reportCategory: text(currentRequest.reportCategory),
        workDetail: text(currentRequest.workDetail),
        requestDept: text(currentRequest.requestDept),
        note: text(currentRequest.note),
        requestedStartAt: text(currentRequest.requestedStartAt),
        requestedEndAt: text(currentRequest.requestedEndAt),
        reportedHours: Number(currentRequest.reportedHours || currentRequest.hours || 0)
      }
      : {
        id: text(input.id),
        userId: text(targetUser && targetUser.id),
        employeeNo: text((targetUser && targetUser.employeeNo) || input.employeeNo),
        userName: text(targetUser && targetUser.name),
        dept: text(targetUser && targetUser.dept),
        role: text(targetUser && targetUser.role),
        type: text(input.type),
        startDate: text(input.startDate),
        endDate: text(input.endDate || input.startDate),
        hours: Number(input.hours || 0),
        timeRange: text(input.timeRange),
        reason: text(input.reason),
        status: nextStatus,
        timestamp: text(input.timestamp) || nowKst(),
        specialLeaveTypeKey: text(input.specialLeaveTypeKey),
        specialLeaveTypeLabel: text(input.specialLeaveTypeLabel),
        specialLeaveGrantId: text(input.specialLeaveGrantId),
        rejectReason: text(input.rejectReason),
        detailReason: text(input.detailReason),
        reportCategory: text(input.reportCategory),
        workDetail: text(input.workDetail),
        requestDept: text(input.requestDept),
        note: text(input.note),
        requestedStartAt: text(input.requestedStartAt),
        requestedEndAt: text(input.requestedEndAt),
        reportedHours: Number(input.reportedHours || input.hours || 0)
      };

  const mutationMode = text(options.mutationMode);
  if (mutationMode === "self_edit") {
    return {
      ...base,
      type: text(input.type),
      startDate: text(input.startDate),
      endDate: text(input.endDate || input.startDate),
      hours: Number(input.hours || 0),
      employeeNo: text((targetUser && targetUser.employeeNo) || input.employeeNo || base.employeeNo),
      timeRange: text(input.timeRange),
      reason: text(input.reason),
      status: "pending",
      timestamp: text(currentRequest && currentRequest.timestamp) || text(input.timestamp) || nowKst(),
      specialLeaveTypeKey: text(input.specialLeaveTypeKey),
      specialLeaveTypeLabel: text(input.specialLeaveTypeLabel),
      specialLeaveGrantId: text(input.specialLeaveGrantId),
      rejectReason: "",
      detailReason: text(input.detailReason),
      reportCategory: text(input.reportCategory),
      workDetail: text(input.workDetail),
      requestDept: text(input.requestDept),
      note: text(input.note),
      requestedStartAt: text(input.requestedStartAt),
      requestedEndAt: text(input.requestedEndAt),
      reportedHours: Number(input.reportedHours || input.hours || 0)
    };
  }

  if (mutationMode === "admin_edit") {
    return {
      ...base,
      type: text(input.type),
      startDate: text(input.startDate),
      endDate: text(input.endDate || input.startDate),
      hours: Number(input.hours || 0),
      employeeNo: text((targetUser && targetUser.employeeNo) || input.employeeNo || base.employeeNo),
      timeRange: text(input.timeRange),
      reason: text(input.reason),
      status: text(currentRequest && currentRequest.status) || nextStatus,
      timestamp: text(currentRequest && currentRequest.timestamp) || text(input.timestamp) || nowKst(),
      specialLeaveTypeKey: text(input.specialLeaveTypeKey),
      specialLeaveTypeLabel: text(input.specialLeaveTypeLabel),
      specialLeaveGrantId: text(input.specialLeaveGrantId),
      rejectReason: text(currentRequest && currentRequest.rejectReason),
      detailReason: text(input.detailReason),
      reportCategory: text(input.reportCategory || currentRequest.reportCategory),
      workDetail: text(input.workDetail),
      requestDept: text(input.requestDept),
      note: text(input.note),
      requestedStartAt: text(input.requestedStartAt),
      requestedEndAt: text(input.requestedEndAt),
      reportedHours: Number(input.reportedHours || input.hours || 0)
    };
  }

  if (mutationMode === "admin_create") {
    return {
      ...base,
      type: text(input.type),
      startDate: text(input.startDate),
      endDate: text(input.endDate || input.startDate),
      hours: Number(input.hours || 0),
      timeRange: text(input.timeRange),
      reason: text(input.reason),
      status: isReportRequest(input) ? "reported" : "approved",
      timestamp: text(input.timestamp) || nowKst(),
      specialLeaveTypeKey: text(input.specialLeaveTypeKey),
      specialLeaveTypeLabel: text(input.specialLeaveTypeLabel),
      specialLeaveGrantId: text(input.specialLeaveGrantId),
      rejectReason: "",
      detailReason: text(input.detailReason),
      reportCategory: text(input.reportCategory),
      workDetail: text(input.workDetail),
      requestDept: text(input.requestDept),
      note: text(input.note),
      requestedStartAt: text(input.requestedStartAt),
      requestedEndAt: text(input.requestedEndAt),
      reportedHours: Number(input.reportedHours || input.hours || 0)
    };
  }

  if (mutationMode === "approve" || mutationMode === "cancel_approve") {
    return {
      ...base,
      status: mutationMode === "approve" ? "approved" : "cancelled",
      rejectReason: "",
      detailReason: text(currentRequest && currentRequest.detailReason)
    };
  }

  if (mutationMode === "reject") {
    return {
      ...base,
      status: "rejected",
      rejectReason: text(input.rejectReason),
      detailReason: text(currentRequest && currentRequest.detailReason)
    };
  }

  if (mutationMode === "cancel_reject") {
    return {
      ...base,
      status: "approved",
      rejectReason: "",
      detailReason: text(currentRequest && currentRequest.detailReason)
    };
  }

  if (mutationMode === "self_cancel_pending") {
    return {
      ...base,
      status: "cancelled",
      rejectReason: "",
      detailReason: text(currentRequest && currentRequest.detailReason)
    };
  }

  if (mutationMode === "self_cancel_request") {
    return {
      ...base,
      status: "cancel_requested",
      rejectReason: "",
      detailReason: text(currentRequest && currentRequest.detailReason)
    };
  }

  return {
    ...base,
    status: nextStatus
  };
}

module.exports = {
  canRequesterCancelApprovedRequest,
  getRequestMutationMode,
  buildRequestPayloadForWrite
};
