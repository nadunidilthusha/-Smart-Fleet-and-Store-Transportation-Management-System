import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// Token payload used across the API (and by the frontend session):
//   { sub: userId, role, storeId?, name }
export function signToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}
