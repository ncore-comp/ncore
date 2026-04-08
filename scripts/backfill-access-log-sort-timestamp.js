"use strict";

const admin = require("firebase-admin");
const { findServiceAccountPath } = require("./import-firestore");
const { normalizeLogSortTimestamp } = require("../functions/src/lib/common");

function initAdmin() {
  if (admin.apps.length) return admin.firestore();
  admin.initializeApp({
    credential: admin.credential.cert(require(findServiceAccountPath()))
  });
  return admin.firestore();
}

async function main() {
  const db = initAdmin();
  const snap = await db.collection("accessLogs").get();
  let updated = 0;
  let skipped = 0;
  let invalid = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const nextSort = normalizeLogSortTimestamp(data.sortTimestamp || data.timestamp, 0);
    if (!nextSort) {
      invalid += 1;
      continue;
    }
    if (Number(data.sortTimestamp || 0) === Number(nextSort)) {
      skipped += 1;
      continue;
    }
    batch.update(doc.ref, { sortTimestamp: nextSort });
    batchCount += 1;
    updated += 1;
    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) await batch.commit();

  console.log(JSON.stringify({
    total: snap.size,
    updated,
    skipped,
    invalid
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
