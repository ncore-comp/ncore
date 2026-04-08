"use strict";

const crypto = require("crypto");
const { store } = require("../../lib/firebase");
const { LOGIN_ATTEMPT_COLLECTION } = require("../../config/constants");
const { text } = require("../../lib/common");

function buildLoginAttemptId(loginId, ip) {
  return crypto.createHash("sha256").update(`${text(loginId)}|${text(ip)}`).digest("hex");
}

function getLoginAttemptRef(loginId, ip) {
  return store.collection(LOGIN_ATTEMPT_COLLECTION).doc(buildLoginAttemptId(loginId, ip));
}

module.exports = {
  buildLoginAttemptId,
  getLoginAttemptRef
};
