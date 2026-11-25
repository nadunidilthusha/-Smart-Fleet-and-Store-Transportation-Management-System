import { z } from "zod";

// PATCH /api/notifications/:id   body { read: true | false }
export const setReadSchema = z.object({
  read: z.boolean({ invalid_type_error: "read must be true or false." }).default(true),
});