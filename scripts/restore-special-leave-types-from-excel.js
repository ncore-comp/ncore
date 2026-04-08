const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const admin = require("firebase-admin");
const { buildSpecialLeaveTypes } = require("../functions/src/lib/common");

const PROJECT_DIR = path.resolve(__dirname, "..");

function findExcelPath() {
  const candidate = path.join(PROJECT_DIR, "Ncore_DB.xlsx");
  if (fs.existsSync(candidate)) return candidate;
  throw new Error(`엑셀 파일을 찾을 수 없습니다: ${candidate}`);
}

function findServiceAccountPath() {
  const files = fs.readdirSync(PROJECT_DIR);
  const match = files.find(
    (name) =>
      name.startsWith("ncore-vacation-system-firebase-adminsdk-") &&
      name.endsWith(".json")
  );
  if (match) return path.join(PROJECT_DIR, match);
  throw new Error("Firebase 서비스 계정 JSON을 찾을 수 없습니다.");
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function cleanBool(value, fallback = false) {
  if (value === true || value === false) return value;
  const text = cleanText(value).toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(text)) return true;
  if (["false", "0", "no", "n", "off"].includes(text)) return false;
  return fallback;
}

function cleanNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function loadRows() {
  const workbook = XLSX.readFile(findExcelPath());
  const sheet = workbook.Sheets["SpecialLeaveTypes"];
  if (!sheet) throw new Error("SpecialLeaveTypes 시트를 찾을 수 없습니다.");
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function normalizeRows(rows) {
  return buildSpecialLeaveTypes(
    rows.map((row, index) => ({
      typeKey: cleanText(row.typeKey),
      label: cleanText(row.label),
      enabled: cleanBool(row.enabled, true),
      sortOrder: cleanNumber(row.sortOrder, (index + 1) * 10),
      color: cleanText(row.color),
      grantHours: cleanNumber(row.grantHours, 0),
      requestMode: cleanText(row.requestMode),
      allowHolidayRequest: cleanBool(row.allowHolidayRequest, false),
      dayCountMode: cleanText(row.dayCountMode)
    }))
  );
}

async function main() {
  const serviceAccount = require(findServiceAccountPath());
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  const db = admin.firestore();
  const rows = normalizeRows(loadRows());
  if (!rows.length) throw new Error("복구할 특별휴가 기본 데이터가 없습니다.");

  const existing = await db.collection("specialLeaveTypes").get();
  const batch = db.batch();
  existing.docs.forEach((doc) => batch.delete(doc.ref));
  rows.forEach((item) => {
    batch.set(db.collection("specialLeaveTypes").doc(cleanText(item.typeKey)), item);
  });
  await batch.commit();

  console.log(`복구 완료: ${rows.length}건`);
  rows.forEach((item) => {
    console.log(`- ${item.typeKey}: ${item.label}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
