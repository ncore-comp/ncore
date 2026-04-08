"use strict";

const admin = require("firebase-admin");
const { findServiceAccountPath } = require("./import-firestore");

function initAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(require(findServiceAccountPath()))
    });
  }
  return admin.firestore();
}

function text(value) {
  return String(value || "").trim();
}

function buildReadableNote(row) {
  const workDetail = text(row.workDetail);
  const requestDept = text(row.requestDept);
  const reason = text(row.reason);
  const category = text(row.reportCategory);

  if (category === "holiday_work") {
    if (workDetail && requestDept) return `${workDetail}. ${requestDept} 요청 건 대응을 위해 특근 진행.`;
    if (workDetail) return `${workDetail}. 특근 진행.`;
    if (reason && requestDept) return `${reason} 사유로 ${requestDept} 요청 건 특근 진행.`;
    if (reason) return `${reason} 사유로 특근 진행.`;
    return "주말/휴일 대응 업무를 위해 특근 진행.";
  }

  if (workDetail && requestDept) return `${workDetail}. ${requestDept} 요청 건 보완을 위해 잔업 진행.`;
  if (workDetail) return `${workDetail}. 잔업 진행.`;
  if (reason && requestDept) return `${reason} 사유로 ${requestDept} 요청 건 보완 잔업 진행.`;
  if (reason) return `${reason} 사유로 잔업 진행.`;
  return "업무 일정 보완을 위해 잔업 진행.";
}

async function main() {
  const db = initAdmin();
  const snap = await db.collection("requests").where("createdForTesting", "==", true).get();
  const docs = snap.docs.filter((doc) => {
    const data = doc.data() || {};
    return ["overtime", "holiday_work"].includes(text(data.reportCategory));
  });

  if (!docs.length) {
    console.log(JSON.stringify({
      result: "skip",
      message: "test work report rows not found"
    }, null, 2));
    return;
  }

  let batch = db.batch();
  let count = 0;
  for (const doc of docs) {
    const data = doc.data() || {};
    const note = buildReadableNote(data);
    batch.set(doc.ref, {
      note,
      updatedAt: text(data.updatedAt) || new Date().toISOString().slice(0, 19).replace("T", " ")
    }, { merge: true });
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
    updated: docs.length
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
