"use strict";

const { nowKst } = require("./time");

function text(v) {
  return String(v ?? "").trim();
}

function cleanPhone(v) {
  return String(v || "").replace(/[^\d\-+\s]/g, "").trim();
}

function toBool(v, fallback = false) {
  if (v === true || v === false) return v;
  if (v === 1 || v === "1") return true;
  if (v === 0 || v === "0") return false;
  const t = text(v).toLowerCase();
  if (["true", "yes", "y", "on"].includes(t)) return true;
  if (["false", "no", "n", "off"].includes(t)) return false;
  return fallback;
}

function cleanLogType(v) {
  const t = text(v);
  return t ? t.replace(/[^\w\-:]/g, "_").slice(0, 40) : "Action";
}

function excelSerialToUnixMs(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num - 25569) * 86400000);
}

function normalizeLogSortTimestamp(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 100000000000) return Math.round(value);
    if (value > 30000) return excelSerialToUnixMs(value);
    return fallback;
  }
  const raw = text(value);
  if (!raw) return fallback;
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const num = Number(raw);
    if (!Number.isFinite(num)) return fallback;
    if (num > 100000000000) return Math.round(num);
    if (num > 30000) return excelSerialToUnixMs(num);
    return fallback;
  }
  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct.getTime();
  const normalized = raw.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    ? raw.replace(" ", "T") + "+09:00"
    : raw;
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
  return fallback;
}

function normalizeRole(v) {
  const t = text(v).toLowerCase();
  if (t === "master" || t === "마스터") return "master";
  if (t === "ceo" || t === "대표") return "ceo";
  if (["manager", "teamleader", "team_leader", "팀리더", "팀장"].includes(t)) return "team_leader";
  if (["partleader", "part_leader", "파트리더", "파트장"].includes(t)) return "part_leader";
  return "employee";
}

function normalizeScope(v, fallback = "none") {
  const t = text(v).toLowerCase();
  return ["none", "manual", "parts", "all"].includes(t) ? t : fallback;
}

function normalizeWorkShift(v) {
  const raw = text(v);
  if (!raw) return "";
  const compact = raw.replace(/\s+/g, "");
  if (compact === "07:00~16:00" || compact === "07:00-16:00") return "07:00 ~ 16:00";
  if (compact === "08:00~17:00" || compact === "08:00-17:00") return "08:00 ~ 17:00";
  if (compact === "09:00~18:00" || compact === "09:00-18:00") return "09:00 ~ 18:00";
  return "";
}

function normalizeRequestDateKey(v) {
  const t = text(v);
  if (!t) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const parsed = new Date(t);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function normalizeSpecialLeaveTypeKey(v) {
  return text(v).toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 40);
}

function normalizeSpecialLeaveColor(v) {
  const t = text(v).toLowerCase();
  return ["rose", "sky", "emerald", "amber", "violet", "indigo", "slate"].includes(t) ? t : "slate";
}

function normalizeSpecialLeaveRequestMode(v) {
  return text(v).toLowerCase() === "day_only" ? "day_only" : "same_as_annual";
}

function normalizeSpecialLeaveExpiryBasis(v) {
  return text(v).toLowerCase() === "event_date" ? "event_date" : "";
}

function normalizeSpecialLeaveExpiryDirection(v) {
  const safe = text(v).toLowerCase();
  return ["before", "after", "both"].includes(safe) ? safe : "";
}

function normalizeSpecialLeaveDayCountMode(v) {
  return text(v).toLowerCase() === "calendar_days" ? "calendar_days" : "business_days";
}

function getLegacyDefaultPermissions(role, dept) {
  const safeRole = normalizeRole(role);
  const base = {
    calendarSelf: true,
    calendarManual: false,
    calendarParts: false,
    calendarAll: false,
    calendarRejected: false,
    calendarWorkReport: false,
    boardRead: true,
    boardWrite: false,
    workReportViewManual: false,
    workReportViewParts: false,
    workReportViewAll: false,
    approveScope: "none",
    memberStatusScope: "none",
    canAccessMasterSettings: false,
    canManageUsers: false,
    canAccessMasterSettingsDesktop: false,
    canManageUsersDesktop: false,
    canAccessMasterSettingsMobile: false,
    canManageUsersMobile: false,
    canAccessAdminOps: false,
    canAccessAdminOpsDesktop: false,
    canAccessAdminOpsMobile: false,
    canAccessSituationBoard: false,
    canAccessSituationBoardDesktop: false,
    canAccessSituationBoardMobile: false
  };
  if (safeRole === "master") {
    return {
      calendarSelf: true,
      calendarManual: true,
      calendarParts: true,
      calendarAll: true,
      calendarRejected: true,
      calendarWorkReport: true,
      boardRead: true,
      boardWrite: true,
      workReportViewManual: true,
      workReportViewParts: true,
      workReportViewAll: true,
      approveScope: "all",
      memberStatusScope: "all",
      canAccessMasterSettings: true,
      canManageUsers: true,
      canAccessMasterSettingsDesktop: true,
      canManageUsersDesktop: true,
      canAccessMasterSettingsMobile: true,
      canManageUsersMobile: true,
      canAccessAdminOps: true,
      canAccessAdminOpsDesktop: true,
      canAccessAdminOpsMobile: true,
      canAccessSituationBoard: true,
      canAccessSituationBoardDesktop: true,
      canAccessSituationBoardMobile: true
    };
  }
  if (safeRole === "ceo") {
    return {
      ...base,
      boardRead: true,
      boardWrite: false,
      calendarManual: true,
      calendarParts: true,
      calendarAll: true,
      workReportViewManual: true,
      workReportViewParts: true,
      workReportViewAll: true,
      approveScope: "all",
      memberStatusScope: "all",
      canManageUsers: true,
      canManageUsersDesktop: true,
      canManageUsersMobile: true
    };
  }
  if (safeRole === "team_leader") {
    const approveScope = dept === "매뉴얼팀" ? "manual" : dept === "파츠북팀" ? "parts" : "none";
    return {
      ...base,
      boardRead: true,
      boardWrite: false,
      calendarManual: dept === "매뉴얼팀",
      calendarParts: dept === "파츠북팀",
      approveScope,
      memberStatusScope: approveScope,
      canManageUsers: true,
      canManageUsersDesktop: true,
      canManageUsersMobile: true
    };
  }
  return base;
}

function normalizePermissions(raw, role, dept) {
  const safeRole = normalizeRole(role);
  const src = raw && typeof raw === "object" ? raw : {};
  const defaults = getLegacyDefaultPermissions(safeRole, dept);
  const explicit =
    src.calendarSelf !== undefined ||
    src.calendarManual !== undefined ||
    src.calendarParts !== undefined ||
    src.calendarAll !== undefined ||
    src.calendarRejected !== undefined ||
    src.calendarWorkReport !== undefined ||
    src.boardRead !== undefined ||
    src.boardWrite !== undefined ||
    src.workReportViewManual !== undefined ||
    src.workReportViewParts !== undefined ||
    src.workReportViewAll !== undefined ||
    src.approveScope !== undefined ||
    src.memberStatusScope !== undefined ||
    src.canAccessMasterSettings !== undefined ||
    src.canManageUsers !== undefined ||
    src.canAccessMasterSettingsDesktop !== undefined ||
    src.canManageUsersDesktop !== undefined ||
    src.canAccessMasterSettingsMobile !== undefined ||
    src.canManageUsersMobile !== undefined ||
    src.canAccessAdminOps !== undefined ||
    src.canAccessAdminOpsDesktop !== undefined ||
    src.canAccessAdminOpsMobile !== undefined ||
    src.canAccessSituationBoard !== undefined ||
    src.canAccessSituationBoardDesktop !== undefined ||
    src.canAccessSituationBoardMobile !== undefined;
  const p = explicit
    ? {
        calendarSelf: toBool(src.calendarSelf, false),
        calendarManual: toBool(src.calendarManual, false),
        calendarParts: toBool(src.calendarParts, false),
        calendarAll: toBool(src.calendarAll, false),
        calendarRejected: toBool(src.calendarRejected, false),
        calendarWorkReport: toBool(src.calendarWorkReport, false),
        boardRead: toBool(src.boardRead, defaults.boardRead),
        boardWrite: toBool(src.boardWrite, defaults.boardWrite),
        workReportViewManual: toBool(src.workReportViewManual, false),
        workReportViewParts: toBool(src.workReportViewParts, false),
        workReportViewAll: toBool(src.workReportViewAll, false),
        approveScope: normalizeScope(src.approveScope, "none"),
        memberStatusScope: normalizeScope(src.memberStatusScope, normalizeScope(src.approveScope, "none")),
        canAccessMasterSettings: toBool(src.canAccessMasterSettings, false),
        canManageUsers: toBool(src.canManageUsers, false),
        canAccessMasterSettingsDesktop: toBool(src.canAccessMasterSettingsDesktop, toBool(src.canAccessMasterSettings, false)),
        canManageUsersDesktop: toBool(src.canManageUsersDesktop, toBool(src.canManageUsers, false)),
        canAccessMasterSettingsMobile: toBool(src.canAccessMasterSettingsMobile, toBool(src.canAccessMasterSettings, false)),
        canManageUsersMobile: toBool(src.canManageUsersMobile, toBool(src.canManageUsers, false)),
        canAccessAdminOps: toBool(src.canAccessAdminOps, false),
        canAccessAdminOpsDesktop: toBool(src.canAccessAdminOpsDesktop, toBool(src.canAccessAdminOps, false)),
        canAccessAdminOpsMobile: toBool(src.canAccessAdminOpsMobile, toBool(src.canAccessAdminOps, false)),
        canAccessSituationBoard: toBool(src.canAccessSituationBoard, false),
        canAccessSituationBoardDesktop: toBool(src.canAccessSituationBoardDesktop, toBool(src.canAccessSituationBoard, false)),
        canAccessSituationBoardMobile: toBool(src.canAccessSituationBoardMobile, toBool(src.canAccessSituationBoard, false))
      }
    : defaults;
  if (safeRole === "master") return getLegacyDefaultPermissions("master", dept);
  if (!p.calendarSelf && !p.calendarManual && !p.calendarParts && !p.calendarAll && !p.calendarRejected && !p.calendarWorkReport) p.calendarSelf = true;
  if (p.workReportViewAll) {
    p.workReportViewManual = true;
    p.workReportViewParts = true;
  }
  if (p.approveScope === "all") {
    p.workReportViewAll = true;
    p.workReportViewManual = true;
    p.workReportViewParts = true;
  } else if (p.approveScope === "manual") {
    p.workReportViewManual = true;
  } else if (p.approveScope === "parts") {
    p.workReportViewParts = true;
  }
  p.canAccessMasterSettings = p.canAccessMasterSettingsDesktop || p.canAccessMasterSettingsMobile;
  p.canManageUsers = p.canManageUsersDesktop || p.canManageUsersMobile;
  p.canAccessAdminOps = p.canAccessAdminOpsDesktop || p.canAccessAdminOpsMobile;
  p.canAccessSituationBoard = p.canAccessSituationBoardDesktop || p.canAccessSituationBoardMobile;
  return p;
}

function sanitizeSpecialLeaveTypeObject(raw, fallback = {}) {
  const typeKey = normalizeSpecialLeaveTypeKey(raw?.typeKey || fallback.typeKey);
  const dayCountMode = normalizeSpecialLeaveDayCountMode(raw?.dayCountMode || fallback.dayCountMode);
  return {
    typeKey,
    label: text(raw?.label || fallback.label) || typeKey,
    enabled: toBool(raw?.enabled, toBool(fallback.enabled, false)),
    sortOrder: Number.isFinite(Number(raw?.sortOrder)) ? Number(raw.sortOrder) : Number(fallback.sortOrder || 0),
    color: normalizeSpecialLeaveColor(raw?.color || fallback.color),
    grantHours: Math.max(0, Number.isFinite(Number(raw?.grantHours)) ? Number(raw.grantHours) : Number(fallback.grantHours || 0)),
    requestMode: normalizeSpecialLeaveRequestMode(raw?.requestMode || fallback.requestMode),
    allowHolidayRequest: toBool(raw?.allowHolidayRequest, toBool(fallback.allowHolidayRequest, false)),
    dayCountMode,
    expiryBasis: normalizeSpecialLeaveExpiryBasis(raw?.expiryBasis || (dayCountMode === "business_days" ? "event_date" : "")),
    expiryDirection: normalizeSpecialLeaveExpiryDirection(raw?.expiryDirection),
    expiryDays: Math.max(0, Number.isFinite(Number(raw?.expiryDays)) ? Number(raw.expiryDays) : Number(fallback.expiryDays || 0))
  };
}

function buildSpecialLeaveTypes(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => sanitizeSpecialLeaveTypeObject(item))
    .filter((item) => item.typeKey && item.label)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || String(a.label || "").localeCompare(String(b.label || ""), "ko"));
}

function sanitizeUserSpecialLeaveObject(raw, fallbackUserId) {
  const safeUserId = text(raw?.userId || fallbackUserId);
  const safeTypeKey = normalizeSpecialLeaveTypeKey(raw?.typeKey);
  const grantedHours = Math.max(0, Number((raw?.grantedHours ?? raw?.totalHours) || 0) || 0);
  return {
    userId: safeUserId,
    grantId: text(raw?.grantId || `${safeUserId}__${safeTypeKey}`),
    typeKey: safeTypeKey,
    grantedHours,
    totalHours: grantedHours,
    usedHours: Math.max(0, Number(raw?.usedHours || 0) || 0),
    pendingHours: Math.max(0, Number(raw?.pendingHours || 0) || 0),
    availableHours: Math.max(0, Number(raw?.availableHours || 0) || 0),
    eventDate: normalizeRequestDateKey(raw?.eventDate),
    usableFromDate: normalizeRequestDateKey(raw?.usableFromDate),
    usableToDate: normalizeRequestDateKey(raw?.usableToDate),
    grantStatus: ["active", "consumed", "expired", "inactive"].includes(text(raw?.grantStatus).toLowerCase())
      ? text(raw?.grantStatus).toLowerCase()
      : "active",
    note: text(raw?.note),
    updatedAt: text(raw?.updatedAt) || nowKst()
  };
}

function sanitizeMailRouteObject(raw) {
  const ccSource = Array.isArray(raw?.ccUserIds) ? raw.ccUserIds : text(raw?.ccUserIds).split(/[;,]/);
  return {
    dept: text(raw?.dept),
    roleGroup: text(raw?.roleGroup).toLowerCase() === "leader" ? "leader" : "staff",
    toUserId: text(raw?.toUserId),
    ccUserIds: [...new Set(ccSource.map((item) => text(item)).filter(Boolean))]
  };
}

function buildMailRoutes(items) {
  const byKey = new Map();
  (Array.isArray(items) ? items : [])
    .map((item) => sanitizeMailRouteObject(item))
    .filter((item) => item.dept && item.toUserId)
    .forEach((item) => byKey.set(`${item.dept}::${item.roleGroup}`, item));
  return [...byKey.values()].sort((a, b) => `${a.dept}:${a.roleGroup}`.localeCompare(`${b.dept}:${b.roleGroup}`, "ko"));
}

function sanitizeUserForClient(user) {
  return {
    id: text(user.id),
    password: "",
    name: text(user.name),
    role: normalizeRole(user.role),
    rank: text(user.rank),
    dept: text(user.dept),
    totalHours: Number(user.totalHours || 0),
    usedHours: Number(user.usedHours || 0),
    email: text(user.email),
    phone: cleanPhone(user.phone),
    employeeNo: text(user.employeeNo),
    workQ1: normalizeWorkShift(user.workQ1),
    workQ2: normalizeWorkShift(user.workQ2),
    workQ3: normalizeWorkShift(user.workQ3),
    workQ4: normalizeWorkShift(user.workQ4),
    featureMemberCard: toBool(user.featureMemberCard, false),
    featureBoard: toBool(user.featureBoard, true),
    featureHomepage: toBool(user.featureHomepage, false),
    featureOvertime: toBool(user.featureOvertime, false),
    featureHolidayWork: toBool(user.featureHolidayWork, false),
    permissions: normalizePermissions(user.permissions || {}, user.role, user.dept)
  };
}

module.exports = {
  text,
  cleanPhone,
  toBool,
  cleanLogType,
  normalizeLogSortTimestamp,
  normalizeRole,
  normalizeScope,
  normalizeWorkShift,
  normalizeRequestDateKey,
  normalizeSpecialLeaveTypeKey,
  normalizeSpecialLeaveColor,
  normalizeSpecialLeaveRequestMode,
  normalizeSpecialLeaveExpiryBasis,
  normalizeSpecialLeaveExpiryDirection,
  normalizeSpecialLeaveDayCountMode,
  getLegacyDefaultPermissions,
  normalizePermissions,
  sanitizeSpecialLeaveTypeObject,
  buildSpecialLeaveTypes,
  sanitizeUserSpecialLeaveObject,
  sanitizeMailRouteObject,
  buildMailRoutes,
  sanitizeUserForClient
};
