"use strict";

/** 包装 async route handler，让异常进入 Express 错误中间件。 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
