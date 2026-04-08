"use strict";

const { normalizeRole, buildMailRoutes } = require("../lib/common");
const { replaceMailRoutes } = require("../repositories/firestore/mailRouteRepo");
const { requireActor, resolveClientIp } = require("./sessionService");
const { writeLog } = require("./logService");

async function saveMailRoutes(req, payload) {
  const { actor, actorUser } = await requireActor(payload);
  if (!actorUser || normalizeRole(actorUser.role) !== "master") return { result: "fail", message: "메일 설정 저장은 마스터만 가능합니다." };
  const routes = buildMailRoutes(payload.routes || []);
  await replaceMailRoutes(routes);
  await writeLog(actor.id, actor.name, "MailRouteSave", resolveClientIp(req, payload), String(routes.length));
  return { result: "success", routes };
}

module.exports = {
  saveMailRoutes
};
