// Throw this from controllers and services to send a clean error to the frontend:
//   throw ApiError.notFound("Booking not found");
//   throw ApiError.badRequest("Quantity must be more than 0");
// The error handler turns it into: { message, code, errors? }
export default class ApiError extends Error {
  constructor(status, message, { code, errors } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errors = errors; // optional list of { field, message }
  }

  static badRequest(message = "Bad request", opts) {
    return new ApiError(400, message, { code: "BAD_REQUEST", ...opts });
  }
  static unauthorized(message = "Please sign in again.", opts) {
    return new ApiError(401, message, { code: "UNAUTHORIZED", ...opts });
  }
  static forbidden(message = "You do not have permission to do this.", opts) {
    return new ApiError(403, message, { code: "FORBIDDEN", ...opts });
  }
  static notFound(message = "Not found", opts) {
    return new ApiError(404, message, { code: "NOT_FOUND", ...opts });
  }
  static conflict(message = "Conflict", opts) {
    return new ApiError(409, message, { code: "CONFLICT", ...opts });
  }
  static unprocessable(message = "Validation failed", opts) {
    return new ApiError(422, message, { code: "VALIDATION_ERROR", ...opts });
  }
  static notImplemented(message = "Not implemented yet", opts) {
    return new ApiError(501, message, { code: "NOT_IMPLEMENTED", ...opts });
  }
}
