"use strict";

const { login, sessionBoot, logout } = require("../services/authService");

async function handleLogin(req, payload, action) {
  return login(req, payload, action);
}

async function handleSessionBoot(req, payload) {
  return sessionBoot(payload);
}

async function handleLogout(req, payload) {
  return logout(req, payload);
}

module.exports = {
  handleLogin,
  handleSessionBoot,
  handleLogout
};
