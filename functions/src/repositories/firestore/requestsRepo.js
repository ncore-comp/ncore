"use strict";

const { store } = require("../../lib/firebase");
const { text } = require("../../lib/common");

function getRequestRef(requestId) {
  return store.collection("requests").doc(text(requestId));
}

async function getRequestById(requestId) {
  const snap = await getRequestRef(requestId).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function deleteRequestById(requestId) {
  await getRequestRef(requestId).delete();
}

module.exports = {
  getRequestRef,
  getRequestById,
  deleteRequestById
};
