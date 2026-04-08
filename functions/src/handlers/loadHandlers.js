"use strict";

const { text } = require("../lib/common");
const { requireActor } = require("../services/sessionService");
const { loadData } = require("../services/loadService");

async function handleLoadData(req, payload) {
  const { actorUser } = await requireActor(payload);
  return loadData(text(payload.scope || "all").toLowerCase(), actorUser);
}

module.exports = {
  handleLoadData
};
