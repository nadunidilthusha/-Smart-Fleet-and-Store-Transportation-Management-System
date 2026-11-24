import { z } from "zod";

// Request validation for the Admin portal login (the email is lower-cased and trimmed here)
export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

// Request validation for Store Web login (separate from any admin login schema)
export const storeLoginSchema = z.object({
  storeId: z.string().trim().min(1, "Select your assigned store location."),
  identity: z.string().trim().min(1, "Enter your work email or employee ID."),
  password: z.string().min(1, "Enter your password."),
});