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

// Same as protect, but never rejects: req.user is only set when a valid token is sent.
// Used by the temporary development guard in routes/index.js so audit entries still know who signed in.
export function attachUser(req, res, next) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    try {
      const payload = verifyToken(header.slice(7));
      req.user = { id: payload.sub, role: payload.role, storeId: payload.storeId, name: payload.name };
    } catch {
      // An invalid or mock token is ignored in development
    }
  }
  next();
}
