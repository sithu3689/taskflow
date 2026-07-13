import { z } from "zod";

const taskStatusSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "COMPLETED",
]);

const taskPrioritySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Task title must contain at least 3 characters.")
    .max(150, "Task title cannot exceed 150 characters."),

  description: z
    .string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters.")
    .optional(),

  projectId: z.string().min(1, "Project ID is required."),

  assignedToId: z.string().min(1).optional(),

  status: taskStatusSchema.default("TODO"),

  priority: taskPrioritySchema.default("MEDIUM"),

  progress: z
    .number()
    .int()
    .min(0, "Progress cannot be less than 0.")
    .max(100, "Progress cannot be greater than 100.")
    .default(0),

  dueDate: z.string().datetime().optional(),
});

export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3)
      .max(150)
      .optional(),

    description: z
      .string()
      .trim()
      .max(1000)
      .optional(),

    assignedToId: z.string().min(1).nullable().optional(),

    status: taskStatusSchema.optional(),

    priority: taskPrioritySchema.optional(),

    progress: z
      .number()
      .int()
      .min(0)
      .max(100)
      .optional(),

    dueDate: z.string().datetime().nullable().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided.",
  );

export const updateTaskProgressSchema = z.object({
  progress: z
    .number()
    .int()
    .min(0)
    .max(100),
});