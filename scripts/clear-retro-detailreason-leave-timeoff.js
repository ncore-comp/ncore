"use strict";

const admin = require("firebase-admin");
const { findServiceAccountPath } = require("./import-firestore");

const TARGET_TYPES = new Set([
  "연차",
  "반차",
  "반차(4시간/오전)",
  "반차(4시간/오후)",
  "반차(오후)",
  "시간차(퇴근)",
  "시간차(외출)"
]);

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

async function main() {
  const db = initAdmin();
  const snap = await db.collection("requests").get();
  const targetDocs = snap.docs.filter((doc) => {
    const row = doc.data() || {};
    return TARGET_TYPES.has(text(row.type));
  });

  if (!targetDocs.length) {
    console.log(JSON.stringify({
      result: "skip",
      updated: 0,
      message: "no leave/timeoff rows found"
    }, null, 2));
    return;
  }

  let batch = db.batch();
  let count = 0;
  for (const doc of targetDocs) {
    batch.set(doc.ref, {
      detailReason: admin.firestore.FieldValue.delete()
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
    updated: targetDocs.length,
    targetTypes: [...TARGET_TYPES]
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
