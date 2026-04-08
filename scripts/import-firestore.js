const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const admin = require("firebase-admin");
const { createPasswordRecord } = require("../functions/src/lib/password");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const PROJECT_DIR = path.resolve(__dirname, "..");

function findExcelPath() {
  for (const dir of [PROJECT_DIR, ROOT_DIR]) {
    const candidate = path.join(dir, "Ncore_DB.xlsx");
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("엑셀 백업 파일을 찾지 못했습니다.");
}

const EXCEL_PATH = findExcelPath();

function findServiceAccountPath() {
  for (const dir of [PROJECT_DIR, ROOT_DIR]) {
    const files = fs.readdirSync(dir);
    const match = files.find(
      (name) =>
        name.startsWith("ncore-vacation-system-firebase-adminsdk-") &&
        name.endsWith(".json")
    );
    if (match) return path.join(dir, match);
  }

  throw new Error("Firebase 서비스 계정 JSON 파일을 찾지 못했습니다.");
}

function loadWorkbook() {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`엑셀 백업 파일을 찾지 못했습니다: ${EXCEL_PATH}`);
  }
  return XLSX.readFile(EXCEL_PATH);
}

function sheetToJson(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function cleanNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function cleanBool(value, fallback = false) {
  if (value === true || value === false) return value;
  const text = cleanText(value).toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(text)) return true;
  if (["false", "0", "no", "n", "off"].includes(text)) return false;
  return fallback;
}

function parseExcelSerial(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return XLSX.SSF.parse_date_code(value);
  }

  const text = cleanText(value);
  if (!text || !/^\d+(\.\d+)?$/.test(text)) return null;

  const num = Number(text);
  if (!Number.isFinite(num)) return null;
  return XLSX.SSF.parse_date_code(num);
}

function excelSerialToDateString(value) {
  const parts = parseExcelSerial(value);
  if (parts) {
    const yyyy = String(parts.y).padStart(4, "0");
    const mm = String(parts.m).padStart(2, "0");
    const dd = String(parts.d).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const text = cleanText(value);
  if (!text) return "";
  const normalized = text.replace(/\//g, "-");
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized)) {
    const [yyyy, mm, dd] = normalized.split("-");
    return `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }
  return text;
}

function excelSerialToDateTimeString(value) {
  const parts = parseExcelSerial(value);
  if (parts) {
    const yyyy = String(parts.y).padStart(4, "0");
    const mm = String(parts.m).padStart(2, "0");
    const dd = String(parts.d).padStart(2, "0");
    const hh = String(parts.H || 0).padStart(2, "0");
    const mi = String(parts.M || 0).padStart(2, "0");
    const ss = String(Math.floor(parts.S || 0)).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  }

  const text = cleanText(value);
  if (!text) return "";
  const normalized = text.replace("T", " ").replace(/\//g, "-");
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized)) {
    return `${excelSerialToDateString(normalized)} 00:00:00`;
  }
  if (/^\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{2}(:\d{2})?$/.test(normalized)) {
    const [datePart, timePart] = normalized.split(" ");
    const [yyyy, mm, dd] = datePart.split("-");
    const [hh, mi, ss = "00"] = timePart.split(":");
    return `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")} ${String(hh).padStart(2, "0")}:${String(mi).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  return text;
}

function normalizeRole(value) {
  const raw = cleanText(value).toLowerCase();
  if (raw === "master") return "master";
  if (raw === "ceo") return "ceo";
  if (["manager", "teamleader", "team_leader", "team leader"].includes(raw)) return "team_leader";
  if (["partleader", "part_leader", "part leader"].includes(raw)) return "part_leader";
  return "employee";
}

function normalizeUser(row) {
  const passwordRecord = createPasswordRecord(cleanText(row.password || "0"));
  return {
    id: cleanText(row.id),
    loginId: cleanText(row.id),
    password: "",
    passwordAlgo: cleanText(row.passwordAlgo || passwordRecord.passwordAlgo),
    passwordHash: cleanText(row.passwordHash || passwordRecord.passwordHash),
    passwordSalt: cleanText(row.passwordSalt || passwordRecord.passwordSalt),
    name: cleanText(row.name),
    role: normalizeRole(row.role),
    rank: cleanText(row.rank),
    dept: cleanText(row.dept),
    totalHours: cleanNumber(row.totalHours),
    usedHours: cleanNumber(row.usedHours),
    email: cleanText(row.email),
    phone: cleanText(row.phone),
    employeeNo: cleanText(row.employeeNo),
    workQ1: cleanText(row.workQ1),
    workQ2: cleanText(row.workQ2),
    workQ3: cleanText(row.workQ3),
    workQ4: cleanText(row.workQ4),
    featureMemberCard: cleanBool(row.featureMemberCard, false),
    featureBoard: cleanBool(row.featureBoard, true),
    featureHomepage: cleanBool(row.featureHomepage, false),
    permissions: {
      calendarSelf: cleanBool(row.calendarSelf, true),
      calendarManual: cleanBool(row.calendarManual, false),
      calendarParts: cleanBool(row.calendarParts, false),
      calendarAll: cleanBool(row.calendarAll, false),
      approveScope: cleanText(row.approveScope || "none"),
      canManageUsers: cleanBool(row.canManageUsers, false),
      memberStatusScope: cleanText(row.memberStatusScope || "none"),
      canAccessMasterSettings: cleanBool(row.canAccessMasterSettings, false)
    },
    migratedAt: new Date().toISOString()
  };
}

function normalizeRequest(row) {
  const docId = cleanText(row.id || `${row.userId}-${row.startDate}-${row.endDate}`);
  return {
    id: docId,
    userId: cleanText(row.userId),
    userName: cleanText(row.userName),
    dept: cleanText(row.dept),
    role: normalizeRole(row.role),
    type: cleanText(row.type),
    startDate: excelSerialToDateString(row.startDate),
    endDate: excelSerialToDateString(row.endDate || row.startDate),
    hours: cleanNumber(row.hours),
    timeRange: cleanText(row.timeRange),
    reason: cleanText(row.reason),
    status: cleanText(row.status || "pending"),
    timestamp: excelSerialToDateTimeString(row.timestamp),
    specialLeaveTypeKey: cleanText(row.specialLeaveTypeKey),
    specialLeaveTypeLabel: cleanText(row.specialLeaveTypeLabel),
    rejectReason: cleanText(row.rejectReason),
    migratedAt: new Date().toISOString()
  };
}

function normalizeBoardPost(row) {
  const docId = cleanText(row.id || Date.now());
  return {
    id: docId,
    title: cleanText(row.title),
    content: cleanText(row.content),
    category: cleanText(row.category || "일반"),
    authorId: cleanText(row.authorId),
    authorName: cleanText(row.authorName),
    authorDept: cleanText(row.authorDept),
    isNotice: cleanBool(row.isNotice, false),
    status: cleanText(row.status || "active"),
    viewCount: cleanNumber(row.viewCount),
    createdAt: cleanText(row.createdAt),
    updatedAt: cleanText(row.updatedAt),
    migratedAt: new Date().toISOString()
  };
}

function normalizeHoliday(row) {
  const dateKey = excelSerialToDateString(
    row.date || row.Date || row["날짜"] || row["일자"]
  );
  return {
    id: dateKey,
    date: dateKey,
    name: cleanText(
      row.name || row.Name || row.holiday || row.Holiday || row["휴일명"] || row["이름"]
    ),
    migratedAt: new Date().toISOString()
  };
}

function normalizeSpecialLeaveType(row) {
  const typeKey = cleanText(row.typeKey);
  return {
    typeKey,
    label: cleanText(row.label),
    enabled: cleanBool(row.enabled, false),
    sortOrder: cleanNumber(row.sortOrder),
    color: cleanText(row.color || "slate"),
    grantHours: cleanNumber(row.grantHours),
    requestMode: cleanText(row.requestMode || "same_as_annual"),
    allowHolidayRequest: cleanBool(row.allowHolidayRequest, false),
    dayCountMode: cleanText(row.dayCountMode || "business_days"),
    migratedAt: new Date().toISOString()
  };
}

function normalizeUserSpecialLeave(row) {
  const userId = cleanText(row.userId);
  const typeKey = cleanText(row.typeKey);
  return {
    id: `${userId}__${typeKey}`,
    userId,
    typeKey,
    totalHours: cleanNumber(row.totalHours),
    usedHours: cleanNumber(row.usedHours),
    note: cleanText(row.note),
    updatedAt: cleanText(row.updatedAt),
    migratedAt: new Date().toISOString()
  };
}

function normalizeMailRoute(row) {
  const dept = cleanText(row.dept);
  const roleGroup = cleanText(row.roleGroup || "staff");
  return {
    id: `${dept}__${roleGroup}`,
    dept,
    roleGroup,
    toUserId: cleanText(row.toUserId),
    ccUserIds: cleanText(row.ccUserIds)
      .split(/[;,]/)
      .map((item) => cleanText(item))
      .filter(Boolean),
    migratedAt: new Date().toISOString()
  };
}

function normalizeAccessLog(row, index) {
  const timestamp = cleanText(row.timestamp);
  return {
    id: `${timestamp || "log"}__${index + 1}`,
    timestamp,
    userId: cleanText(row.userId),
    userName: cleanText(row.userName),
    type: cleanText(row.type),
    ip: cleanText(row.ip),
    detail: cleanText(row.detail),
    migratedAt: new Date().toISOString()
  };
}

async function writeCollection(db, collectionName, items, idField = "id") {
  if (!items.length) {
    console.log(`[skip] ${collectionName}: 데이터 없음`);
    return;
  }

  let batch = db.batch();
  let count = 0;

  for (const item of items) {
    const docId = cleanText(item[idField]);
    if (!docId) continue;

    batch.set(db.collection(collectionName).doc(docId), item, { merge: true });
    count += 1;

    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  if (count % 400 !== 0) {
    await batch.commit();
  }

  console.log(`[ok] ${collectionName}: ${count}건`);
}

async function main() {
  const serviceAccountPath = findServiceAccountPath();
  const workbook = loadWorkbook();

  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
  });

  const db = admin.firestore();

  const users = sheetToJson(workbook, "Users")
    .map(normalizeUser)
    .filter((item) => item.id);
  const requests = sheetToJson(workbook, "Requests")
    .map(normalizeRequest)
    .filter((item) => item.id);
  const boardPosts = sheetToJson(workbook, "BoardPosts")
    .map(normalizeBoardPost)
    .filter((item) => item.id);
  const holidays = sheetToJson(workbook, "Holidays")
    .map(normalizeHoliday)
    .filter((item) => item.id);
  const specialLeaveTypes = sheetToJson(workbook, "SpecialLeaveTypes")
    .map(normalizeSpecialLeaveType)
    .filter((item) => item.typeKey);
  const userSpecialLeaves = sheetToJson(workbook, "UserSpecialLeaves")
    .map(normalizeUserSpecialLeave)
    .filter((item) => item.id);
  const mailRoutes = sheetToJson(workbook, "MailRoutes")
    .map(normalizeMailRoute)
    .filter((item) => item.id);
  const accessLogs = sheetToJson(workbook, "AccessLogs")
    .map(normalizeAccessLog)
    .filter((item) => item.id);

  await writeCollection(db, "users", users);
  await writeCollection(db, "requests", requests);
  await writeCollection(db, "boardPosts", boardPosts);
  await writeCollection(db, "holidays", holidays);
  await writeCollection(db, "specialLeaveTypes", specialLeaveTypes, "typeKey");
  await writeCollection(db, "userSpecialLeaves", userSpecialLeaves);
  await writeCollection(db, "mailRoutes", mailRoutes);
  await writeCollection(db, "accessLogs", accessLogs);

  console.log("Firestore 이관 완료");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Firestore 이관 실패:", error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  EXCEL_PATH,
  ROOT_DIR,
  cleanText,
  cleanNumber,
  cleanBool,
  excelSerialToDateString,
  excelSerialToDateTimeString,
  normalizeRole,
  normalizeUser,
  normalizeRequest,
  normalizeBoardPost,
  normalizeHoliday,
  normalizeSpecialLeaveType,
  normalizeUserSpecialLeave,
  normalizeMailRoute,
  normalizeAccessLog,
  loadWorkbook,
  sheetToJson,
  findServiceAccountPath
};
