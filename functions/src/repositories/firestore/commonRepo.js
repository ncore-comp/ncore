"use strict";

const { store } = require("../../lib/firebase");

async function getCollectionDocs(collectionName) {
  const snap = await store.collection(collectionName).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

module.exports = {
  getCollectionDocs
};
