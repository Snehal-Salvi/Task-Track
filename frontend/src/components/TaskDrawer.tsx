import { useEffect, useRef, useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { createTaskSchema, PRIORITIES, STATUSES, type CreateTask, type Priority, type Status, type Task } from '../../../shared/task';
import { STATUS_LABEL } from './Board';

export type DrawerState = { task: Task } | { draft: { title: string; status: Status } };

interface Props {
  state: DrawerState;
  onClose: () => void;
  onSave: (values: Omit<CreateTask, 'id'>) => void;
  onDelete: (task: Task) => void;
}

const Required = () => (
  <span className="required" aria-hidden="true">
    *
  </span>
);

export function TaskDrawer({ state, onClose, onSave, onDelete }: Props) {
  const task = 'task' in state ? state.task : null;
  const draft = 'draft' in state ? state.draft : null;
  const [title, setTitle] = useState(task?.title ?? draft?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<Status>(task?.status ?? draft?.status ?? 'todo');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);

  // The native dialog gives us the focus trap, Esc to close and the backdrop.
  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
    titleInput.current?.focus(); // showModal alone would focus the close button
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = createTaskSchema.safeParse({ title, description, status, priority, dueDate: dueDate || null });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    onSave(parsed.data);
  };

  return (
    <dialog
      ref={dialog}
      className="drawer"
      aria-labelledby="drawer-title"
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && onClose()}
    >
      <form className="drawer-form" onSubmit={submit} noValidate>
        <header className="drawer-head">
          <h2 id="drawer-title">{task ? 'Edit task' : 'New task'}</h2>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <p className="required-note">
          Fields marked with <Required /> are required.
        </p>

        <label className="field">
          <span>
            Title <Required />
          </span>
          <input
            ref={titleInput}
            required
            value={title}
            maxLength={120}
            aria-invalid={!!error}
            onChange={(e) => {
              setTitle(e.target.value);
              setError('');
            }}
          />
          {error && (
            <em className="field-error" role="alert">
              {error}
            </em>
          )}
        </label>

        <label className="field">
          <span>Description</span>
          <textarea rows={5} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <div className="field-row">
          <label className="field">
            <span>
              Status <Required />
            </span>
            <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>
              Priority <Required />
            </span>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p[0].toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Due date</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>

        <footer className="drawer-foot">
          {task && (
            <button type="button" className="button button-danger" onClick={() => onDelete(task)}>
              <Trash2 size={16} aria-hidden="true" /> Delete
            </button>
          )}
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button-primary" disabled={!title.trim()}>
            {task ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
            {task ? 'Save changes' : 'Add task'}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
