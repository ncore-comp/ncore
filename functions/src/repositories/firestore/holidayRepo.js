"use strict";

const { store } = require("../../lib/firebase");
const { text } = require("../../lib/common");
const { getCollectionDocs } = require("./commonRepo");

async function getAllHolidayDocs() {
  return getCollectionDocs("holidays");
}

async function saveHolidayDoc(id, data, options = { merge: true }) {
  await store.collection("holidays").doc(text(id)).set(data, options);
}

async function deleteHolidayDoc(id) {
  await store.collection("holidays").doc(text(id)).delete();
}

module.exports = {
  getAllHolidayDocs,
  saveHolidayDoc,
  deleteHolidayDoc
};
