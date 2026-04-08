"use strict";

function sendJson(res, payload, statusCode = 200) {
  res.status(statusCode);
  res.set("Content-Type", "application/json; charset=utf-8");
  res.send(JSON.stringify(payload));
}

module.exports = {
  sendJson
};
