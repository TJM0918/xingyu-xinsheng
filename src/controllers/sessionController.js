"use strict";

const config = require("../config");
const { newAnonymousId } = require("../utils/identity");
const { setIdentityCookie, clearIdentityCookie } = require("../middleware/identity");

function getSession(req, res) {
  res.json({
    ok: true,
    data: {
      anonymousId: req.anonymousId,
      transport: req.identitySource,
      cookieName: config.cookie.name,
      headerName: "X-Anonymous-Id",
      note: "这是随机生成的匿名凭证，不关联姓名、学号或手机号。请像保管钥匙一样保管它。",
    },
  });
}

function rotateSession(req, res) {
  const anonymousId = newAnonymousId();
  setIdentityCookie(res, anonymousId);
  res.status(201).json({
    ok: true,
    data: {
      anonymousId,
      transport: "new",
      cookieName: config.cookie.name,
      headerName: "X-Anonymous-Id",
    },
  });
}

function deleteSession(req, res) {
  clearIdentityCookie(res);
  res.json({ ok: true, data: { cleared: true } });
}

module.exports = { getSession, rotateSession, deleteSession };
