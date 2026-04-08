"use strict";

function createActionError(message, extra = {}) {
  const error = new Error(message);
  Object.assign(error, extra);
  return error;
}

module.exports = {
  createActionError
};
