"use strict";

const admin = require("firebase-admin");
const { findServiceAccountPath } = require("./import-firestore");

const TEST_TAG = "WORKREPORT_APPROVAL_7_SEED_2026-04-03";
const PERIOD_START = "2026-02-16";
const PERIOD_END = "2026-03-15";
const TARGET_USERS = [
  { id: "3", date1: "2026-02-18", date2: "2026-03-03", holiday: "2026-03-01" },
  { id: "고다현", date1: "2026-02-19", date2: "2026-03-04", holiday: "2026-03-08" },
  { id: "권윤희", date1: "2026-02-20", date2: "2026-03-05", holiday: "2026-03-14" },
  { id: "김유진", date1: "2026-02-23", date2: "2026-03-06", holiday: "2026-03-07" },
  { id: "박서진", date1: "2026-02-24", date2: "2026-03-09", holiday: "2026-02-28" },
  { id: "서경주", date1: "2026-02-25", date2: "2026-03-10", holiday: "2026-02-22" },
  { id: "송현섭", date1: "2026-02-26", date2: "2026-03-12", holiday: "2026-02-21" }
];

const OVERTIME_CASES = [
  { duration: 1, reason: "자료 보완", workDetail: "고객 요청 반영 자료 보완", requestDept: "연구기획" },
  { duration: 2, reason: "검토 대응", workDetail: "검토 코멘트 반영 및 재정리", requestDept: "품질기획" },
  { duration: 3, reason: "출하 대응", workDetail: "출하 일정 변경 반영 및 확인", requestDept: "생산관리" },
  { duration: 1, reason: "문서 정리", workDetail: "월간 공유 문서 마감 정리", requestDept: "경영지원" },
  { duration: 2, reason: "회의 준비", workDetail: "주간 회의용 수치 자료 작성", requestDept: "연구기획" }
];

const HOLIDAY_CASES = [
  { reason: "주말 특근", workDetail: "긴급 요청 건 처리 및 자료 정리", requestDept: "연구기획" },
  { reason: "주말 특근", workDetail: "마감 전 최종 점검 및 정리", requestDept: "경영지원" },
  { reason: "공휴일 특근", workDetail: "보고자료 정리 및 검토 대응", requestDept: "품질기획" },
  { reason: "토요 특근", workDetail: "시험 결과 정리 및 보완", requestDept: "생산관리" }
];

function initAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(require(findServiceAccountPath()))
    });
  }
  return admin.firestore();
}

function makeTimestamp(dateStr, hour, minute = 0) {
  return `${dateStr} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

function safeDocIdPart(value) {
  return String(value).replace(/[^\w가-힣-]/g, "");
}

function buildOvertimeRecord(user, dateStr, spec, index) {
  const startHour = 16;
  const endHour = startHour + spec.duration;
  return {
    id: `APRV-OT-${safeDocIdPart(user.id)}-${dateStr.replace(/-/g, "")}-${index}`,
    userId: String(user.id),
    userName: user.name,
    dept: user.dept,
    role: user.role || "employee",
    type: "잔업",
    startDate: dateStr,
    endDate: dateStr,
    hours: spec.duration,
    timeRange: `${String(startHour).padStart(2, "0")}:00~${String(endHour).padStart(2, "0")}:00`,
    reason: spec.reason,
    status: "reported",
    timestamp: makeTimestamp(dateStr, endHour, index),
    specialLeaveTypeKey: "",
    specialLeaveTypeLabel: "",
    rejectReason: "",
    detailReason: "",
    reportCategory: "overtime",
    workDetail: spec.workDetail,
    requestDept: spec.requestDept,
    note: `${spec.workDetail}. ${spec.requestDept} 요청 건 보완을 위해 잔업 진행.`,
    requestedStartAt: `${String(startHour).padStart(2, "0")}:00`,
    requestedEndAt: `${String(endHour).padStart(2, "0")}:00`,
    reportedHours: spec.duration,
    settlementPeriodKey: "",
    settlementSubmittedAt: "",
    settlementSubmittedBy: "",
    settlementSubmittedByName: "",
    settlementStatus: "",
    settlementApprovedAt: "",
    settlementApprovedBy: "",
    settlementApprovedByName: "",
    settlementRejectedAt: "",
    settlementRejectedBy: "",
    settlementRejectedByName: "",
    settlementRejectReason: "",
    testTag: TEST_TAG,
    createdForTesting: true,
    seedBatchId: TEST_TAG,
    updatedAt: makeTimestamp(dateStr, endHour, index)
  };
}

function buildHolidayRecord(user, dateStr, spec, index) {
  return {
    id: `APRV-HW-${safeDocIdPart(user.id)}-${dateStr.replace(/-/g, "")}-${index}`,
    userId: String(user.id),
    userName: user.name,
    dept: user.dept,
    role: user.role || "employee",
    type: "특근",
    startDate: dateStr,
    endDate: dateStr,
    hours: 0,
    timeRange: "종일",
    reason: spec.reason,
    status: "reported",
    timestamp: makeTimestamp(dateStr, 9, index),
    specialLeaveTypeKey: "",
    specialLeaveTypeLabel: "",
    rejectReason: "",
    detailReason: "",
    reportCategory: "holiday_work",
    workDetail: spec.workDetail,
    requestDept: spec.requestDept,
    note: `${spec.workDetail}. ${spec.requestDept} 요청 건 대응을 위해 특근 진행.`,
    requestedStartAt: "",
    requestedEndAt: "",
    reportedHours: 0,
    settlementPeriodKey: "",
    settlementSubmittedAt: "",
    settlementSubmittedBy: "",
    settlementSubmittedByName: "",
    settlementStatus: "",
    settlementApprovedAt: "",
    settlementApprovedBy: "",
    settlementApprovedByName: "",
    settlementRejectedAt: "",
    settlementRejectedBy: "",
    settlementRejectedByName: "",
    settlementRejectReason: "",
    testTag: TEST_TAG,
    createdForTesting: true,
    seedBatchId: TEST_TAG,
    updatedAt: makeTimestamp(dateStr, 9, index)
  };
}

async function main() {
  const db = initAdmin();

  const existingTagged = await db.collection("requests").where("testTag", "==", TEST_TAG).get();
  if (!existingTagged.empty) {
    console.log(JSON.stringify({
      result: "skip",
      message: "same testTag data already exists",
      testTag: TEST_TAG,
      existingCount: existingTagged.size
    }, null, 2));
    return;
  }

  const records = [];
  let index = 1;

  for (let i = 0; i < TARGET_USERS.length; i += 1) {
    const target = TARGET_USERS[i];
    const userSnap = await db.collection("users").doc(String(target.id)).get();
    if (!userSnap.exists) {
      throw new Error(`target user not found: ${target.id}`);
    }
    const user = userSnap.data();
    const overtimeSpecA = OVERTIME_CASES[i % OVERTIME_CASES.length];
    const overtimeSpecB = OVERTIME_CASES[(i + 2) % OVERTIME_CASES.length];
    const holidaySpec = HOLIDAY_CASES[i % HOLIDAY_CASES.length];

    records.push(buildOvertimeRecord(user, target.date1, overtimeSpecA, index));
    index += 1;
    records.push(buildOvertimeRecord(user, target.date2, overtimeSpecB, index));
    index += 1;
    records.push(buildHolidayRecord(user, target.holiday, holidaySpec, index));
    index += 1;
  }

  let batch = db.batch();
  for (const record of records) {
    batch.set(db.collection("requests").doc(record.id), record, { merge: false });
  }
  await batch.commit();

  console.log(JSON.stringify({
    result: "success",
    inserted: records.length,
    testTag: TEST_TAG,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    overtimeCount: records.filter((item) => item.reportCategory === "overtime").length,
    holidayWorkCount: records.filter((item) => item.reportCategory === "holiday_work").length,
    users: [...new Set(records.map((item) => `${item.userId}:${item.userName}`))]
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
