"use strict";

const { store } = require("../../lib/firebase");
const { getCollectionDocs } = require("./commonRepo");
const { text } = require("../../lib/common");

async function getAllSpecialLeaveTypes() {
  return getCollectionDocs("specialLeaveTypes");
}

async function replaceSpecialLeaveTypes(types) {
  const batch = store.batch();
  const existing = await getAllSpecialLeaveTypes();
  existing.forEach((item) => batch.delete(store.collection("specialLeaveTypes").doc(text(item.id || item.typeKey))));
  types.forEach((item) => batch.set(store.collection("specialLeaveTypes").doc(text(item.typeKey)), item));
  await batch.commit();
}

async function getUserSpecialLeavesByUserId(userId) {
  const snap = await store.collection("userSpecialLeaves").where("userId", "==", text(userId)).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function replaceUserSpecialLeaves(userId, leaves) {
  const batch = store.batch();
  const existing = await store.collection("userSpecialLeaves").where("userId", "==", text(userId)).get();
  existing.forEach((doc) => batch.delete(doc.ref));
  leaves.forEach((item) => {
    const docId = text(item.grantId || `${item.userId}__${item.typeKey}`);
    batch.set(store.collection("userSpecialLeaves").doc(docId), { ...item, id: docId });
  });
  await batch.commit();
}

module.exports = {
  getAllSpecialLeaveTypes,
  replaceSpecialLeaveTypes,
  getUserSpecialLeavesByUserId,
  replaceUserSpecialLeaves
};
