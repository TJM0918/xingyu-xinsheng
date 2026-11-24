"use strict";

const config = require("../config");
const { AppError } = require("../utils/errors");

function notFoundHandler(req, res, next) {
  if (req.path.startsWith("/api")) {
    return next(AppError.notFound("这个接口不存在", "ROUTE_NOT_FOUND"));
  }
  return next(AppError.notFound("页面不存在", "NOT_FOUND"));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  let statusCode = 500;
  let code = "INTERNAL_ERROR";
  let message = "服务器遇到了一点问题，请稍后再试";
  let details;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error?.type === "entity.too.large") {
    statusCode = 413;
    code = "PAYLOAD_TOO_LARGE";
    message = "内容太长了，请缩短后再试";
  } else if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    statusCode = 400;
    code = "INVALID_JSON";
    message = "请求体不是合法的 JSON";
  } else if (error?.name === "ValidationError" && error.errors) {
    statusCode = 400;
    code = "MODEL_VALIDATION_ERROR";
    message = Object.values(error.errors)[0]?.message || "提交的内容不符合要求";
    details = Object.entries(error.errors).map(([field, item]) => ({
      field,
      message: item.message,
    }));
  } else if (error?.name === "CastError") {
    statusCode = 400;
    code = "INVALID_ID";
    message = "ID 格式不正确";
  } else if (error?.code === 11000) {
    statusCode = 409;
    code = "DUPLICATE_RESOURCE";
    message = "这个操作已经完成过了";
  }

  if (statusCode >= 500) {
    console.error(`[error] req=${req.requestId}`, error);
  }

  const payload = {
    ok: false,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
    requestId: req.requestId,
  };

  if (!config.isProduction && statusCode >= 500) {
    payload.error.stack = error.stack;
  }

  res.status(statusCode).json(payload);
}

module.exports = { notFoundHandler, errorHandler };
