"use strict";

const crypto = require("crypto");
const { text } = require("./common");

const PASSWORD_ALGO = "scrypt";
const SCRYPT_KEYLEN = 64;

function createPasswordSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function createPasswordRecord(rawPassword, salt = createPasswordSalt()) {
  const password = String(rawPassword ?? "");
  const passwordHash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return {
    password: "",
    passwordAlgo: PASSWORD_ALGO,
    passwordSalt: salt,
    passwordHash
  };
}

function hasPasswordHash(user = {}) {
  return !!(text(user.passwordHash) && text(user.passwordSalt));
}

function verifyPassword(rawPassword, user = {}) {
  const password = String(rawPassword ?? "");
  const storedHash = text(user.passwordHash);
  const storedSalt = text(user.passwordSalt);
  if (storedHash && storedSalt) {
    const computed = crypto.scryptSync(password, storedSalt, SCRYPT_KEYLEN);
    const storedBuffer = Buffer.from(storedHash, "hex");
    if (storedBuffer.length !== computed.length) return false;
    return crypto.timingSafeEqual(storedBuffer, computed);
  }
  return text(user.password) === password;
}

module.exports = {
  PASSWORD_ALGO,
  createPasswordRecord,
  hasPasswordHash,
  verifyPassword
};
