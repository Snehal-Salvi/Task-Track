import { z } from 'zod';

// One source of truth: the API and the form validate with these same rules.
export const STATUSES = ['todo', 'doing', 'done'] as const;
export const PRIORITIES = ['low', 'medium', 'high'] as const;

export type Status = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];

const fields = {
  title: z.string().trim().min(1, 'Give the task a title').max(120, 'Keep the title under 120 characters'),
  description: z.string().trim().max(2000, 'Keep the description under 2000 characters'),
  status: z.enum(STATUSES),
  priority: z.enum(PRIORITIES),
  dueDate: z.iso.date('Enter a valid date').nullable(), // YYYY-MM-DD, no time zone involved
};

export const createTaskSchema = z.object({
  id: z.uuid().optional(), // the client may pick the id so it can show the task instantly
  title: fields.title,
  description: fields.description.default(''),
  status: fields.status.default('todo'),
  priority: fields.priority.default('medium'),
  dueDate: fields.dueDate.default(null),
});

export const updateTaskSchema = z
  .object({ ...fields, position: z.number().finite() })
  .partial()
  .strict();

export type CreateTask = z.infer<typeof createTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  dueDate: string | null;
  position: number; // order inside a column, see positionBetween in src/ordering.ts
  createdAt: string;
  updatedAt: string;
}
