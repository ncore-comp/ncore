"use strict";

const { saveSpecialLeaveTypes, saveUserSpecialLeaves } = require("../services/specialLeaveService");

async function handleSaveSpecialLeaveTypes(req, payload) {
  return saveSpecialLeaveTypes(req, payload);
}

async function handleSaveUserSpecialLeaves(req, payload) {
  return saveUserSpecialLeaves(req, payload);
}

module.exports = {
  handleSaveSpecialLeaveTypes,
  handleSaveUserSpecialLeaves
};
