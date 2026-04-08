"use strict";

const { requireActor, resolveClientIp } = require("../services/sessionService");
const { writeLog } = require("../services/logService");

async function handleLogAccess(req, payload) {
  const { actorUser } = await requireActor(payload);
  await writeLog(actorUser.id, actorUser.name, payload.logType || "Action", resolveClientIp(req, payload), payload.detail);
  return { result: "success" };
}

module.exports = {
  handleLogAccess
};
