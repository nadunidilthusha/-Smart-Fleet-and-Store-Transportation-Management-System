import mongoose from "mongoose";
import { ZodError } from "zod";
import ApiError from "../utils/ApiError.js";
import { env } from "../config/env.js";
import logger from "../utils/logger.js";

/*
  Every error leaves the API in this shape (the frontends read "message"):
    { "message": "Booking not found", "code": "NOT_FOUND", "errors": [{ "field": "...", "message": "..." }] }
*/
function normalise(err) {
  if (err instanceof ApiError) return err;

  // zod validation (validate middleware)
  if (err instanceof ZodError) {
    const errors = err.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
    return ApiError.unprocessable("Please check the highlighted fields.", { errors });
  }

  // mongoose schema validation
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return ApiError.unprocessable("Please check the highlighted fields.", { errors });
  }

  // bad ObjectId in a URL, for example /bookings/abc
  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid value for "${err.path}".`);
  }

  // duplicate unique value (E11000)
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "value";
    return ApiError.conflict(`A record with this ${field} already exists.`, { errors: [{ field, message: "Already exists" }] });
  }

  // invalid JSON body
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return ApiError.badRequest("Request body is not valid JSON.");
  }

  // file upload problems (multer)
  if (err?.name === "MulterError") return ApiError.badRequest(err.message);

  return null;
}

// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, req, res, next) {
  const known = normalise(err);

  if (!known) {
    logger.error(`${req.method} ${req.originalUrl}`, err);
    return res.status(500).json({
      message: env.isProd ? "Something went wrong. Please try again." : err.message,
      code: "INTERNAL_ERROR",
    });
  }

  // 501 is the "not built yet" placeholder, no need to log a stack for it
  if (known.status >= 500 && known.status !== 501) logger.error(`${req.method} ${req.originalUrl}`, err);

  const body = { message: known.message, code: known.code };
  if (known.errors) body.errors = known.errors;
  return res.status(known.status).json(body);
}
