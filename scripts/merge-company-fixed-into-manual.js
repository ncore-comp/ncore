"use strict";

const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(process.cwd(), "ncore-vacation-system-firebase-adminsdk-fbsvc-ddef59ca56.json"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

function isCompanyFixedLike(item = {}) {
  const source = String(item.source || "").toLowerCase();
  const provider = String(item.provider || "").toLowerCase();
  const category = String(item.category || "").toLowerCase();
  const id = String(item.id || "").toLowerCase();
  return source === "company_fixed" || provider === "ncore-fixed" || category === "company_fixed" || id.startsWith("company-fixed-");
}

async function main() {
  const snap = await db.collection("holidays").get();
  const targets = snap.docs
    .map((doc) => ({ id: doc.id, ref: doc.ref, ...doc.data() }))
    .filter((item) => isCompanyFixedLike(item));

  const batch = db.batch();
  targets.forEach((item) => {
    batch.set(item.ref, {
      ...item,
      id: item.id,
      source: "manual",
      provider: "ncore-fixed",
      category: "company_fixed",
      updatedAt: new Date().toISOString()
    }, { merge: true });
  });
  await batch.commit();

  console.log(JSON.stringify({
    result: "success",
    updatedCount: targets.length,
    ids: targets.map((item) => item.id)
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
