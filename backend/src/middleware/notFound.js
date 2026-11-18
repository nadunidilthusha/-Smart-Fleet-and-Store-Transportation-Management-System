import ApiError from "../utils/ApiError.js";

// Any request that did not match a route
export default function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}
