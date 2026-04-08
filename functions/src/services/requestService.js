"use strict";

const { store } = require("../lib/firebase");
const { nowKst } = require("../lib/time");
const { createActionError } = require("../lib/errors");
const { text, normalizeRequestDateKey, normalizeRole, normalizeWorkShift } = require("../lib/common");
const { getUserById } = require("../repositories/firestore/usersRepo");
const { getRequestRef, getRequestById, deleteRequestById } = require("../repositories/firestore/requestsRepo");
const { requireActor, resolveClientIp } = require("./sessionService");
const { writeLog } = require("./logService");
const { writeSecurityLog } = require("./securityLogService");
const { getRequestMutationMode, buildRequestPayloadForWrite } = require("../policies/requestPolicy");
const { canManageTargetUserForActor, canApproveRequestForActor } = require("../policies/permissionPolicy");

function isTimeOffType(type) {
  const safe = text(type);
  return safe === "시간차(퇴근)" || safe === "시간차(외출)";
}

function isTimeOffOutType(type) {
  return text(type) === "시간차(외출)";
}

function parseTimeRange(timeRange) {
  const match = text(timeRange).match(/^(\d{1,2}):00~(\d{1,2}):00$/);
  if (!match) return null;
  const startHour = Number(match[1]);
  const endHour = Number(match[2]);
  if (!Number.isFinite(startHour) || !Number.isFinite(endHour) || startHour >= endHour) return null;
  return {
    startMinutes: startHour * 60,
    endMinutes: endHour * 60
  };
}

function hasTimeRangeOverlap(left, right) {
  if (!left || !right) return true;
  return left.startMinutes < right.endMinutes && right.startMinutes < left.endMinutes;
}

function parseWorkShiftRange(shiftText) {
  const match = text(shiftText).match(/^(\d{2}):00\s*~\s*(\d{2}):00$/);
  if (!match) return null;
  const startHour = Number(match[1]);
  const endHour = Number(match[2]);
  if (!Number.isFinite(startHour) || !Number.isFinite(endHour) || startHour >= endHour) return null;
  return { startHour, endHour };
}

function getWorkShiftKeyByDate(dateStr) {
  const match = text(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const month = match ? Number(match[2]) : 1;
  if (month <= 3) return "workQ1";
  if (month <= 6) return "workQ2";
  if (month <= 9) return "workQ3";
  return "workQ4";
}

function getWorkShiftRangeForDate(user, dateStr) {
  const safeUser = user && typeof user === "object" ? user : {};
  const shift =
    normalizeWorkShift(safeUser[getWorkShiftKeyByDate(dateStr)]) ||
    normalizeWorkShift(safeUser.workQ1) ||
    normalizeWorkShift(safeUser.workQ2) ||
    normalizeWorkShift(safeUser.workQ3) ||
    normalizeWorkShift(safeUser.workQ4) ||
    "09:00 ~ 18:00";
  return parseWorkShiftRange(shift) || { startHour: 9, endHour: 18 };
}

function getDailyActualWorkHoursForDate(user, dateStr) {
  const shift = getWorkShiftRangeForDate(user, dateStr);
  const grossHours = Math.max(0, Number(shift.endHour) - Number(shift.startHour));
  const breakHours = grossHours > 4 ? 1 : 0;
  const actualHours = Math.max(0, grossHours - breakHours);
  return Number.isFinite(actualHours) ? actualHours : 8;
}

function isWeekdayUtcDate(date) {
  const day = date.getUTCDay();
  return day >= 1 && day <= 5;
}

function moveWeekdaysFromEvent(dateStr, weekdayCount, direction) {
  const base = toUtcDate(normalizeRequestDateKey(dateStr));
  const step = direction === "before" ? -1 : 1;
  if (!base || !Number.isFinite(Number(weekdayCount)) || Number(weekdayCount) <= 0) return "";
  let moved = 0;
  while (moved < Number(weekdayCount)) {
    base.setUTCDate(base.getUTCDate() + step);
    if (isWeekdayUtcDate(base)) moved += 1;
  }
  return formatDateKey(base);
}

function buildSpecialLeaveUsableWindow(eventDate, expiryDirection, expiryDays) {
  const safeEventDate = normalizeRequestDateKey(eventDate);
  const safeDirection = text(expiryDirection).toLowerCase();
  const safeDays = Number(expiryDays || 0);
  if (!safeEventDate || !["before", "after", "both"].includes(safeDirection) || safeDays <= 0) {
    return { usableFromDate: "", usableToDate: "" };
  }
  if (safeDirection === "before") {
    return {
      usableFromDate: moveWeekdaysFromEvent(safeEventDate, safeDays, "before"),
      usableToDate: moveWeekdaysFromEvent(safeEventDate, 1, "before")
    };
  }
  if (safeDirection === "after") {
    return {
      usableFromDate: moveWeekdaysFromEvent(safeEventDate, 1, "after"),
      usableToDate: moveWeekdaysFromEvent(safeEventDate, safeDays, "after")
    };
  }
  return {
    usableFromDate: moveWeekdaysFromEvent(safeEventDate, safeDays, "before"),
    usableToDate: moveWeekdaysFromEvent(safeEventDate, safeDays, "after")
  };
}

function isSpecialLeaveRequestItem(item = {}) {
  return !!text(item.specialLeaveTypeKey);
}

function validateSpecialLeaveGrantRange(docData, grant, typeMeta, existingItems, requestId) {
  if (!isSpecialLeaveRequestItem(docData)) return;
  const grantId = text(docData.specialLeaveGrantId);
  if (!grantId) throw createActionError("SPECIAL_LEAVE_GRANT_REQUIRED");
  if (!grant || text(grant.grantId) !== grantId) throw createActionError("SPECIAL_LEAVE_GRANT_NOT_FOUND");

  const eventDate = normalizeRequestDateKey(grant.eventDate);
  if (!eventDate) throw createActionError("SPECIAL_LEAVE_EVENT_DATE_REQUIRED");

  const window = (text(grant.usableFromDate) && text(grant.usableToDate))
    ? { usableFromDate: normalizeRequestDateKey(grant.usableFromDate), usableToDate: normalizeRequestDateKey(grant.usableToDate) }
    : buildSpecialLeaveUsableWindow(eventDate, typeMeta && typeMeta.expiryDirection, typeMeta && typeMeta.expiryDays);

  const startDate = normalizeRequestDateKey(docData.startDate);
  const endDate = normalizeRequestDateKey(docData.endDate || docData.startDate);
  if (!window.usableFromDate || !window.usableToDate || !startDate || !endDate) {
    throw createActionError("SPECIAL_LEAVE_WINDOW_INVALID");
  }
  if (startDate < window.usableFromDate || endDate > window.usableToDate) {
    throw createActionError("SPECIAL_LEAVE_OUTSIDE_WINDOW", {
      usableFromDate: window.usableFromDate,
      usableToDate: window.usableToDate
    });
  }

  const approvedUsedHours = (Array.isArray(existingItems) ? existingItems : []).reduce((sum, item) => {
    if (text(item.id) === text(requestId)) return sum;
    if (text(item.specialLeaveGrantId) !== grantId) return sum;
    if (!isSpecialLeaveRequestItem(item)) return sum;
    const status = text(item.status);
    if (["approved", "cancel_requested"].includes(status)) return sum + Number(item.hours || 0);
    return sum;
  }, 0);
  const pendingHours = (Array.isArray(existingItems) ? existingItems : []).reduce((sum, item) => {
    if (text(item.id) === text(requestId)) return sum;
    if (text(item.specialLeaveGrantId) !== grantId) return sum;
    if (!isSpecialLeaveRequestItem(item)) return sum;
    return text(item.status) === "pending" ? sum + Number(item.hours || 0) : sum;
  }, 0);
  const grantedHours = Number((grant.grantedHours ?? grant.totalHours) || 0);
  const manualUsedHours = Number(grant.usedHours || 0);
  const availableHours = Math.max(0, grantedHours - manualUsedHours - approvedUsedHours - pendingHours);
  if (Number(docData.hours || 0) > availableHours) {
    throw createActionError("SPECIAL_LEAVE_GRANT_INSUFFICIENT", {
      availableHours,
      grantId
    });
  }
}

function validateTimeOffOutRange(docData, targetUser) {
  if (!isTimeOffOutType(docData.type)) return;
  const reqDate = normalizeRequestDateKey(docData.startDate);
  const range = parseTimeRange(docData.timeRange);
  const shift = getWorkShiftRangeForDate(targetUser, reqDate);
  if (!range) {
    throw createActionError("TIMEOFF_OUT_INVALID_RANGE", {
      shiftStartHour: Number(shift.startHour || 0),
      shiftEndHour: Number(shift.endHour || 0)
    });
  }
  const startHour = Math.floor(Number(range.startMinutes || 0) / 60);
  const endHour = Math.floor(Number(range.endMinutes || 0) / 60);
  if (startHour < shift.startHour) {
    throw createActionError("TIMEOFF_OUT_BEFORE_SHIFT_START", {
      shiftStartHour: Number(shift.startHour || 0),
      shiftEndHour: Number(shift.endHour || 0)
    });
  }
  if (endHour >= shift.endHour) {
    throw createActionError("TIMEOFF_OUT_AT_OR_AFTER_SHIFT_END", {
      shiftStartHour: Number(shift.startHour || 0),
      shiftEndHour: Number(shift.endHour || 0)
    });
  }
}

function toUtcDate(dateStr) {
  const match = text(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function formatDateKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildIsoWeekRange(dateStr) {
  const baseDate = toUtcDate(normalizeRequestDateKey(dateStr));
  if (!baseDate) return null;
  const baseDay = baseDate.getUTCDay() || 7;
  const start = new Date(baseDate.getTime());
  start.setUTCDate(start.getUTCDate() - baseDay + 1);
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + 6);
  return {
    startKey: formatDateKey(start),
    endKey: formatDateKey(end)
  };
}

function isScheduledBasicWorkday(dateStr, holidaysSet = new Set()) {
  const date = toUtcDate(normalizeRequestDateKey(dateStr));
  if (!date) return false;
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return false;
  return !holidaysSet.has(normalizeRequestDateKey(dateStr));
}

function getReportRequestHoursForLimit(user, item = {}) {
  const reqDate = normalizeRequestDateKey(item.startDate);
  if (!reqDate) return 0;
  const category = text(item.reportCategory);
  if (category === "holiday_work" || text(item.type) === "특근") {
    return getDailyActualWorkHoursForDate(user, reqDate);
  }
  const hours = Number(item.reportedHours || item.hours || 0);
  return Number.isFinite(hours) && hours > 0 ? hours : 0;
}

function validateWeeklyWorkLimit(docData, targetUser, existingItems, holidayDates, requestId) {
  const safeDate = normalizeRequestDateKey(docData.startDate);
  const weekRange = buildIsoWeekRange(safeDate);
  if (!safeDate || !weekRange || !targetUser) return;

  let basicHours = 0;
  let cursor = toUtcDate(weekRange.startKey);
  const endDate = toUtcDate(weekRange.endKey);
  while (cursor && endDate && cursor.getTime() <= endDate.getTime()) {
    const cursorKey = formatDateKey(cursor);
    if (isScheduledBasicWorkday(cursorKey, holidayDates)) {
      basicHours += getDailyActualWorkHoursForDate(targetUser, cursorKey);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const excludeId = text(requestId);
  const existingReportHours = (Array.isArray(existingItems) ? existingItems : []).reduce((sum, item) => {
    if (text(item.id) === excludeId) return sum;
    if (!isWorkReportRequestItem(item)) return sum;
    if (["cancelled", "rejected"].includes(text(item.status))) return sum;
    if (text(item.settlementStatus) === "rejected") return sum;
    const reqDate = normalizeRequestDateKey(item.startDate);
    if (!reqDate || reqDate < weekRange.startKey || reqDate > weekRange.endKey) return sum;
    return sum + getReportRequestHoursForLimit(targetUser, item);
  }, 0);

  const currentRequestHours = getReportRequestHoursForLimit(targetUser, docData);
  const totalHours = basicHours + existingReportHours + currentRequestHours;
  if (totalHours > 52) {
    throw createActionError("WORK_LIMIT_EXCEEDED", {
      weekStart: weekRange.startKey,
      weekEnd: weekRange.endKey,
      basicHours,
      existingReportHours,
      currentRequestHours,
      totalHours
    });
  }
}

function findTimeOffDuplicate(existingItems, requestId, docData) {
  if (!isTimeOffType(docData.type)) return null;
  const candidateDate = normalizeRequestDateKey(docData.startDate);
  const candidateRange = parseTimeRange(docData.timeRange);
  return existingItems.find((item) => {
    if (text(item.id) === requestId) return false;
    if (["cancelled", "rejected"].includes(text(item.status))) return false;
    if (!isTimeOffType(item.type)) return false;
    const existingDate = normalizeRequestDateKey(item.startDate);
    if (!candidateDate || !existingDate || existingDate !== candidateDate) return false;
    const existingType = text(item.type);
    if (text(docData.type) === "시간차(퇴근)" && existingType === "시간차(퇴근)") return true;
    return hasTimeRangeOverlap(parseTimeRange(item.timeRange), candidateRange);
  }) || null;
}

function buildSettlementPeriodRange(year, month) {
  const safeYear = Number(year);
  const safeMonth = Number(month);
  if (!Number.isFinite(safeYear) || !Number.isFinite(safeMonth) || safeMonth < 0 || safeMonth > 11) return null;
  const end = new Date(Date.UTC(safeYear, safeMonth, 15, 0, 0, 0, 0));
  const start = new Date(Date.UTC(safeYear, safeMonth - 1, 16, 0, 0, 0, 0));
  return {
    startKey: start.toISOString().slice(0, 10),
    endKey: end.toISOString().slice(0, 10),
    periodKey: `${safeYear}-${String(safeMonth + 1).padStart(2, "0")}`
  };
}

function isWorkReportRequestItem(item = {}) {
  const safeType = text(item.type);
  const safeCategory = text(item.reportCategory);
  return ["잔업", "특근"].includes(safeType) || ["overtime", "holiday_work"].includes(safeCategory);
}

function getSettlementStatus(item = {}, periodKey = "") {
  if (text(item.settlementPeriodKey) !== text(periodKey)) return "";
  const safe = text(item.settlementStatus);
  if (["submitted", "approved", "rejected"].includes(safe)) return safe;
  return text(item.settlementSubmittedAt) ? "submitted" : "";
}

async function getSettlementTargetRequests(targetUserId, range) {
  const snap = await store.collection("requests").where("userId", "==", text(targetUserId)).get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((item) => {
      if (!isWorkReportRequestItem(item)) return false;
      if (text(item.status) !== "reported") return false;
      const startDate = normalizeRequestDateKey(item.startDate);
      if (!startDate || startDate < range.startKey || startDate > range.endKey) return false;
      if (text(item.settlementPeriodKey) !== range.periodKey) return false;
      return true;
    });
}

async function upsertRequest(req, payload) {
  const r = payload.data || {};
  const requestId = text(r.id);
  const { actor, actorUser } = await requireActor(payload);
  const actorId = text(actor.id);
  const actorName = text(actor.name);
  const expectedStatus = text(payload.expectedStatus);
  if (!requestId) return { result: "fail", message: "REQUEST_ID_REQUIRED" };
  const requestRef = getRequestRef(requestId);
  const targetUserId = text(r.userId);
  const targetUser = targetUserId ? await getUserById(targetUserId) : null;
  let existedBefore = false;
  let savedRequest = null;
  let appliedMutationMode = "";

  try {
    await store.runTransaction(async (transaction) => {
      const existingSnap = await transaction.get(requestRef);
      const currentRequest = existingSnap.exists ? { id: existingSnap.id, ...existingSnap.data() } : null;
      const resolvedTargetUser = currentRequest
        ? {
            id: text(currentRequest.userId),
            name: text(currentRequest.userName),
            dept: text(currentRequest.dept),
            role: text(currentRequest.role)
          }
        : targetUser;
      const resolvedTargetUserId = resolvedTargetUser ? text(resolvedTargetUser.id) : targetUserId;
      if (currentRequest && expectedStatus) {
        const currentStatus = text(currentRequest.status);
        if (currentStatus !== expectedStatus) {
          throw createActionError("REQUEST_STATE_CONFLICT", { currentStatus });
        }
      }

      const nextStatus = text(r.status || (currentRequest && currentRequest.status) || "pending") || "pending";
      const mutationMode = getRequestMutationMode(actorUser, currentRequest, nextStatus, resolvedTargetUser || resolvedTargetUserId);
      appliedMutationMode = mutationMode;

      if (!mutationMode) throw createActionError("FORBIDDEN_REQUEST_WRITE");
      if (!currentRequest && !targetUser) throw createActionError("REQUEST_USER_NOT_FOUND");

      const docData = buildRequestPayloadForWrite(r, {
        currentRequest,
        targetUser,
        mutationMode
      });

      const activeStatus = text(docData.status);
      const isReportRequest = ["잔업", "특근"].includes(text(docData.type)) || ["overtime", "holiday_work"].includes(text(docData.reportCategory));
      const duplicateQuery = store.collection("requests").where("userId", "==", text(docData.userId));
      const duplicateSnap = await transaction.get(duplicateQuery);
      const duplicateItems = duplicateSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      if (isSpecialLeaveRequestItem(docData)) {
        const grantQuery = store.collection("userSpecialLeaves").where("userId", "==", text(docData.userId));
        const grantSnap = await transaction.get(grantQuery);
        const grants = grantSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        let targetGrant = grants.find((item) => text(item.grantId || item.id) === text(docData.specialLeaveGrantId));
        if (!targetGrant && !text(docData.specialLeaveGrantId)) {
          const sameTypeGrants = grants.filter((item) => text(item.typeKey) === text(docData.specialLeaveTypeKey));
          if (sameTypeGrants.length === 1) {
            targetGrant = sameTypeGrants[0];
            docData.specialLeaveGrantId = text(targetGrant.grantId || targetGrant.id);
          }
        }
        const typeDocRef = store.collection("specialLeaveTypes").doc(text(docData.specialLeaveTypeKey));
        const typeDocSnap = await transaction.get(typeDocRef);
        const typeMeta = typeDocSnap.exists ? typeDocSnap.data() : null;
        validateSpecialLeaveGrantRange(docData, targetGrant, typeMeta, duplicateItems, requestId);
      }
      validateTimeOffOutRange(docData, targetUser || resolvedTargetUser);
      if (!isReportRequest && !["cancelled", "rejected", "reported"].includes(activeStatus)) {
        const candidateStart = normalizeRequestDateKey(docData.startDate);
        const candidateEnd = normalizeRequestDateKey(docData.endDate || docData.startDate);
        let duplicated = duplicateItems.find((item) => {
            if (text(item.id) === requestId) return false;
            if (["cancelled", "rejected"].includes(text(item.status))) return false;
            if (isTimeOffType(docData.type) && isTimeOffType(item.type)) return false;
            const existingStart = normalizeRequestDateKey(item.startDate);
            const existingEnd = normalizeRequestDateKey(item.endDate || item.startDate);
            if (!candidateStart || !candidateEnd || !existingStart || !existingEnd) return false;
            return candidateStart <= existingEnd && candidateEnd >= existingStart;
          });
        if (!duplicated) {
          duplicated = findTimeOffDuplicate(duplicateItems, requestId, docData);
        }
        if (duplicated) {
          throw createActionError("REQUEST_DUPLICATE_CONFLICT", {
            duplicateId: text(duplicated.id),
            duplicateStartDate: text(duplicated.startDate),
            duplicateEndDate: text(duplicated.endDate || duplicated.startDate),
            duplicateType: text(duplicated.type),
            duplicateTimeRange: text(duplicated.timeRange)
          });
        }
      } else if (isReportRequest) {
        const weekRange = buildIsoWeekRange(docData.startDate);
        if (weekRange) {
          const holidayQuery = store.collection("holidays")
            .where("date", ">=", weekRange.startKey)
            .where("date", "<=", weekRange.endKey);
          const holidaySnap = await transaction.get(holidayQuery);
          const holidayDates = new Set(
            holidaySnap.docs
              .map((doc) => normalizeRequestDateKey(doc.get("date")))
              .filter(Boolean)
          );
          validateWeeklyWorkLimit(docData, targetUser || resolvedTargetUser, duplicateItems, holidayDates, requestId);
        }
      }

      savedRequest = {
        ...docData,
        id: requestId,
        updatedAt: nowKst()
      };
      existedBefore = existingSnap.exists;
      transaction.set(requestRef, savedRequest, { merge: true });
    });
  } catch (error) {
    if (error && error.message === "REQUEST_DUPLICATE_CONFLICT") {
      return {
        result: "error",
        message: "REQUEST_DUPLICATE_CONFLICT",
        duplicateId: text(error.duplicateId),
        duplicateStartDate: text(error.duplicateStartDate),
        duplicateEndDate: text(error.duplicateEndDate),
        duplicateType: text(error.duplicateType),
        duplicateTimeRange: text(error.duplicateTimeRange)
      };
    }
    if (error && error.message === "REQUEST_STATE_CONFLICT") {
      return {
        result: "error",
        message: "REQUEST_STATE_CONFLICT",
        currentStatus: text(error.currentStatus)
      };
    }
    if (error && ["TIMEOFF_OUT_INVALID_RANGE", "TIMEOFF_OUT_BEFORE_SHIFT_START", "TIMEOFF_OUT_AT_OR_AFTER_SHIFT_END"].includes(error.message)) {
      return {
        result: "error",
        message: text(error.message),
        shiftStartHour: Number(error.shiftStartHour || 0),
        shiftEndHour: Number(error.shiftEndHour || 0)
      };
    }
    if (error && ["SPECIAL_LEAVE_GRANT_REQUIRED", "SPECIAL_LEAVE_GRANT_NOT_FOUND", "SPECIAL_LEAVE_EVENT_DATE_REQUIRED", "SPECIAL_LEAVE_WINDOW_INVALID", "SPECIAL_LEAVE_OUTSIDE_WINDOW", "SPECIAL_LEAVE_GRANT_INSUFFICIENT"].includes(error.message)) {
      return {
        result: "error",
        message: text(error.message),
        usableFromDate: text(error.usableFromDate),
        usableToDate: text(error.usableToDate),
        availableHours: Number(error.availableHours || 0),
        grantId: text(error.grantId)
      };
    }
    if (error && error.message === "WORK_LIMIT_EXCEEDED") {
      return {
        result: "error",
        message: "WORK_LIMIT_EXCEEDED",
        weekStart: text(error.weekStart),
        weekEnd: text(error.weekEnd),
        basicHours: Number(error.basicHours || 0),
        existingReportHours: Number(error.existingReportHours || 0),
        currentRequestHours: Number(error.currentRequestHours || 0),
        totalHours: Number(error.totalHours || 0)
      };
    }
    if (error && error.message) {
      return { result: "fail", message: error.message };
    }
    throw error;
  }

  const logType = appliedMutationMode === "admin_edit"
    ? "AdminRequestEdit"
    : (appliedMutationMode === "admin_create"
        ? "AdminRequestCreate"
    : (!existedBefore && actorId && text(savedRequest.userId) && actorId !== text(savedRequest.userId)
        ? "AdminRequestCreate"
        : (existedBefore ? "RequestUpdate" : "RequestCreate")));
  await writeLog(actorId, actorName, logType, resolveClientIp(req, payload), `${requestId}|${savedRequest.type}|${savedRequest.status}|${text(savedRequest.userId)}`);
  if (logType === "AdminRequestEdit" || logType === "AdminRequestCreate") {
    await writeSecurityLog(req, payload, {
      userId: actorId,
      userName: actorName,
      eventType: logType === "AdminRequestEdit" ? "ADMIN_REQUEST_EDIT" : "ADMIN_REQUEST_CREATE",
      severity: "warn",
      detail: `${requestId}|${savedRequest.status}`,
      context: {
        requestId,
        targetUserId: text(savedRequest.userId),
        type: text(savedRequest.type),
        status: text(savedRequest.status)
      }
    });
  }
  return { result: "success" };
}

async function deleteRequest(req, payload) {
  const { actor, actorUser } = await requireActor(payload);
  const targetId = text(payload.id);
  const requestData = await getRequestById(targetId);
  if (!requestData) return { result: "fail", message: "REQUEST_NOT_FOUND" };
  const targetUserLike = {
    id: text(requestData.userId),
    name: text(requestData.userName),
    dept: text(requestData.dept),
    role: text(requestData.role)
  };
  if (!(normalizeRole(actorUser.role) === "master" || text(requestData.userId) === text(actorUser.id) || canManageTargetUserForActor(actorUser, targetUserLike))) {
    return { result: "fail", message: "REQUEST_DELETE_FORBIDDEN" };
  }
  await deleteRequestById(targetId);
  await writeLog(actor.id, actor.name, "RequestDelete", resolveClientIp(req, payload), targetId);
  if (text(requestData.userId) !== text(actorUser.id)) {
    await writeSecurityLog(req, payload, {
      userId: actor.id,
      userName: actor.name,
      eventType: "ADMIN_REQUEST_DELETE",
      severity: "high",
      detail: targetId,
      context: {
        requestId: targetId,
        targetUserId: text(requestData.userId),
        targetDept: text(requestData.dept)
      }
    });
  }
  return { result: "success" };
}

async function submitWorkReportSettlement(req, payload) {
  const { actor, actorUser } = await requireActor(payload);
  const range = buildSettlementPeriodRange(payload.year, payload.month);
  if (!range) return { result: "fail", message: "INVALID_SETTLEMENT_PERIOD" };

  const requestIds = Array.isArray(payload.requestIds)
    ? payload.requestIds.map((item) => text(item)).filter(Boolean)
    : [];
  const idSet = new Set(requestIds);
  const snap = await store.collection("requests").where("userId", "==", text(actorUser.id)).get();
  const candidates = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((item) => {
      const type = text(item.type);
      const category = text(item.reportCategory);
      if (!(["잔업", "특근"].includes(type) || ["overtime", "holiday_work"].includes(category))) return false;
      if (text(item.status) !== "reported") return false;
      const startDate = normalizeRequestDateKey(item.startDate);
      if (!startDate || startDate < range.startKey || startDate > range.endKey) return false;
      if (idSet.size > 0 && !idSet.has(text(item.id))) return false;
      return true;
    });

  if (!candidates.length) return { result: "fail", message: "SETTLEMENT_TARGETS_NOT_FOUND" };

  const submittedAt = nowKst();
  const batch = store.batch();
  candidates.forEach((item) => {
    batch.set(
      getRequestRef(item.id),
      {
        settlementPeriodKey: range.periodKey,
        settlementStatus: "submitted",
        settlementSubmittedAt: submittedAt,
        settlementSubmittedBy: text(actor.id),
        settlementSubmittedByName: text(actor.name),
        settlementApprovedAt: "",
        settlementApprovedBy: "",
        settlementApprovedByName: "",
        settlementRejectedAt: "",
        settlementRejectedBy: "",
        settlementRejectedByName: "",
        settlementRejectReason: ""
      },
      { merge: true }
    );
  });
  await batch.commit();

  await writeLog(actor.id, actor.name, "WorkReportSettlementSubmit", resolveClientIp(req, payload), `${range.periodKey}|${candidates.length}`);
  await writeSecurityLog(req, payload, {
    userId: actor.id,
    userName: actor.name,
    eventType: "WORK_REPORT_SETTLEMENT_SUBMIT",
    severity: "info",
    detail: `${range.periodKey}|${candidates.length}`,
    context: {
      periodKey: range.periodKey,
      count: candidates.length
    }
  });

  return {
    result: "success",
    periodKey: range.periodKey,
    submittedAt,
    requestIds: candidates.map((item) => text(item.id))
  };
}

async function approveWorkReportSettlement(req, payload) {
  const { actor, actorUser } = await requireActor(payload);
  const range = buildSettlementPeriodRange(payload.year, payload.month);
  if (!range) return { result: "fail", message: "INVALID_SETTLEMENT_PERIOD" };
  const targetUserId = text(payload.userId);
  if (!targetUserId) return { result: "fail", message: "SETTLEMENT_TARGET_USER_REQUIRED" };
  const targetUser = await getUserById(targetUserId);
  if (!targetUser) return { result: "fail", message: "REQUEST_USER_NOT_FOUND" };
  if (!canApproveRequestForActor(actorUser, targetUser)) {
    return { result: "fail", message: "WORK_REPORT_SETTLEMENT_APPROVE_FORBIDDEN" };
  }

  const candidates = await getSettlementTargetRequests(targetUserId, range);
  const submittedCandidates = candidates.filter((item) => getSettlementStatus(item, range.periodKey) === "submitted");
  if (!submittedCandidates.length) return { result: "fail", message: "WORK_REPORT_SETTLEMENT_NOT_PENDING" };

  const approvedAt = nowKst();
  const batch = store.batch();
  submittedCandidates.forEach((item) => {
    batch.set(
      getRequestRef(item.id),
      {
        settlementStatus: "approved",
        settlementApprovedAt: approvedAt,
        settlementApprovedBy: text(actor.id),
        settlementApprovedByName: text(actor.name),
        settlementRejectedAt: "",
        settlementRejectedBy: "",
        settlementRejectedByName: "",
        settlementRejectReason: ""
      },
      { merge: true }
    );
  });
  await batch.commit();

  await writeLog(actor.id, actor.name, "WorkReportSettlementApprove", resolveClientIp(req, payload), `${range.periodKey}|${targetUserId}|${submittedCandidates.length}`);
  await writeSecurityLog(req, payload, {
    userId: actor.id,
    userName: actor.name,
    eventType: "WORK_REPORT_SETTLEMENT_APPROVE",
    severity: "info",
    detail: `${range.periodKey}|${targetUserId}|${submittedCandidates.length}`,
    context: {
      periodKey: range.periodKey,
      targetUserId,
      targetDept: text(targetUser.dept),
      count: submittedCandidates.length
    }
  });

  return {
    result: "success",
    periodKey: range.periodKey,
    targetUserId,
    approvedAt,
    status: "approved",
    requestIds: submittedCandidates.map((item) => text(item.id))
  };
}

async function rejectWorkReportSettlement(req, payload) {
  const { actor, actorUser } = await requireActor(payload);
  const range = buildSettlementPeriodRange(payload.year, payload.month);
  if (!range) return { result: "fail", message: "INVALID_SETTLEMENT_PERIOD" };
  const targetUserId = text(payload.userId);
  const rejectReason = text(payload.rejectReason);
  if (!targetUserId) return { result: "fail", message: "SETTLEMENT_TARGET_USER_REQUIRED" };
  if (!rejectReason) return { result: "fail", message: "SETTLEMENT_REJECT_REASON_REQUIRED" };
  const targetUser = await getUserById(targetUserId);
  if (!targetUser) return { result: "fail", message: "REQUEST_USER_NOT_FOUND" };
  if (!canApproveRequestForActor(actorUser, targetUser)) {
    return { result: "fail", message: "WORK_REPORT_SETTLEMENT_APPROVE_FORBIDDEN" };
  }

  const candidates = await getSettlementTargetRequests(targetUserId, range);
  const submittedCandidates = candidates.filter((item) => getSettlementStatus(item, range.periodKey) === "submitted");
  if (!submittedCandidates.length) return { result: "fail", message: "WORK_REPORT_SETTLEMENT_NOT_PENDING" };

  const rejectedAt = nowKst();
  const batch = store.batch();
  submittedCandidates.forEach((item) => {
    batch.set(
      getRequestRef(item.id),
      {
        settlementStatus: "rejected",
        settlementRejectedAt: rejectedAt,
        settlementRejectedBy: text(actor.id),
        settlementRejectedByName: text(actor.name),
        settlementRejectReason: rejectReason,
        settlementApprovedAt: "",
        settlementApprovedBy: "",
        settlementApprovedByName: ""
      },
      { merge: true }
    );
  });
  await batch.commit();

  await writeLog(actor.id, actor.name, "WorkReportSettlementReject", resolveClientIp(req, payload), `${range.periodKey}|${targetUserId}|${submittedCandidates.length}`);
  await writeSecurityLog(req, payload, {
    userId: actor.id,
    userName: actor.name,
    eventType: "WORK_REPORT_SETTLEMENT_REJECT",
    severity: "warn",
    detail: `${range.periodKey}|${targetUserId}|${submittedCandidates.length}`,
    context: {
      periodKey: range.periodKey,
      targetUserId,
      targetDept: text(targetUser.dept),
      count: submittedCandidates.length,
      rejectReason
    }
  });

  return {
    result: "success",
    periodKey: range.periodKey,
    targetUserId,
    rejectedAt,
    rejectReason,
    status: "rejected",
    requestIds: submittedCandidates.map((item) => text(item.id))
  };
}

module.exports = {
  upsertRequest,
  deleteRequest,
  submitWorkReportSettlement,
  approveWorkReportSettlement,
  rejectWorkReportSettlement
};
