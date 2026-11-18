import { env } from "./env.js";
import ApiError from "../utils/ApiError.js";

// Allows the admin and store frontends (and tools like Postman, which send no origin)
export const corsOptions = {
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
    return callback(ApiError.forbidden(`Origin not allowed: ${origin}`));
  },
  credentials: true,
};
