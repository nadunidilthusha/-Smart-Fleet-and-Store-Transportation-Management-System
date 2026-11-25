
import { z } from "zod";

const ROLES = [
  "SYSTEM_ADMIN",
  "STORE_MANAGER",
  "STORE_EMPLOYEE",
  "DRIVER",
];

const passwordSchema = z
  .string()
  .min(8, "Password must contain at least 8 characters.")
  .regex(/[A-Za-z]/, "Password must contain at least one letter.")
  .regex(/\d/, "Password must contain at least one number.");

const storeIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Select a valid store.")
  .nullable();

const roleSchema = z.enum(ROLES);

const nameSchema = z
  .string()
  .trim()
  .min(2, "Enter the full name.");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

const employeeIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z0-9-]{3,20}$/,
    "Employee ID must contain 3 to 20 letters, numbers or dashes."
  );

const statusSchema = z.enum(["Active", "Inactive"]);

// Create a new user
export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  employeeId: employeeIdSchema,
  password: passwordSchema,
  role: roleSchema,
  storeId: storeIdSchema.optional(),
});

// Update an existing user
export const updateUserSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  role: roleSchema.optional(),
  storeId: storeIdSchema.optional(),
  status: statusSchema.optional(),
});

// Validate MongoDB user ID
export const userIdSchema = z.object({
  id: z.string().regex(
    /^[a-f\d]{24}$/i,
    "Invalid user ID."
  ),
});
