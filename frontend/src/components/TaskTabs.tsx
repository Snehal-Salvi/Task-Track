import { AlertTriangle, CalendarClock, CircleDot, LayoutGrid, LayoutList, List, type LucideIcon } from 'lucide-react';
import type { Task } from '../../../shared/task';
import { isDueToday, isOverdue, type Scope } from '../filters';

export type View = 'board' | 'list';

const TABS: [Scope, string, LucideIcon][] = [
  ['all', 'All tasks', LayoutList],
  ['open', 'Open', CircleDot],
  ['today', 'Due today', CalendarClock],
  ['overdue', 'Overdue', AlertTriangle],
];

interface Props {
  tasks: Task[];
  today: string;
  scope: Scope;
  onScope: (scope: Scope) => void;
  view: View;
  onView: (view: View) => void;
}

export function TaskTabs({ tasks, today, scope, onScope, view, onView }: Props) {
  const counts: Record<Scope, number> = {
    all: tasks.length,
    open: tasks.filter((t) => t.status !== 'done').length,
    today: tasks.filter((t) => isDueToday(t, today)).length,
    overdue: tasks.filter((t) => isOverdue(t, today)).length,
  };

  return (
    <div className="tabs-row">
      <nav className="tabs" aria-label="Filter tasks">
        {TABS.map(([value, label, Icon]) => (
          <button key={value} type="button" className="tab" aria-pressed={scope === value} onClick={() => onScope(value)}>
            <Icon size={15} aria-hidden="true" />
            {label}
            <span className={`tab-count${value === 'overdue' && counts.overdue > 0 ? ' tab-count-alert' : ''}`}>
              {counts[value]}
            </span>
          </button>
        ))}
      </nav>
      <div className="segmented view-switch" role="group" aria-label="Choose a view">
        <button type="button" aria-pressed={view === 'board'} onClick={() => onView('board')}>
          <LayoutGrid size={15} aria-hidden="true" /> Board
        </button>
        <button type="button" aria-pressed={view === 'list'} onClick={() => onView('list')}>
          <List size={15} aria-hidden="true" /> List
        </button>
      </div>
    </div>
  );
}
