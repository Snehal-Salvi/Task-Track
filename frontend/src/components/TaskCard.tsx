import { forwardRef, type HTMLAttributes } from 'react';
import { CalendarDays, Check } from 'lucide-react';
import type { Priority, Task } from '../../../shared/task';
import { formatDue } from '../dates';
import { isOverdue } from '../filters';

const LEVEL: Record<Priority, number> = { low: 1, medium: 2, high: 3 };

export function PriorityMark({ priority }: { priority: Priority }) {
  return (
    <span className={`priority priority-${priority}`} title={`${priority} priority`}>
      <span className="bars" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <i key={n} data-on={n <= LEVEL[priority]} />
        ))}
      </span>
      <span className="priority-label">{priority[0].toUpperCase() + priority.slice(1)}</span>
    </span>
  );
}

export function DueDate({ task, today }: { task: Task; today: string }) {
  if (!task.dueDate) return null;
  const late = isOverdue(task, today);
  return (
    <span className={`due${late ? ' due-late' : ''}`}>
      <CalendarDays size={14} aria-hidden="true" />
      {late && <span className="sr-only">Overdue, </span>}
      {formatDue(task.dueDate, today)}
    </span>
  );
}

export function DoneButton({ task, onToggle }: { task: Task; onToggle?: () => void }) {
  const done = task.status === 'done';
  return (
    <button
      type="button"
      className="tick"
      aria-pressed={done}
      aria-label={done ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`}
      onClick={onToggle}
    >
      {done && <Check size={14} strokeWidth={3} aria-hidden="true" />}
    </button>
  );
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  task: Task;
  today: string;
  lifted?: boolean;
  onOpen?: () => void;
  onToggle?: () => void;
}

export const TaskCard = forwardRef<HTMLDivElement, CardProps>(function TaskCard(
  { task, today, lifted, onOpen, onToggle, className = '', ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`card${task.status === 'done' ? ' card-done' : ''}${lifted ? ' card-lifted' : ''} ${className}`}
      {...rest}
    >
      <DoneButton task={task} onToggle={onToggle} />
      <div className="card-body">
        <button type="button" className="card-title" onClick={onOpen}>
          {task.title}
        </button>
        {task.description && <p className="card-text">{task.description}</p>}
        <div className="card-meta">
          <PriorityMark priority={task.priority} />
          <DueDate task={task} today={today} />
        </div>
      </div>
    </div>
  );
});
