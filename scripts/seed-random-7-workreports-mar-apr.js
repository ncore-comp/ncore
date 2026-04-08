"use strict";

const admin = require("firebase-admin");
const { findServiceAccountPath } = require("./import-firestore");

const TEST_TAG = "WORKREPORT_RANDOM7_SEED_2026-04-03";
const PERIOD_START = "2026-03-16";
const PERIOD_END = "2026-04-15";
const TARGET_USER_COUNT = 7;
const OVERTIME_DATES = [
  "2026-03-16", "2026-03-17", "2026-03-18", "2026-03-19", "2026-03-20",
  "2026-03-23", "2026-03-24", "2026-03-25", "2026-03-26", "2026-03-27",
  "2026-03-30", "2026-03-31", "2026-04-01", "2026-04-02", "2026-04-03",
  "2026-04-06", "2026-04-07", "2026-04-08", "2026-04-09", "2026-04-10",
  "2026-04-13", "2026-04-14", "2026-04-15"
];
const HOLIDAY_DATES = [
  "2026-03-21", "2026-03-22", "2026-03-28", "2026-03-29",
  "2026-04-04", "2026-04-05", "2026-04-11", "2026-04-12"
];
const OVERTIME_REASONS = [
  "자료 보완", "회의 준비", "출하 대응", "문서 정리", "검토 대응", "자료 취합", "일정 보완", "요청 대응"
];
const HOLIDAY_REASONS = [
  "주말 특근", "긴급 특근", "정산 특근", "마감 특근"
];
const WORK_DETAILS = [
  "고객 요청 자료 보완 및 재정리",
  "주간 보고용 수치 검토 및 정리",
  "출하 일정 변경 반영 및 확인",
  "수정본 비교 및 재배포 준비",
  "정산 제출 전 누락 데이터 검토",
  "회의용 자료 초안 정리 및 보완",
  "월말 마감 대응 문서 작성",
  "긴급 요청본 검토 및 최종 정리"
];
const REQUEST_DEPTS = ["연구기획", "품질기획", "생산관리", "경영지원", "영업지원"];

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

function hashSeed(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRng(seedText) {
  let state = hashSeed(seedText) || 123456789;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pickOne(list, rng) {
  return list[Math.floor(rng() * list.length)];
}

function shuffle(list, rng) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildOvertime(user, dateStr, duration, reason, workDetail, requestDept, note, index) {
  const startHour = 16;
  const endHour = startHour + duration;
  const safeId = String(user.id).replace(/[^\w가-힣-]/g, "");
  return {
    id: `WR7-OT-${safeId}-${dateStr.replace(/-/g, "")}-${index}`,
    userId: String(user.id),
    userName: user.name,
    dept: user.dept,
    role: user.role || "employee",
    type: "잔업",
    startDate: dateStr,
    endDate: dateStr,
    hours: duration,
    timeRange: `${String(startHour).padStart(2, "0")}:00~${String(endHour).padStart(2, "0")}:00`,
    reason,
    status: "reported",
    timestamp: makeTimestamp(dateStr, endHour, index),
    specialLeaveTypeKey: "",
    specialLeaveTypeLabel: "",
    rejectReason: "",
    detailReason: "",
    reportCategory: "overtime",
    workDetail,
    requestDept,
    note,
    requestedStartAt: `${String(startHour).padStart(2, "0")}:00`,
    requestedEndAt: `${String(endHour).padStart(2, "0")}:00`,
    reportedHours: duration,
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

function buildHolidayWork(user, dateStr, reason, workDetail, requestDept, note, index) {
  const safeId = String(user.id).replace(/[^\w가-힣-]/g, "");
  return {
    id: `WR7-HW-${safeId}-${dateStr.replace(/-/g, "")}-${index}`,
    userId: String(user.id),
    userName: user.name,
    dept: user.dept,
    role: user.role || "employee",
    type: "특근",
    startDate: dateStr,
    endDate: dateStr,
    hours: 0,
    timeRange: "종일",
    reason,
    status: "reported",
    timestamp: makeTimestamp(dateStr, 9, index),
    specialLeaveTypeKey: "",
    specialLeaveTypeLabel: "",
    rejectReason: "",
    detailReason: "",
    reportCategory: "holiday_work",
    workDetail,
    requestDept,
    note,
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

  const usersSnap = await db.collection("users").get();
  const allUsers = usersSnap.docs.map((doc) => doc.data()).filter((user) => {
    if (!user) return false;
    if (user.role === "master" || user.role === "ceo") return false;
    if (String(user.id) === "1") return false;
    return true;
  });

  const rng = createRng(TEST_TAG);
  const selectedUsers = shuffle(allUsers, rng).slice(0, TARGET_USER_COUNT);
  const records = [];
  let index = 1;

  selectedUsers.forEach((user, userIdx) => {
    const overtimeDatePool = shuffle(OVERTIME_DATES, rng).slice(0, 2);
    const holidayDate = pickOne(HOLIDAY_DATES, rng);

    overtimeDatePool.forEach((dateStr, localIdx) => {
      const duration = [1, 2, 3][Math.floor(rng() * 3)];
      const reason = pickOne(OVERTIME_REASONS, rng);
      const workDetail = pickOne(WORK_DETAILS, rng);
      const requestDept = pickOne(REQUEST_DEPTS, rng);
      const note = `${TEST_TAG} / ${user.name} / 잔업 ${localIdx + 1}`;
      records.push(buildOvertime(user, dateStr, duration, reason, workDetail, requestDept, note, index));
      index += 1;
    });

    const holidayReason = pickOne(HOLIDAY_REASONS, rng);
    const holidayWorkDetail = pickOne(WORK_DETAILS, rng);
    const holidayRequestDept = pickOne(REQUEST_DEPTS, rng);
    const holidayNote = `${TEST_TAG} / ${user.name} / 특근`;
    records.push(buildHolidayWork(user, holidayDate, holidayReason, holidayWorkDetail, holidayRequestDept, holidayNote, index));
    index += 1;
  });

  let batch = db.batch();
  let count = 0;
  for (const record of records) {
    const ref = db.collection("requests").doc(record.id);
    batch.set(ref, record, { merge: false });
    count += 1;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  if (count % 400 !== 0) {
    await batch.commit();
  }

  console.log(JSON.stringify({
    result: "success",
    inserted: records.length,
    selectedUsers: selectedUsers.map((user) => ({
      id: String(user.id),
      name: user.name,
      dept: user.dept,
      role: user.role
    })),
    testTag: TEST_TAG,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    overtimeCount: records.filter((item) => item.reportCategory === "overtime").length,
    holidayWorkCount: records.filter((item) => item.reportCategory === "holiday_work").length
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
