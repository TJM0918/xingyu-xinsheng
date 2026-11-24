"use strict";

class AppError extends Error {
  /**
   * @param {number} statusCode HTTP 状态码
   * @param {string} code 稳定的业务错误码
   * @param {string} message 可安全展示给用户的消息
   * @param {unknown} [details] 附加信息（不要放敏感正文）
   */
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.expose = true;
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(message = "请求参数不正确", code = "BAD_REQUEST", details) {
    return new AppError(400, code, message, details);
  }

  static unauthorized(message = "无法确认匿名身份", code = "UNAUTHORIZED", details) {
    return new AppError(401, code, message, details);
  }

  static forbidden(message = "没有权限执行这个操作", code = "FORBIDDEN", details) {
    return new AppError(403, code, message, details);
  }

  static notFound(message = "没有找到这条内容", code = "NOT_FOUND", details) {
    return new AppError(404, code, message, details);
  }

  static conflict(message = "当前状态无法完成操作", code = "CONFLICT", details) {
    return new AppError(409, code, message, details);
  }

  static unprocessable(message = "内容需要调整后再发布", code = "UNPROCESSABLE", details) {
    return new AppError(422, code, message, details);
  }

  static tooMany(message = "请求太频繁了，请稍后再试", code = "RATE_LIMITED", details) {
    return new AppError(429, code, message, details);
  }
}

module.exports = { AppError };
