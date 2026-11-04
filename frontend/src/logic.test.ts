import { describe, expect, it } from 'vitest';
import type { Task } from '../../shared/task';
import { localToday } from './dates';
import { applyFilters, byUrgency, noFilters } from './filters';
import { positionBetween } from './ordering';

const task = (over: Partial<Task>): Task => ({
  id: over.title ?? 'id',
  title: 'Task',
  description: '',
  status: 'todo',
  priority: 'medium',
  dueDate: null,
  position: 0,
  createdAt: '',
  updatedAt: '',
  ...over,
});

describe('positionBetween', () => {
  it('handles the middle, both ends and an empty column', () => {
    expect(positionBetween(1024, 2048)).toBe(1536);
    expect(positionBetween(null, 0)).toBe(-1024);
    expect(positionBetween(0, null)).toBe(1024);
    expect(positionBetween(null, null)).toBe(0);
  });
});

describe('localToday', () => {
  it('uses the local date, not the UTC date', () => {
    expect(localToday(new Date(2026, 10, 3, 0, 30))).toBe('2026-11-03');
  });
});

describe('filters', () => {
  const today = '2026-11-03';
  const late = task({ title: 'late', dueDate: '2026-11-01' });
  const now = task({ title: 'now', dueDate: today, priority: 'high' });
  const finished = task({ title: 'finished', dueDate: '2026-11-01', status: 'done' });
  const all = [late, now, finished];

  it('never counts finished work as overdue', () => {
    expect(applyFilters(all, { ...noFilters, scope: 'overdue' }, today)).toEqual([late]);
  });

  it('combines search and priority', () => {
    expect(applyFilters(all, { ...noFilters, search: 'NO', priority: 'high' }, today)).toEqual([now]);
    expect(applyFilters(all, { ...noFilters, search: 'zzz' }, today)).toEqual([]);
  });

  it('sorts unfinished, soonest and highest priority first', () => {
    const someday = task({ title: 'someday' });
    expect([finished, someday, now, late].sort(byUrgency)).toEqual([late, now, someday, finished]);
  });
});
