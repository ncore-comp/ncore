"use strict";

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const admin = require("firebase-admin");

const ROOT_DIR = path.resolve(__dirname, "..");
const API_BASE_URL = "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo";
const DEFAULT_YEAR_RANGE = 2;
const COMPANY_ANNIVERSARY_MONTH = "07";
const COMPANY_ANNIVERSARY_DAY = "01";
const COMPANY_ANNIVERSARY_NAME = "창립기념일";

function text(value) {
  return String(value ?? "").trim();
}

function stripWrappingQuotes(value) {
  let current = text(value);
  while (
    current.length >= 2 &&
    ((current.startsWith("\"") && current.endsWith("\"")) ||
      (current.startsWith("'") && current.endsWith("'")))
  ) {
    current = current.slice(1, -1).trim();
  }
  return current;
}

function findServiceAccountPath() {
  const files = fs.readdirSync(ROOT_DIR);
  const match = files.find(
    (name) =>
      name.startsWith("ncore-vacation-system-firebase-adminsdk-") &&
      name.endsWith(".json")
  );
  if (!match) {
    throw new Error("Firebase service account json not found in project root.");
  }
  return path.join(ROOT_DIR, match);
}

function getServiceKey() {
  const key =
    process.env.PUBLIC_DATA_API_KEY ||
    process.env.KASI_HOLIDAY_API_KEY ||
    process.env.DATA_GO_KR_API_KEY;
  if (!key) {
    throw new Error(
      "Public holiday API key not found. Set PUBLIC_DATA_API_KEY or KASI_HOLIDAY_API_KEY."
    );
  }
  return stripWrappingQuotes(key);
}

function ensureAdmin() {
  if (!admin.apps.length) {
    const serviceAccountPath = findServiceAccountPath();
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  return admin.firestore();
}

function parseArgs(argv) {
  const nowYear = new Date().getFullYear();
  const values = { startYear: nowYear - DEFAULT_YEAR_RANGE, endYear: nowYear + DEFAULT_YEAR_RANGE };
  argv.forEach((arg) => {
    if (arg.startsWith("--year=")) {
      const year = Number(arg.split("=")[1]);
      if (Number.isInteger(year)) {
        values.startYear = year;
        values.endYear = year;
      }
    }
    if (arg.startsWith("--start-year=")) {
      const year = Number(arg.split("=")[1]);
      if (Number.isInteger(year)) values.startYear = year;
    }
    if (arg.startsWith("--end-year=")) {
      const year = Number(arg.split("=")[1]);
      if (Number.isInteger(year)) values.endYear = year;
    }
  });
  if (values.startYear > values.endYear) {
    throw new Error("startYear cannot be greater than endYear.");
  }
  return values;
}

function extractTag(block, tagName) {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(new RegExp(`<${escaped}>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match ? stripWrappingQuotes(match[1]) : "";
}

function parseItemsFromXml(xml) {
  const items = [];
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
  itemMatches.forEach((block) => {
    const locdate = extractTag(block, "locdate");
    const dateName = extractTag(block, "dateName");
    const isHoliday = extractTag(block, "isHoliday");
    const dateKind = extractTag(block, "dateKind");
    if (!locdate || !dateName) return;
    items.push({ locdate, dateName, isHoliday, dateKind });
  });
  return items;
}

function escapeForPowerShellSingleQuoted(value) {
  return String(value ?? "").replace(/'/g, "''");
}

function normalizeLocdate(locdate) {
  const raw = stripWrappingQuotes(locdate);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (!/^\d{8}$/.test(raw)) return "";
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function buildAutoHolidayDocs(items) {
  const map = new Map();
  items.forEach((item) => {
    const date = normalizeLocdate(item.locdate);
    const name = stripWrappingQuotes(item.dateName);
    const isHoliday = stripWrappingQuotes(item.isHoliday).toUpperCase() === "Y";
    if (!date || !name || !isHoliday) return;
    map.set(date, {
      id: `auto-${date}`,
      date,
      name,
      source: "auto",
      enabled: true,
      provider: "data.go.kr-kasi",
      importedAt: new Date().toISOString(),
      locdate: stripWrappingQuotes(item.locdate),
      dateKind: stripWrappingQuotes(item.dateKind),
      isHoliday: "Y"
    });
  });
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function buildCompanyHolidayDocs(startYear, endYear) {
  const docs = [];
  for (let year = startYear; year <= endYear; year += 1) {
    const date = `${year}-${COMPANY_ANNIVERSARY_MONTH}-${COMPANY_ANNIVERSARY_DAY}`;
    docs.push({
      id: `company-fixed-${date}`,
      date,
      name: COMPANY_ANNIVERSARY_NAME,
      source: "company_fixed",
      enabled: true,
      provider: "ncore-fixed",
      importedAt: new Date().toISOString()
    });
  }
  return docs;
}

function runPowerShell(command) {
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
      { maxBuffer: 1024 * 1024 * 8 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(text(stderr) || error.message));
          return;
        }
        resolve(String(stdout || ""));
      }
    );
  });
}

async function fetchHolidayXml(serviceKey, year, month) {
  const url = new URL(API_BASE_URL);
  url.searchParams.set("ServiceKey", serviceKey);
  url.searchParams.set("solYear", String(year));
  url.searchParams.set("solMonth", String(month).padStart(2, "0"));
  url.searchParams.set("numOfRows", "100");
  url.searchParams.set("pageNo", "1");

  const escapedUrl = escapeForPowerShellSingleQuoted(url.toString());
  const tmpFilePath = path.join(
    ROOT_DIR,
    "reports",
    `holiday-api-${year}-${String(month).padStart(2, "0")}.xml`
  );
  fs.mkdirSync(path.dirname(tmpFilePath), { recursive: true });
  const escapedFilePath = escapeForPowerShellSingleQuoted(tmpFilePath);
  const ps = [
    `Invoke-WebRequest -Uri '${escapedUrl}' -OutFile '${escapedFilePath}' -UseBasicParsing`,
    `'OK'`
  ].join("; ");

  await runPowerShell(ps);
  const xml = fs.readFileSync(tmpFilePath, "utf8");
  if (!text(xml).startsWith("<?xml") && !text(xml).startsWith("<response>")) {
    throw new Error("Holiday API request failed: unexpected response");
  }
  return xml;
}

async function collectHolidayDocs(serviceKey, startYear, endYear) {
  const allItems = [];
  for (let year = startYear; year <= endYear; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const xml = await fetchHolidayXml(serviceKey, year, month);
      parseItemsFromXml(xml).forEach((item) => allItems.push(item));
    }
  }
  return [
    ...buildAutoHolidayDocs(allItems),
    ...buildCompanyHolidayDocs(startYear, endYear)
  ];
}

async function syncAutoHolidayDocs(store, docs, startYear, endYear) {
  const holidaysCollection = store.collection("holidays");
  const snap = await holidaysCollection.get();
  const batch = store.batch();

  snap.docs.forEach((doc) => {
    const data = doc.data() || {};
    const source = stripWrappingQuotes(data.source).toLowerCase();
    const date = normalizeLocdate(data.date || data.id.replace(/^auto-/, ""));
    if (!["auto", "company_fixed"].includes(source)) return;
    if (!date) return;
    const year = Number(date.slice(0, 4));
    if (year >= startYear && year <= endYear) {
      batch.delete(doc.ref);
    }
  });

  docs.forEach((doc) => {
    batch.set(holidaysCollection.doc(doc.id), doc);
  });

  await batch.commit();
}

async function main() {
  const { startYear, endYear } = parseArgs(process.argv.slice(2));
  const serviceKey = getServiceKey();
  const store = ensureAdmin();
  const docs = await collectHolidayDocs(serviceKey, startYear, endYear);
  await syncAutoHolidayDocs(store, docs, startYear, endYear);
  console.log(
    JSON.stringify(
      {
        result: "success",
        startYear,
        endYear,
        inserted: docs.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        result: "error",
        message: String(error && error.message ? error.message : error)
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
