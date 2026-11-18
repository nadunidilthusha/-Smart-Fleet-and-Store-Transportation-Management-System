import ApiError from "../utils/ApiError.js";

// Role guard. Use after protect:
//   router.post("/", authorize(ROLES.STORE_MANAGER), controller.create);
export default function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (allowedRoles.length && !allowedRoles.includes(req.user.role)) return next(ApiError.forbidden());
    return next();
  };
}
