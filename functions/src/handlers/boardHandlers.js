"use strict";

const { upsertBoardPost, deleteBoardPost } = require("../services/boardService");

async function handleUpsertBoardPost(req, payload) {
  return upsertBoardPost(req, payload);
}

async function handleDeleteBoardPost(req, payload) {
  return deleteBoardPost(req, payload);
}

module.exports = {
  handleUpsertBoardPost,
  handleDeleteBoardPost
};
