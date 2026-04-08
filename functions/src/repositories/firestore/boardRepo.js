"use strict";

const { store } = require("../../lib/firebase");
const { text } = require("../../lib/common");

function getBoardPostRef(postId) {
  return store.collection("boardPosts").doc(text(postId));
}

async function getBoardPostById(postId) {
  const snap = await getBoardPostRef(postId).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function saveBoardPost(postId, data, options = { merge: true }) {
  await getBoardPostRef(postId).set(data, options);
}

module.exports = {
  getBoardPostById,
  saveBoardPost
};
