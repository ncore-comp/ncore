"use strict";

const { store } = require("../../lib/firebase");
const { getCollectionDocs } = require("./commonRepo");

async function getAllMailRoutes() {
  return getCollectionDocs("mailRoutes");
}

async function replaceMailRoutes(routes) {
  const batch = store.batch();
  const existing = await getAllMailRoutes();
  existing.forEach((item) => batch.delete(store.collection("mailRoutes").doc(item.id)));
  routes.forEach((item) => {
    const docId = `${item.dept}__${item.roleGroup}`;
    batch.set(store.collection("mailRoutes").doc(docId), { ...item, id: docId });
  });
  await batch.commit();
}

module.exports = {
  getAllMailRoutes,
  replaceMailRoutes
};
