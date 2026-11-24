"use strict";

const { AppError } = require("../utils/errors");

/**
 * 用 Zod 校验 body/query/params，并把结果放到 req.validated[source]。
 * 不直接覆盖 req.query，避免 Express 的只读/原型细节问题。
 */
function validate(schema, source = "body") {
  return function validateMiddleware(req, res, next) {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || source,
        message: issue.message,
      }));
      return next(
        AppError.badRequest(details[0]?.message || "请求参数不正确", "VALIDATION_ERROR", details)
      );
    }
    req.validated = req.validated || {};
    req.validated[source] = result.data;
    next();
  };
}

module.exports = { validate };
