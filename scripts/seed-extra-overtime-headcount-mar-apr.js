"use strict";

const admin = require("firebase-admin");
const { findServiceAccountPath } = require("./import-firestore");

const TEST_TAG = "WORKREPORT_EXTRA_OT_HEADCOUNT_2026-04-03";
const TARGET_USERS = [
  { id: "고다현", date: "2026-04-06", duration: 1, reason: "자료 보완", workDetail: "고객 요청 반영 문서 보완", requestDept: "연구기획" },
  { id: "권윤희", date: "2026-04-07", duration: 2, reason: "검토 대응", workDetail: "검토 코멘트 반영 및 재정리", requestDept: "품질기획" },
  { id: "김기민", date: "2026-04-08", duration: 1, reason: "문서 정리", workDetail: "월간 공유 문서 마감 정리", requestDept: "경영지원" }
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
  for (const spec of TARGET_USERS) {
    const userSnap = await db.collection("users").doc(spec.id).get();
    if (!userSnap.exists) {
      throw new Error(`target user not found: ${spec.id}`);
    }
    const user = userSnap.data();
    const startHour = 16;
    const endHour = startHour + spec.duration;
    records.push({
      id: `OTHC-${String(spec.id).replace(/[^\w가-힣-]/g, "")}-${spec.date.replace(/-/g, "")}-${index}`,
      userId: String(user.id),
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
      updatedAt: makeTimestamp(spec.date, endHour, index)
    });
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
    users: records.map((row) => ({ userId: row.userId, userName: row.userName, date: row.startDate, hours: row.reportedHours }))
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
