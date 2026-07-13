import { z } from "zod";

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters.")
    .max(100, "Name cannot exceed 100 characters."),

  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(8, "Password must contain at least 8 characters.")
    .max(72, "Password cannot exceed 72 characters."),

  role: z.enum(["ADMIN", "PROJECT_MANAGER", "TEAM_MEMBER"]),
});

export const updateUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must contain at least 2 characters.")
      .max(100, "Name cannot exceed 100 characters.")
      .optional(),

    email: z
      .string()
      .trim()
      .email("Please enter a valid email address.")
      .transform((value) => value.toLowerCase())
      .optional(),

    role: z
      .enum(["ADMIN", "PROJECT_MANAGER", "TEAM_MEMBER"])
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided.",
  );

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;