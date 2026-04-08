"use strict";

const admin = require("firebase-admin");
const { findServiceAccountPath } = require("./import-firestore");

const TARGET_USER_IDS = new Set(["0", "1"]);

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

function isTargetOvertime(row = {}) {
  const userId = text(row.userId);
  const reportCategory = text(row.reportCategory);
  const type = text(row.type);
  if (!TARGET_USER_IDS.has(userId)) return false;
  return reportCategory === "overtime" || type === "잔업";
}

async function main() {
  const db = initAdmin();
  const snap = await db.collection("requests").get();
  const targetDocs = snap.docs.filter((doc) => isTargetOvertime(doc.data()));

  if (!targetDocs.length) {
    console.log(JSON.stringify({
      result: "skip",
      deleted: 0,
      message: "no target overtime rows found"
    }, null, 2));
    return;
  }

  const sample = targetDocs.slice(0, 10).map((doc) => {
    const row = doc.data() || {};
    return {
      id: doc.id,
      userId: text(row.userId),
      userName: text(row.userName),
      startDate: text(row.startDate),
      testTag: text(row.testTag),
      createdForTesting: !!row.createdForTesting
    };
  });

  let batch = db.batch();
  let count = 0;
  for (const doc of targetDocs) {
    batch.delete(doc.ref);
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
    deleted: targetDocs.length,
    byUser: targetDocs.reduce((acc, doc) => {
      const row = doc.data() || {};
      const key = `${text(row.userId)}:${text(row.userName)}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    sample
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
