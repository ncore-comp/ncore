const path = require("path");
const admin = require("firebase-admin");
const {
  loadWorkbook,
  sheetToJson,
  normalizeUser,
  normalizeRequest,
  normalizeBoardPost,
  normalizeHoliday,
  normalizeSpecialLeaveType,
  normalizeUserSpecialLeave,
  normalizeMailRoute,
  normalizeAccessLog,
  findServiceAccountPath
} = require("./import-firestore");

const COLLECTIONS = [
  {
    sheetName: "Users",
    collectionName: "users",
    idField: "id",
    normalize: normalizeUser
  },
  {
    sheetName: "Requests",
    collectionName: "requests",
    idField: "id",
    normalize: normalizeRequest
  },
  {
    sheetName: "BoardPosts",
    collectionName: "boardPosts",
    idField: "id",
    normalize: normalizeBoardPost
  },
  {
    sheetName: "Holidays",
    collectionName: "holidays",
    idField: "id",
    normalize: normalizeHoliday
  },
  {
    sheetName: "SpecialLeaveTypes",
    collectionName: "specialLeaveTypes",
    idField: "typeKey",
    normalize: normalizeSpecialLeaveType
  },
  {
    sheetName: "UserSpecialLeaves",
    collectionName: "userSpecialLeaves",
    idField: "id",
    normalize: normalizeUserSpecialLeave
  },
  {
    sheetName: "MailRoutes",
    collectionName: "mailRoutes",
    idField: "id",
    normalize: normalizeMailRoute
  },
  {
    sheetName: "AccessLogs",
    collectionName: "accessLogs",
    idField: "id",
    normalize: normalizeAccessLog
  }
];

function omitMeta(value) {
  const clone = { ...value };
  delete clone.migratedAt;
  return clone;
}

function sortValue(value) {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortValue(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(sortValue(value));
}

async function getFirestoreMap(db, collectionName) {
  const snap = await db.collection(collectionName).get();
  const map = new Map();
  snap.forEach((doc) => {
    map.set(doc.id, doc.data());
  });
  return map;
}

async function main() {
  const workbook = loadWorkbook();
  const serviceAccountPath = findServiceAccountPath();

  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
  });

  const db = admin.firestore();

  for (const config of COLLECTIONS) {
    const rawRows = sheetToJson(workbook, config.sheetName);
    const normalizedRows = rawRows
      .map((row, index) =>
        config.sheetName === "AccessLogs" ? config.normalize(row, index) : config.normalize(row)
      )
      .filter((item) => String(item[config.idField] || "").trim());

    const rawCount = rawRows.length;
    const validCount = normalizedRows.length;
    const ignoredCount = rawCount - validCount;

    const excelMap = new Map(
      normalizedRows.map((item) => [String(item[config.idField]), omitMeta(item)])
    );
    const firestoreMap = await getFirestoreMap(db, config.collectionName);

    const missingInFirestore = [];
    const extraInFirestore = [];
    const mismatched = [];

    for (const [id, excelValue] of excelMap.entries()) {
      if (!firestoreMap.has(id)) {
        missingInFirestore.push(id);
        continue;
      }

      const firestoreValue = omitMeta(firestoreMap.get(id));
      if (stableJson(excelValue) !== stableJson(firestoreValue)) {
        mismatched.push(id);
      }
    }

    for (const id of firestoreMap.keys()) {
      if (!excelMap.has(id)) {
        extraInFirestore.push(id);
      }
    }

    console.log(`\n[${config.sheetName} -> ${config.collectionName}]`);
    console.log(`rawRows=${rawCount}, validRows=${validCount}, ignoredRows=${ignoredCount}, firestoreDocs=${firestoreMap.size}`);
    console.log(`missingInFirestore=${missingInFirestore.length}, extraInFirestore=${extraInFirestore.length}, mismatched=${mismatched.length}`);

    if (ignoredCount) {
      console.log(`ignoredReason=ID 없는 행이 ${ignoredCount}개 있습니다.`);
    }
    if (missingInFirestore.length) {
      console.log(`missingIds=${missingInFirestore.slice(0, 10).join(", ")}`);
    }
    if (extraInFirestore.length) {
      console.log(`extraIds=${extraInFirestore.slice(0, 10).join(", ")}`);
    }
    if (mismatched.length) {
      console.log(`mismatchIds=${mismatched.slice(0, 10).join(", ")}`);
    }
  }
}

main().catch((error) => {
  console.error("비교 실패:", error.message);
  process.exitCode = 1;
});
