import type { Priority, Task } from '../../shared/task';

export type Scope = 'all' | 'open' | 'overdue' | 'today';

export interface Filters {
  search: string;
  priority: Priority | 'all';
  scope: Scope;
}

export const noFilters: Filters = { search: '', priority: 'all', scope: 'all' };

export const isOverdue = (t: Task, today: string) => t.status !== 'done' && !!t.dueDate && t.dueDate < today;
export const isDueToday = (t: Task, today: string) => t.status !== 'done' && t.dueDate === today;

export function applyFilters(tasks: Task[], filters: Filters, today: string): Task[] {
  const term = filters.search.trim().toLowerCase();
  return tasks.filter((t) => {
    if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
    if (filters.scope === 'open' && t.status === 'done') return false;
    if (filters.scope === 'overdue' && !isOverdue(t, today)) return false;
    if (filters.scope === 'today' && !isDueToday(t, today)) return false;
    return !term || `${t.title} ${t.description}`.toLowerCase().includes(term);
  });
}

const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

/** List view order: unfinished first, then soonest due date, then highest priority. */
export function byUrgency(a: Task, b: Task): number {
  const done = Number(a.status === 'done') - Number(b.status === 'done');
  if (done) return done;
  const dueA = a.dueDate ?? '9999-12-31';
  const dueB = b.dueDate ?? '9999-12-31';
  return dueA.localeCompare(dueB) || rank[a.priority] - rank[b.priority];
}
