import { z } from 'zod';

// Same idea as task.ts: the forms and the API validate with these same rules.
const email = z.email('Enter a valid email address').trim().toLowerCase();

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(60, 'Keep your name under 60 characters'),
  email,
  password: z
    .string()
    .min(8, 'Use at least 8 characters for your password')
    .max(72, 'Keep your password under 72 characters'), // bcrypt ignores anything longer
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export interface User {
  id: string;
  name: string;
  email: string;
}
