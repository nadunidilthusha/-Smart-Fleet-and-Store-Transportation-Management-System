
import asyncHandler from "../../utils/asyncHandler.js";
import * as service from "./users.service.js";

// GET /api/users
// Get all users
export const list = asyncHandler(async (req, res) => {
  const users = await service.listUsers();

  res.status(200).json(users);
});

// POST /api/users
// Create a new user
export const create = asyncHandler(async (req, res) => {
  const user = await service.createUser(req.body);

  res.status(201).json(user);
});

// GET /api/users/:id
// Get one user
export const getOne = asyncHandler(async (req, res) => {
  const user = await service.getUserById(req.params.id);

  res.status(200).json(user);
});

// PATCH /api/users/:id
// Update user details, role, password or status
export const update = asyncHandler(async (req, res) => {
  const user = await service.updateUser(
    req.params.id,
    req.body,
    req.user.id
  );

  res.status(200).json(user);
});
