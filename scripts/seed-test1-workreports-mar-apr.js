"use strict";

const admin = require("firebase-admin");
const { findServiceAccountPath } = require("./import-firestore");

const TEST_TAG = "TEST1_WORKREPORT_SEED_2026-04-02";
const TARGET_USER_ID = "1";
const PERIOD_START = "2026-03-16";
const PERIOD_END = "2026-04-15";

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

function buildOvertime(user, spec, index) {
  const startHour = spec.startHour;
  const endHour = startHour + spec.duration;
  const id = `TEST1-OT-${spec.date.replace(/-/g, "")}-${index}`;
  return {
    id,
    userId: TARGET_USER_ID,
    userName: user.name,
    dept: user.dept,
    role: user.role || "employee",
    type: "잔업",
    startDate: spec.date,
    endDate: spec.date,
    hours: spec.duration,
    timeRange: `${String(startHour).padStart(2, "0")}:00~${String(endHour).padStart(2, "0")}:00`,
    reason: spec.reason,
    status: "reported",
    timestamp: makeTimestamp(spec.date, endHour, index),
    specialLeaveTypeKey: "",
    specialLeaveTypeLabel: "",
    rejectReason: "",
    detailReason: "",
    reportCategory: "overtime",
    workDetail: spec.workDetail,
    requestDept: spec.requestDept,
    note: spec.note,
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
    updatedAt: makeTimestamp(spec.date, endHour, index)
  };
}

function buildHolidayWork(user, spec, index) {
  const id = `TEST1-HW-${spec.date.replace(/-/g, "")}-${index}`;
  return {
    id,
    userId: TARGET_USER_ID,
    userName: user.name,
    dept: user.dept,
    role: user.role || "employee",
    type: "특근",
    startDate: spec.date,
    endDate: spec.date,
    hours: 0,
    timeRange: "종일",
    reason: spec.reason,
    status: "reported",
    timestamp: makeTimestamp(spec.date, 9, index),
    specialLeaveTypeKey: "",
    specialLeaveTypeLabel: "",
    rejectReason: "",
    detailReason: "",
    reportCategory: "holiday_work",
    workDetail: spec.workDetail,
    requestDept: spec.requestDept,
    note: spec.note,
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
    updatedAt: makeTimestamp(spec.date, 9, index)
  };
}

function buildSeedRecords(user) {
  const overtimeSpecs = [
    { date: "2026-03-16", startHour: 16, duration: 1, reason: "월요일 마감 대응", workDetail: "전주 미완료 문서 마감 처리", requestDept: "연구기획", note: `${TEST_TAG} / 3월 16일 잔업` },
    { date: "2026-03-17", startHour: 16, duration: 2, reason: "자료 검토", workDetail: "검토 요청 자료 비교 정리", requestDept: "품질기획", note: `${TEST_TAG} / 3월 17일 잔업` },
    { date: "2026-03-18", startHour: 16, duration: 1, reason: "회의 준비", workDetail: "주간 회의용 수치 자료 작성", requestDept: "연구기획", note: `${TEST_TAG} / 3월 18일 잔업` },
    { date: "2026-03-19", startHour: 16, duration: 3, reason: "출하 대응", workDetail: "출하 일정 변경 반영 및 확인", requestDept: "생산관리", note: `${TEST_TAG} / 3월 19일 잔업` },
    { date: "2026-03-23", startHour: 16, duration: 2, reason: "자료 보완", workDetail: "고객 요청 반영 자료 보완", requestDept: "연구기획", note: `${TEST_TAG} / 3월 23일 잔업` },
    { date: "2026-03-24", startHour: 16, duration: 1, reason: "업무 인수인계", workDetail: "인계용 체크리스트 정리", requestDept: "생산관리", note: `${TEST_TAG} / 3월 24일 잔업` },
    { date: "2026-03-25", startHour: 16, duration: 2, reason: "대응 문서 작성", workDetail: "대응 경위서 및 메일 문안 작성", requestDept: "경영지원", note: `${TEST_TAG} / 3월 25일 잔업` },
    { date: "2026-03-26", startHour: 16, duration: 1, reason: "검토 요청 대응", workDetail: "수정 요청 반영 후 재공유", requestDept: "품질기획", note: `${TEST_TAG} / 3월 26일 잔업` },
    { date: "2026-03-30", startHour: 16, duration: 2, reason: "자료 취합", workDetail: "월말 취합 자료 정리", requestDept: "연구기획", note: `${TEST_TAG} / 3월 30일 잔업` },
    { date: "2026-03-31", startHour: 16, duration: 1, reason: "정산 준비", workDetail: "정산 직전 제출 자료 점검", requestDept: "경영지원", note: `${TEST_TAG} / 3월 31일 잔업` },
    { date: "2026-04-01", startHour: 16, duration: 2, reason: "자료 수정", workDetail: "요청 반영본 재정리", requestDept: "영업지원", note: `${TEST_TAG} / 4월 1일 잔업` },
    { date: "2026-04-02", startHour: 16, duration: 1, reason: "검토 대응", workDetail: "검토 코멘트 회신 정리", requestDept: "품질기획", note: `${TEST_TAG} / 4월 2일 잔업` }
  ];

  const holidaySpecs = [
    { date: "2026-03-21", reason: "주말 특근", workDetail: "긴급 요청 샘플 검토 및 결과 정리", requestDept: "연구기획", note: `${TEST_TAG} / 3월 21일 특근` },
    { date: "2026-03-22", reason: "주말 특근", workDetail: "자료 이관 전 점검 및 품질 확인", requestDept: "영업지원", note: `${TEST_TAG} / 3월 22일 특근` },
    { date: "2026-03-28", reason: "주말 특근", workDetail: "주간 누적 업무 마감 처리", requestDept: "생산관리", note: `${TEST_TAG} / 3월 28일 특근` },
    { date: "2026-03-29", reason: "주말 특근", workDetail: "월말 보고 자료 사전 작성", requestDept: "연구기획", note: `${TEST_TAG} / 3월 29일 특근` },
    { date: "2026-04-04", reason: "주말 특근", workDetail: "긴급 수정본 재검토 및 배포 준비", requestDept: "품질기획", note: `${TEST_TAG} / 4월 4일 특근` },
    { date: "2026-04-05", reason: "주말 특근", workDetail: "차주 보고용 자료 사전 편집", requestDept: "경영지원", note: `${TEST_TAG} / 4월 5일 특근` },
    { date: "2026-04-11", reason: "주말 특근", workDetail: "정산 마감 전 누락 데이터 확인", requestDept: "연구기획", note: `${TEST_TAG} / 4월 11일 특근` },
    { date: "2026-04-12", reason: "주말 특근", workDetail: "정산 제출 전 최종 검토 및 정리", requestDept: "경영지원", note: `${TEST_TAG} / 4월 12일 특근` }
  ];

  const records = [];
  let index = 1;
  for (const spec of overtimeSpecs) {
    records.push(buildOvertime(user, spec, index));
    index += 1;
  }
  for (const spec of holidaySpecs) {
    records.push(buildHolidayWork(user, spec, index));
    index += 1;
  }
  return records;
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

  const userSnap = await db.collection("users").doc(TARGET_USER_ID).get();
  if (!userSnap.exists) {
    throw new Error(`target user not found: ${TARGET_USER_ID}`);
  }
  const user = userSnap.data();
  const records = buildSeedRecords(user);

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
    testTag: TEST_TAG,
    targetUserId: TARGET_USER_ID,
    overtimeCount: records.filter((item) => item.reportCategory === "overtime").length,
    holidayWorkCount: records.filter((item) => item.reportCategory === "holiday_work").length,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
