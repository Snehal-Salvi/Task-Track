import type { Task } from '../../../shared/task';
import { byUrgency } from '../filters';
import { STATUS_LABEL } from './Board';
import { DoneButton, DueDate, PriorityMark } from './TaskCard';

interface Props {
  tasks: Task[];
  today: string;
  onOpen: (task: Task) => void;
  onToggle: (task: Task) => void;
}

export function ListView({ tasks, today, onOpen, onToggle }: Props) {
  return (
    <ul className="list" aria-label="Tasks, most urgent first">
      <li className="row row-head" aria-hidden="true">
        <span />
        <span>Task</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Due</span>
      </li>
      {[...tasks].sort(byUrgency).map((task) => (
        <li key={task.id} className={`row${task.status === 'done' ? ' row-done' : ''}`}>
          <DoneButton task={task} onToggle={() => onToggle(task)} />
          <div className="row-main">
            <button type="button" className="card-title" onClick={() => onOpen(task)}>
              {task.title}
            </button>
            {task.description && <p className="card-text">{task.description}</p>}
          </div>
          <span className={`status status-${task.status}`}>{STATUS_LABEL[task.status]}</span>
          <PriorityMark priority={task.priority} />
          <span className="row-due">
            <DueDate task={task} today={today} />
          </span>
        </li>
      ))}
    </ul>
  );
}
