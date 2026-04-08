"use strict";

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const store = admin.firestore();

module.exports = {
  admin,
  store
};
