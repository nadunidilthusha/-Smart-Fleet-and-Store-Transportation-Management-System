import { z } from "zod";

// Request validation for Store Web login (separate from any admin login schema)
export const storeLoginSchema = z.object({
  storeId: z.string().trim().min(1, "Select your assigned store location."),
  identity: z.string().trim().min(1, "Enter your work email or employee ID."),
  password: z.string().min(1, "Enter your password."),
});
