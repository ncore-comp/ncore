"use strict";

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { findServiceAccountPath } = require("./import-firestore");

const TARGET_START_DATE = "2026-03-16";
const TARGET_TAGS = [
  "WORKREPORT_RANDOM7_SEED_2026-04-03",
  "WORKREPORT_EXTRA_OT_HEADCOUNT_2026-04-03"
];

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

function getTag(row = {}) {
  return text(row.testTag || row.seedBatchId || "");
}

function isTarget(row = {}) {
  const startDate = text(row.startDate);
  const tag = getTag(row);
  if (!startDate || startDate < TARGET_START_DATE) return false;
  if (!TARGET_TAGS.includes(tag)) return false;
  const type = text(row.type);
  const reportCategory = text(row.reportCategory);
  return ["잔업", "특근"].includes(type) || ["overtime", "holiday_work"].includes(reportCategory);
}

function makeBackupDir() {
  const dir = path.join(__dirname, "..", "backups", "2026-04-07_delete-test-workreports-mar16plus");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function main() {
  const db = initAdmin();
  const snap = await db.collection("requests").get();
  const targetDocs = snap.docs.filter((doc) => isTarget(doc.data()));
  const backupDir = makeBackupDir();

  const backupRows = targetDocs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));
  fs.writeFileSync(
    path.join(backupDir, "requests-target-backup.json"),
    JSON.stringify(backupRows, null, 2),
    "utf8"
  );

  const summaryBefore = {
    targetStartDate: TARGET_START_DATE,
    targetTags: TARGET_TAGS,
    total: targetDocs.length,
    byTag: {},
    byType: {},
    byUser: {}
  };

  for (const doc of targetDocs) {
    const row = doc.data() || {};
    const tag = getTag(row);
    const type = text(row.type);
    const userKey = `${text(row.userId)}:${text(row.userName)}`;
    summaryBefore.byTag[tag] = (summaryBefore.byTag[tag] || 0) + 1;
    summaryBefore.byType[type] = (summaryBefore.byType[type] || 0) + 1;
    summaryBefore.byUser[userKey] = (summaryBefore.byUser[userKey] || 0) + 1;
  }

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

  const verifySnap = await db.collection("requests").get();
  const remain = verifySnap.docs.filter((doc) => isTarget(doc.data()));

  const result = {
    result: "success",
    deleted: targetDocs.length,
    remaining: remain.length,
    backupDir,
    summaryBefore
  };

  fs.writeFileSync(
    path.join(backupDir, "delete-summary.json"),
    JSON.stringify(result, null, 2),
    "utf8"
  );

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
