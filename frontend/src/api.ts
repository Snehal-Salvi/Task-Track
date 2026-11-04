import type { LoginInput, RegisterInput, User } from '../../shared/auth';
import type { CreateTask, Task, UpdateTask } from '../../shared/task';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    });
  } catch {
    throw new Error('Could not reach the server. Check that it is running.');
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(body?.error ?? `Request failed (${res.status})`, res.status);
  return body as T;
}

const post = <T,>(path: string, body: unknown) => call<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const api = {
  me: () => call<{ user: User | null }>('/auth/me'),
  register: (input: RegisterInput) => post<{ user: User }>('/auth/register', input),
  login: (input: LoginInput) => post<{ user: User }>('/auth/login', input),
  logout: () => call<void>('/auth/logout', { method: 'POST' }),
  list: () => call<Task[]>('/tasks'),
  create: (input: CreateTask) => call<Task>('/tasks', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, patch: UpdateTask) =>
    call<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  remove: (id: string) => call<void>(`/tasks/${id}`, { method: 'DELETE' }),
  restore: (id: string) => call<Task>(`/tasks/${id}/restore`, { method: 'POST' }),
};
