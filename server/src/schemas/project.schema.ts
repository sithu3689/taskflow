import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Project name must contain at least 3 characters.")
    .max(100, "Project name cannot exceed 100 characters."),

  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters.")
    .optional(),

  managerId: z.string().cuid("Invalid project manager ID."),

  status: z
    .enum([
      "PLANNED",
      "ACTIVE",
      "ON_HOLD",
      "COMPLETED",
      "CANCELLED",
    ])
    .default("PLANNED"),

  startDate: z.string().datetime().optional(),

  endDate: z.string().datetime().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;