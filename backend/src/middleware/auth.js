import ApiError from "../utils/ApiError.js";
import { verifyToken } from "../utils/token.js";

// Requires "Authorization: Bearer <token>" (the frontends already send this).
// Sets req.user = { id, role, storeId, name }
export default function protect(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(ApiError.unauthorized("Please sign in to continue."));

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role, storeId: payload.storeId, name: payload.name };
    return next();
  } catch {
    // The frontends sign the user out on any 401
    return next(ApiError.unauthorized("Your session has expired. Please sign in again."));
  }
}
