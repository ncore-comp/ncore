"use strict";

const { upsertUser, saveUsers, changePassword } = require("../services/userService");

async function handleUpsertUser(req, payload) {
  return upsertUser(req, payload);
}

async function handleSaveUsers(req, payload) {
  return saveUsers(req, payload);
}

async function handleChangePassword(req, payload) {
  return changePassword(req, payload);
}

module.exports = {
  handleUpsertUser,
  handleSaveUsers,
  handleChangePassword
};
