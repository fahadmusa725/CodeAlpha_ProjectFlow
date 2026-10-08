import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(50, "Name must be at most 50 characters"),
  email: z.string().trim().toLowerCase().email("Invalid email address").max(254, "Email must be at most 254 characters"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be at most 72 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address").max(254, "Email must be at most 254 characters"),
  password: z.string().min(1, "Password is required").max(72, "Password must be at most 72 characters"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  description: z.string().trim().max(500, "Description must be at most 500 characters").optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be at most 100 characters").optional(),
  description: z.string().trim().max(500, "Description must be at most 500 characters").optional(),
});

export const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address").max(254, "Email must be at most 254 characters"),
});

const labelsSchema = z
  .array(z.string().trim().min(1, "Label cannot be empty").max(24, "Label must be at most 24 characters"))
  .max(5, "At most 5 labels allowed")
  .transform((arr) => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of arr) {
      const lower = item.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(item);
      }
    }
    return result;
  });

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be at most 200 characters"),
  description: z.string().trim().max(2000, "Description must be at most 2000 characters").optional(),
  status: z.enum(["todo", "in-progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  labels: labelsSchema.optional(),
  assignee: z.string().optional().nullable(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be at most 200 characters").optional(),
  description: z.string().trim().max(2000, "Description must be at most 2000 characters").optional(),
  status: z.enum(["todo", "in-progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  labels: labelsSchema.optional(),
  assignee: z.string().optional().nullable(),
  order: z.number().finite().min(-1_000_000).max(1_000_000).optional(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
});

export const createCommentSchema = z.object({
  text: z.string().trim().min(1, "Text is required").max(3000, "Text must be at most 3000 characters"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

