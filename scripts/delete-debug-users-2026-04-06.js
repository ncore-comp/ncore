"use strict";

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SERVICE_ACCOUNT_PATH = path.join(ROOT, "ncore-vacation-system-firebase-adminsdk-fbsvc-ddef59ca56.json");

const TARGET_IDS = [
  "DBG_ANNUAL_debug_1775443102050",
  "DBG2_debug2_1775443210968",
  "DBG3_debug3_1775443279129",
  "DBG4_debug4_1775443496910",
  "DBG5_debug5_1775443593767",
  "DBG6_debug6_1775443632231"
];

function initAdmin() {
  if (admin.apps.length) return admin.firestore();
  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin.firestore();
}

async function main() {
  const db = initAdmin();
  const result = {
    targetCount: TARGET_IDS.length,
    deleted: [],
    missing: [],
    blocked: []
  };

  for (const id of TARGET_IDS) {
    const userRef = db.collection("users").doc(id);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      result.missing.push(id);
      continue;
    }

    const reqSnap = await db.collection("requests").where("userId", "==", id).get();
    const specialSnap = await db.collection("userSpecialLeaves").where("userId", "==", id).get();
    if (!reqSnap.empty || !specialSnap.empty) {
      result.blocked.push({
        id,
        requestCount: reqSnap.size,
        specialLeaveCount: specialSnap.size
      });
      continue;
    }

    await userRef.delete();
    result.deleted.push(id);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
