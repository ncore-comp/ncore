"use strict";

const { saveMailRoutes } = require("../services/mailService");

async function handleSaveMailRoutes(req, payload) {
  return saveMailRoutes(req, payload);
}

module.exports = {
  handleSaveMailRoutes
};
