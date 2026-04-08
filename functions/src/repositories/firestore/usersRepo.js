"use strict";

const { store } = require("../../lib/firebase");
const { text } = require("../../lib/common");
const { getCollectionDocs } = require("./commonRepo");

function getUsersCollection() {
  return store.collection("users");
}

async function getUserById(userId) {
  const doc = await getUsersCollection().doc(text(userId)).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function getAllUsers() {
  return getCollectionDocs("users");
}

async function saveUser(userId, data, options = { merge: true }) {
  await getUsersCollection().doc(text(userId)).set(data, options);
}

async function updateUser(userId, data) {
  await getUsersCollection().doc(text(userId)).set(data, { merge: true });
}

module.exports = {
  getUserById,
  getAllUsers,
  saveUser,
  updateUser
};
