"use strict";

const { text, toBool } = require("../lib/common");

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

function normalizeHolidayDate(value) {
  const raw = stripWrappingQuotes(value);
  if (!raw) return "";
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return "";
}

function normalizeHolidayName(value) {
  return stripWrappingQuotes(value);
}

function normalizeHolidaySource(value) {
  const raw = stripWrappingQuotes(value).toLowerCase();
  if (raw === "auto") return "auto";
  if (raw === "company_fixed") return "company_fixed";
  return "manual";
}

function sanitizeHolidayObject(raw) {
  const date = normalizeHolidayDate(raw?.date || raw?.id);
  const name = normalizeHolidayName(raw?.name);
  const source = normalizeHolidaySource(raw?.source);
  const enabled = raw?.enabled === undefined ? true : toBool(raw.enabled, true);
  return {
    id: text(raw?.id),
    date,
    name,
    source,
    enabled,
    provider: stripWrappingQuotes(raw?.provider),
    category: stripWrappingQuotes(raw?.category)
  };
}

function buildMergedHolidayMap(items) {
  const normalized = (Array.isArray(items) ? items : [])
    .map((item) => sanitizeHolidayObject(item))
    .filter((item) => item.date && item.name && item.enabled);

  normalized.sort((a, b) => {
    const sourceWeight =
      a.source === "auto" ? 0 : a.source === "company_fixed" ? 1 : 2;
    const otherWeight =
      b.source === "auto" ? 0 : b.source === "company_fixed" ? 1 : 2;
    if (sourceWeight !== otherWeight) return sourceWeight - otherWeight;
    return String(a.date).localeCompare(String(b.date));
  });

  const holidays = {};
  normalized.forEach((item) => {
    holidays[item.date] = item.name;
  });
  return holidays;
}

module.exports = {
  stripWrappingQuotes,
  normalizeHolidayDate,
  normalizeHolidayName,
  normalizeHolidaySource,
  sanitizeHolidayObject,
  buildMergedHolidayMap
};
