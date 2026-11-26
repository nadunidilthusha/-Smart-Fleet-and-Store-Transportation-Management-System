import ApiError from "../utils/ApiError.js";

// Usage: authorize("SYSTEM_ADMIN", "STORE_MANAGER")
export default function authorize(...allowedRoles) {
  return (req, res, next) => {
    // req.user is set by the protect middleware
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to perform this action."));
    }
    next();
  };
}