"use strict";

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { findServiceAccountPath } = require("./import-firestore");

const ROOT_DIR = path.resolve(__dirname, "..");
const BACKUP_DIR = path.join(ROOT_DIR, "backups");
const HISTORY_PATH = path.join(BACKUP_DIR, "backup-history.json");
const SUMMARY_LATEST_PATH = path.join(BACKUP_DIR, "firestore-backup-summary-latest.json");
const SNAPSHOT_PREFIX = "firestore-backup-snapshot-";

const DEFAULT_COLLECTIONS = [
  "users",
  "requests",
  "boardPosts",
  "holidays",
  "specialLeaveTypes",
  "userSpecialLeaves",
  "mailRoutes",
  "accessLogs"
];

function nowIso() {
  return new Date().toISOString();
}

function timestampForFilename() {
  return nowIso().replace(/[:.]/g, "-");
}

function hasFlag(name) {
  return process.argv.slice(2).includes(name);
}

function resolveCollections() {
  const collections = DEFAULT_COLLECTIONS.slice();
  if (hasFlag("--exclude-access-logs")) {
    return collections.filter((name) => name !== "accessLogs");
  }
  return collections;
}

function loadJsonArray(filePath, fallback = []) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function trimHistory(history, maxItems = 50) {
  return history.slice(0, maxItems);
}

async function readCollection(db, collectionName) {
  const snap = await db.collection(collectionName).get();
  return {
    count: snap.size,
    docs: snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }))
  };
}

async function main() {
  const serviceAccountPath = findServiceAccountPath();
  const collections = resolveCollections();
  const appName = `backup-${Date.now()}`;

  admin.initializeApp(
    {
      credential: admin.credential.cert(require(serviceAccountPath))
    },
    appName
  );

  const db = admin.app(appName).firestore();
  const startedAt = nowIso();
  const snapshotName = `${SNAPSHOT_PREFIX}${timestampForFilename()}.json`;
  const snapshotPath = path.join(BACKUP_DIR, snapshotName);
  const backupPayload = {
    createdAt: startedAt,
    rootDir: ROOT_DIR,
    collections: {}
  };

  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    for (const collectionName of collections) {
      backupPayload.collections[collectionName] = await readCollection(db, collectionName);
    }

    fs.writeFileSync(snapshotPath, JSON.stringify(backupPayload, null, 2));

    const summary = {
      createdAt: startedAt,
      snapshotPath,
      collections: Object.fromEntries(
        Object.entries(backupPayload.collections).map(([name, value]) => [name, value.count])
      )
    };
    fs.writeFileSync(SUMMARY_LATEST_PATH, JSON.stringify(summary, null, 2));

    const history = loadJsonArray(HISTORY_PATH, []);
    history.unshift({
      createdAt: startedAt,
      status: "success",
      snapshotPath,
      collections: summary.collections
    });
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(trimHistory(history), null, 2));

    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const history = loadJsonArray(HISTORY_PATH, []);
    history.unshift({
      createdAt: startedAt,
      status: "failed",
      snapshotPath: null,
      error: error.message
    });
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(trimHistory(history), null, 2));
    console.error("backup-firestore failed:", error.message);
    process.exitCode = 1;
  } finally {
    await admin.app(appName).delete().catch(() => {});
  }
}

main();
