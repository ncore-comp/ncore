"use strict";

const https = require("https");
const { store } = require("../lib/firebase");
const { nowKst } = require("../lib/time");
const { text } = require("../lib/common");

const API_BASE_URL = "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo";
const DEFAULT_SYNC_END_YEAR = 2030;
const COMPANY_FIXED_HOLIDAYS = [
  { month: "05", day: "01", name: "노동절" },
  { month: "07", day: "01", name: "창립기념일" }
];
const COMPANY_FIXED_PROVIDER = "ncore-fixed";

function isCompanyFixedDoc(item = {}) {
  const source = stripWrappingQuotes(item.source).toLowerCase();
  const provider = stripWrappingQuotes(item.provider).toLowerCase();
  const category = stripWrappingQuotes(item.category).toLowerCase();
  const id = stripWrappingQuotes(item.id).toLowerCase();
  return source === "company_fixed" || provider === COMPANY_FIXED_PROVIDER || category === "company_fixed" || id.startsWith("company-fixed-");
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
    COMPANY_FIXED_HOLIDAYS.forEach((holiday) => {
      const date = `${year}-${holiday.month}-${holiday.day}`;
      docs.push({
        id: `company-fixed-${date}`,
        date,
        name: holiday.name,
        source: "manual",
        enabled: true,
        provider: COMPANY_FIXED_PROVIDER,
        category: "company_fixed",
        importedAt: new Date().toISOString()
      });
    });
  }
  return docs;
}

function getPublicHolidayApiKey() {
  const key =
    process.env.PUBLIC_DATA_API_KEY ||
    process.env.KASI_HOLIDAY_API_KEY ||
    process.env.DATA_GO_KR_API_KEY;
  return stripWrappingQuotes(key);
}

function fetchHolidayXml(serviceKey, year, month) {
  const url = new URL(API_BASE_URL);
  url.searchParams.set("ServiceKey", serviceKey);
  url.searchParams.set("solYear", String(year));
  url.searchParams.set("solMonth", String(month).padStart(2, "0"));
  url.searchParams.set("numOfRows", "100");
  url.searchParams.set("pageNo", "1");

  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/xml,text/xml,*/*"
      }
    }, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HOLIDAY_API_HTTP_${res.statusCode}`));
          return;
        }
        if (!text(data).startsWith("<?xml") && !text(data).startsWith("<response>")) {
          reject(new Error("HOLIDAY_API_UNEXPECTED_RESPONSE"));
          return;
        }
        const resultCode = extractTag(data, "resultCode");
        if (resultCode && resultCode !== "00") {
          reject(new Error(`HOLIDAY_API_${resultCode}`));
          return;
        }
        resolve(data);
      });
    }).on("error", reject);
  });
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

async function syncPublicHolidays(startYearInput, endYearInput) {
  const currentYear = new Date().getFullYear();
  const startYear = Number.isInteger(Number(startYearInput)) ? Number(startYearInput) : currentYear;
  const endYear = Number.isInteger(Number(endYearInput)) ? Number(endYearInput) : DEFAULT_SYNC_END_YEAR;
  if (startYear > endYear) throw new Error("HOLIDAY_SYNC_INVALID_RANGE");

  const serviceKey = getPublicHolidayApiKey();
  if (!serviceKey) throw new Error("HOLIDAY_API_KEY_MISSING");

  const docs = await collectHolidayDocs(serviceKey, startYear, endYear);
  const holidaysCollection = store.collection("holidays");
  const snap = await holidaysCollection.get();
  const batch = store.batch();
  let deletedCount = 0;

  snap.docs.forEach((doc) => {
    const data = doc.data() || {};
    const source = stripWrappingQuotes(data.source).toLowerCase();
    const date = normalizeLocdate(data.date || stripWrappingQuotes(doc.id).replace(/^auto-/, "").replace(/^company-fixed-/, ""));
    if (!(source === "auto" || isCompanyFixedDoc({ id: doc.id, ...data }))) return;
    if (!date) return;
    const year = Number(date.slice(0, 4));
    if (year >= startYear && year <= endYear) {
      batch.delete(doc.ref);
      deletedCount += 1;
    }
  });

  docs.forEach((doc) => {
    batch.set(holidaysCollection.doc(doc.id), { ...doc, updatedAt: nowKst() });
  });

  await batch.commit();

  return {
    result: "success",
    startYear,
    endYear,
    importedCount: docs.length,
    autoCount: docs.filter((item) => item.source === "auto").length,
    companyFixedCount: docs.filter((item) => isCompanyFixedDoc(item)).length,
    manualIntegratedCount: docs.filter((item) => isCompanyFixedDoc(item)).length,
    deletedCount
  };
}

module.exports = {
  syncPublicHolidays,
  DEFAULT_SYNC_END_YEAR
};
