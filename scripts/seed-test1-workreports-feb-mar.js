"use strict";

const admin = require("firebase-admin");
const { findServiceAccountPath } = require("./import-firestore");

const TEST_TAG = "TEST1_WORKREPORT_SEED_2026-04-01";
const TARGET_USER_ID = "1";

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

function buildOvertime(dateStr, duration, reason, workDetail, requestDept, note, index) {
  const startHour = 16;
  const endHour = startHour + duration;
  const id = `TEST1-OT-${dateStr.replace(/-/g, "")}-${index}`;
  return {
    id,
    userId: TARGET_USER_ID,
    userName: "테스트1",
    dept: "매뉴얼팀",
    role: "employee",
    type: "잔업",
    startDate: dateStr,
    endDate: dateStr,
    hours: duration,
    timeRange: `${String(startHour).padStart(2, "0")}:00~${String(endHour).padStart(2, "0")}:00`,
    reason,
    status: "reported",
    timestamp: makeTimestamp(dateStr, 18, index),
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
    testTag: TEST_TAG,
    createdForTesting: true,
    seedBatchId: TEST_TAG,
    updatedAt: makeTimestamp(dateStr, 18, index)
  };
}

function buildHolidayWork(dateStr, startHour, duration, reason, workDetail, requestDept, note, index) {
  const endHour = startHour + duration;
  const id = `TEST1-HW-${dateStr.replace(/-/g, "")}-${index}`;
  return {
    id,
    userId: TARGET_USER_ID,
    userName: "테스트1",
    dept: "매뉴얼팀",
    role: "employee",
    type: "특근",
    startDate: dateStr,
    endDate: dateStr,
    hours: duration,
    timeRange: `${String(startHour).padStart(2, "0")}:00~${String(endHour).padStart(2, "0")}:00`,
    reason,
    status: "reported",
    timestamp: makeTimestamp(dateStr, startHour, index),
    specialLeaveTypeKey: "",
    specialLeaveTypeLabel: "",
    rejectReason: "",
    detailReason: "",
    reportCategory: "holiday_work",
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
    testTag: TEST_TAG,
    createdForTesting: true,
    seedBatchId: TEST_TAG,
    updatedAt: makeTimestamp(dateStr, startHour, index)
  };
}

async function main() {
  const db = initAdmin();
  const existingTagged = await db.collection("requests").where("testTag", "==", TEST_TAG).get();
  if (!existingTagged.empty) {
    console.log(JSON.stringify({
      result: "skip",
      message: "이미 같은 testTag 데이터가 존재합니다.",
      testTag: TEST_TAG,
      existingCount: existingTagged.size
    }, null, 2));
    return;
  }

  const records = [
    buildOvertime("2026-02-17", 1, "긴급 일정 대응", "고객 요청 자료 정리 및 일정 보완", "연구기획", `${TEST_TAG} / 2월 1차 잔업`, 1),
    buildOvertime("2026-02-18", 2, "자료 검토", "시험 결과 비교표 재정리", "품질기획", `${TEST_TAG} / 2월 2차 잔업`, 2),
    buildOvertime("2026-02-19", 1, "회의 준비", "주간 회의 보고자료 제작", "연구기획", `${TEST_TAG} / 2월 3차 잔업`, 3),
    buildOvertime("2026-02-20", 3, "출하 대응", "출하 전 점검표 검수 및 누락 확인", "생산관리", `${TEST_TAG} / 2월 4차 잔업`, 4),
    buildHolidayWork("2026-02-21", 9, 4, "주말 특근", "긴급 요청 품목 테스트 진행", "연구기획", `${TEST_TAG} / 2월 주말 특근`, 5),
    buildHolidayWork("2026-02-22", 10, 3, "주말 특근", "시장 클레임 대응 자료 준비", "영업지원", `${TEST_TAG} / 2월 주말 특근`, 6),
    buildOvertime("2026-02-23", 1, "자료 보완", "요구사항 문서 수정", "연구기획", `${TEST_TAG} / 2월 5차 잔업`, 7),
    buildOvertime("2026-02-24", 2, "업무 인수인계", "공정 이슈 정리와 전달자료 작성", "생산관리", `${TEST_TAG} / 2월 6차 잔업`, 8),
    buildOvertime("2026-02-25", 1, "대응 문서 작성", "신규 요청 양식 정리", "경영지원", `${TEST_TAG} / 2월 7차 잔업`, 9),
    buildOvertime("2026-02-26", 2, "검토 요청 대응", "파트별 피드백 반영", "품질기획", `${TEST_TAG} / 2월 8차 잔업`, 10),
    buildOvertime("2026-02-27", 1, "자료 취합", "월말 보고용 수치 취합", "연구기획", `${TEST_TAG} / 2월 9차 잔업`, 11),
    buildHolidayWork("2026-02-28", 9, 5, "토요 특근", "납기 일정 보완용 시험 진행", "생산관리", `${TEST_TAG} / 2월 말 특근`, 12),
    buildHolidayWork("2026-03-01", 9, 4, "공휴일 특근", "긴급 샘플 확인 및 보고", "연구기획", `${TEST_TAG} / 3월 공휴일 특근`, 13),
    buildOvertime("2026-03-02", 1, "일정 보완", "주간 일정 재조정", "연구기획", `${TEST_TAG} / 3월 1차 잔업`, 14),
    buildOvertime("2026-03-03", 2, "자료 수정", "고객 코멘트 반영 문서 수정", "영업지원", `${TEST_TAG} / 3월 2차 잔업`, 15),
    buildOvertime("2026-03-04", 1, "검토 대응", "리뷰 코멘트 정리", "품질기획", `${TEST_TAG} / 3월 3차 잔업`, 16),
    buildHolidayWork("2026-03-07", 10, 3, "주말 특근", "시험 샘플 후처리", "연구기획", `${TEST_TAG} / 3월 주말 특근`, 17),
    buildHolidayWork("2026-03-08", 9, 4, "주말 특근", "주간 보고용 데이터 정리", "경영지원", `${TEST_TAG} / 3월 주말 특근`, 18),
    buildHolidayWork("2026-03-14", 9, 5, "주말 특근", "정산 직전 누락분 대응", "연구기획", `${TEST_TAG} / 3월 정산 전 특근`, 19),
    buildHolidayWork("2026-03-15", 10, 3, "주말 특근", "정산 마감일 최종 자료 점검", "연구기획", `${TEST_TAG} / 3월 정산 마감 특근`, 20)
  ];

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
  if (count % 400 !== 0) await batch.commit();

  console.log(JSON.stringify({
    result: "success",
    inserted: records.length,
    testTag: TEST_TAG,
    targetUserId: TARGET_USER_ID,
    overtimeCount: records.filter((item) => item.reportCategory === "overtime").length,
    holidayWorkCount: records.filter((item) => item.reportCategory === "holiday_work").length,
    periodStart: "2026-02-17",
    periodEnd: "2026-03-15"
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
