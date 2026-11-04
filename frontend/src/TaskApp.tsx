import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ClipboardList, LogOut, Plus, Search } from 'lucide-react';
import type { User } from '../../shared/auth';
import { PRIORITIES, type Status, type Task } from '../../shared/task';
import { Board, STATUS_LABEL } from './components/Board';
import { ListView } from './components/ListView';
import { QuickAdd } from './components/QuickAdd';
import { TaskDrawer, type DrawerState } from './components/TaskDrawer';
import { TaskTabs, type View } from './components/TaskTabs';
import { localToday } from './dates';
import { applyFilters, noFilters, type Filters } from './filters';
import { useTasks } from './useTasks';

function remembered<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private windows can block storage. The app still works, it just forgets.
  }
}

export function TaskApp({ user, onLogOut }: { user: User; onLogOut: () => void }) {
  const { tasks, isPending, isError, error, refetch, createTask, updateTask, deleteTask } = useTasks();
  const [filters, setFilters] = useState<Filters>(noFilters);
  const [view, setView] = useState<View>(() => remembered('view', 'board'));
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const today = localToday();
  const visible = useMemo(() => applyFilters(tasks, filters, today), [tasks, filters, today]);

  useEffect(() => remember('view', view), [view]);

  // N jumps to the add box and / jumps to search, unless the user is already typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || target.closest('input, textarea, select, dialog')) return;
      if (e.key === 'n') addRef.current?.focus();
      else if (e.key === '/') searchRef.current?.focus();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const moveTask = (id: string, status: Status, position: number) => {
    const sameColumn = tasks.find((t) => t.id === id)?.status === status;
    updateTask(id, { status, position }, sameColumn ? 'Order updated' : `Moved to ${STATUS_LABEL[status]}`);
  };

  const toggleDone = (task: Task) => {
    const done = task.status === 'done';
    updateTask(task.id, { status: done ? 'todo' : 'done' }, done ? 'Moved back to To do' : 'Marked as done');
  };
  const openDraft = (title: string, status: Status) => setDrawer({ draft: { title, status } });

  const saveDrawer: React.ComponentProps<typeof TaskDrawer>['onSave'] = (values) => {
    if (drawer && 'task' in drawer) updateTask(drawer.task.id, values, 'Task updated');
    else createTask(values);
    setDrawer(null);
  };

  const onAllTasks = filters.scope === 'all'; // tasks are only added from this screen
  const refining = filters.search !== '' || filters.priority !== 'all';
  const filtering = refining || !onAllTasks;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <CheckCircle2 size={16} strokeWidth={2.75} />
            </span>
            <h1 className="brand-name">TaskTrack</h1>
          </div>
          <label className="search">
            <Search size={16} aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search tasks"
              aria-label="Search tasks"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </label>
          <div className="account">
            <span className="avatar" aria-hidden="true">
              {user.name[0].toUpperCase()}
            </span>
            <span className="account-name">{user.name}</span>
            <button type="button" className="button logout" aria-label="Log out" onClick={onLogOut}>
              <LogOut size={15} aria-hidden="true" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="workspace">
        <TaskTabs
          tasks={tasks}
          today={today}
          scope={filters.scope}
          onScope={(scope) => setFilters({ ...filters, scope })}
          view={view}
          onView={setView}
        />

        <div className="toolbar">
          {onAllTasks && (
            <QuickAdd
              onAdd={(title) => createTask({ title, description: '', status: 'todo', priority: 'medium', dueDate: null })}
              onAddWithDetails={(title) => openDraft(title, 'todo')}
              inputRef={addRef}
            />
          )}
          <div className="segmented priority-filter" role="group" aria-label="Filter by priority">
            {(['all', ...PRIORITIES] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={filters.priority === p}
                onClick={() => setFilters({ ...filters, priority: p })}
              >
                {p === 'all' ? 'All' : p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {refining && (
          <p className="filter-note">
            Showing {visible.length} of {tasks.length} tasks
            <button type="button" onClick={() => setFilters({ ...noFilters, scope: filters.scope })}>
              Clear filters
            </button>
          </p>
        )}

        {isPending ? (
          <div className="board" aria-label="Loading tasks">
            {[0, 1, 2].map((n) => (
              <div key={n} className="column column-skeleton" />
            ))}
          </div>
        ) : isError ? (
          <div className="notice" role="alert">
            <h2>Tasks could not be loaded</h2>
            <p>{error.message}</p>
            <button type="button" className="button button-primary" onClick={() => refetch()}>
              Try again
            </button>
          </div>
        ) : filtering && visible.length === 0 ? (
          <div className="notice">
            <h2>No tasks match these filters</h2>
            <button type="button" className="button" onClick={() => setFilters(noFilters)}>
              Clear filters
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="notice welcome">
            <span className="welcome-icon" aria-hidden="true">
              <ClipboardList size={26} />
            </span>
            <h2>Welcome, {user.name}</h2>
            <p>Create your first task to get started.</p>
            <button type="button" className="button button-primary" onClick={() => openDraft('', 'todo')}>
              <Plus size={16} aria-hidden="true" /> Add your first task
            </button>
          </div>
        ) : view === 'board' ? (
          <Board
            tasks={visible}
            today={today}
            onMove={moveTask}
            onOpen={(task) => setDrawer({ task })}
            onToggle={toggleDone}
            onAdd={onAllTasks ? (status) => openDraft('', status) : undefined}
          />
        ) : (
          <ListView tasks={visible} today={today} onOpen={(task) => setDrawer({ task })} onToggle={toggleDone} />
        )}
      </main>

      {drawer && (
        <TaskDrawer
          key={'task' in drawer ? drawer.task.id : 'new'}
          state={drawer}
          onClose={() => setDrawer(null)}
          onSave={saveDrawer}
          onDelete={(task) => {
            setDrawer(null);
            deleteTask(task);
          }}
        />
      )}
    </div>
  );
}
