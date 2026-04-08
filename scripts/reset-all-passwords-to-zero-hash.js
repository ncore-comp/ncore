"use strict";

const admin = require("firebase-admin");
const { findServiceAccountPath } = require("./import-firestore");
const { createPasswordRecord } = require("../functions/src/lib/password");

function initAdmin() {
  if (admin.apps.length) return admin.firestore();
  admin.initializeApp({
    credential: admin.credential.cert(require(findServiceAccountPath()))
  });
  return admin.firestore();
}

async function main() {
  const db = initAdmin();
  const snap = await db.collection("users").get();
  let updated = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snap.docs) {
    const zeroRecord = createPasswordRecord("0");
    batch.set(
      doc.ref,
      {
        password: "",
        passwordAlgo: zeroRecord.passwordAlgo,
        passwordHash: zeroRecord.passwordHash,
        passwordSalt: zeroRecord.passwordSalt,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
    updated += 1;
    batchCount += 1;
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
    initialPassword: "0",
    algorithm: "scrypt"
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
