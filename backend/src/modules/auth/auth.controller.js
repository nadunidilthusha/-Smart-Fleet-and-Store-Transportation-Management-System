import asyncHandler from "../../utils/asyncHandler.js";
import notImplemented from "../../utils/notImplemented.js";
import ApiError from "../../utils/ApiError.js";
import * as service from "./auth.service.js";
import { record } from "../audit/audit.service.js";

// Audit entry for a successful sign-in (entity "Session"), written as the signed-in user
const auditLogin = (user, portal, ip) =>
  record({ user, action: "LOGIN", entity: "Session", entityCode: user.employeeId, description: `Signed in to the ${portal} portal`, ip });

// Audit entry for a rejected sign-in; who tried is kept in the description because the user is unknown
const auditFailedLogin = (err, who, portal, ip) =>
  err instanceof ApiError && err.status < 500
    ? record({ action: "LOGIN_FAILED", entity: "Session", actorName: "Unknown user", description: `${err.message} (${portal} portal, ${who})`, ip })
    : undefined;

// POST /api/auth/login   public, Admin portal sign-in, returns { token, user }
export const login = asyncHandler(async (req, res) => {
  let result;
  try {
    result = await service.adminLogin({ ...req.body, ip: req.ip });
  } catch (err) {
    await auditFailedLogin(err, req.body.email, "admin", req.ip);
    throw err;
  }
  await auditLogin(result.user, "admin", req.ip);
  res.json(result);
});

// GET  /api/auth/me      current signed-in user
export const me = asyncHandler(async (req, res) => {
  res.json(await service.getMe(req.user.id));
});

// GET  /api/auth/store/locations   public, Store Web login dropdown -> [{ id, name, shortName }]
export const storeLocations = asyncHandler(async (req, res) => {
  res.json(await service.listStoreLocations());
});

// POST /api/auth/store/login       public, Store Web sign-in -> { token, user }
export const storeLogin = asyncHandler(async (req, res) => {
  let result;
  try {
    result = await service.storeLogin(req.body);
  } catch (err) {
    await auditFailedLogin(err, req.body.identity, "store", req.ip);
    throw err;
  }
  await auditLogin(result.user, "store", req.ip);
  res.json(result);
});
