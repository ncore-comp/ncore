"use strict";

const admin = require("firebase-admin");
const { findServiceAccountPath } = require("./import-firestore");

function text(value) {
  return String(value == null ? "" : value).trim();
}

async function main() {
  const serviceAccountPath = findServiceAccountPath();
  const appName = `fill-q3q4-${Date.now()}`;

  admin.initializeApp(
    {
      credential: admin.credential.cert(require(serviceAccountPath))
    },
    appName
  );

  const db = admin.app(appName).firestore();
  const usersSnap = await db.collection("users").get();
  const results = [];

  try {
    for (const doc of usersSnap.docs) {
      const data = doc.data() || {};
      const q2 = text(data.workQ2);
      const q3 = text(data.workQ3);
      const q4 = text(data.workQ4);
      if (!q2) continue;

      const patch = {};
      if (!q3) patch.workQ3 = q2;
      if (!q4) patch.workQ4 = q2;
      if (!Object.keys(patch).length) continue;

      patch.updatedAt = new Date().toISOString();
      await doc.ref.set(patch, { merge: true });
      results.push({
        id: doc.id,
        name: text(data.name),
        dept: text(data.dept),
        workQ2: q2,
        updated: Object.keys(patch).filter((key) => key.startsWith("workQ"))
      });
    }

    const summary = {
      ok: true,
      updatedCount: results.length,
      updatedUsers: results
    };
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await admin.app(appName).delete().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
