"use strict";

const { store } = require("../../lib/firebase");
const { SESSION_COLLECTION } = require("../../config/constants");
const { text } = require("../../lib/common");

function getSessionRef(sessionId) {
  return store.collection(SESSION_COLLECTION).doc(text(sessionId));
}

async function getSessionSnap(sessionId) {
  return getSessionRef(sessionId).get();
}

async function saveSession(sessionId, data, options = { merge: false }) {
  await getSessionRef(sessionId).set(data, options);
}

async function updateSession(sessionId, data) {
  await getSessionRef(sessionId).set(data, { merge: true });
}

module.exports = {
  getSessionRef,
  getSessionSnap,
  saveSession,
  updateSession
};
