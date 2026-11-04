import { useMemo, useState } from 'react';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CheckCircle2, Circle, Plus, Timer, type LucideIcon } from 'lucide-react';
import { STATUSES, type Status, type Task } from '../../../shared/task';
import { positionBetween } from '../ordering';
import { TaskCard } from './TaskCard';

export const STATUS_LABEL: Record<Status, string> = { todo: 'To do', doing: 'In progress', done: 'Done' };
const EMPTY_TEXT: Record<Status, string> = {
  todo: 'No tasks here.',
  doing: 'Drag a task here when you start it.',
  done: 'Finished tasks land here.',
};

const STATUS_ICON: Record<Status, LucideIcon> = { todo: Circle, doing: Timer, done: CheckCircle2 };

type Columns = Record<Status, string[]>;

interface BoardProps {
  tasks: Task[];
  today: string;
  onMove: (id: string, status: Status, position: number) => void;
  onOpen: (task: Task) => void;
  onToggle: (task: Task) => void;
  onAdd?: (status: Status) => void;
}

function SortableCard({ task, today, onOpen, onToggle }: { task: Task; today: string; onOpen: () => void; onToggle: () => void }) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: task.id });
  // Marking the card as the activator keeps Enter and Space working on the buttons inside it.
  const setRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    setActivatorNodeRef(node);
  };
  return (
    <TaskCard
      ref={setRefs}
      task={task}
      today={today}
      onOpen={onOpen}
      onToggle={onToggle}
      className={isDragging ? 'card-ghost' : ''}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-roledescription="draggable task"
      aria-label={task.title}
    />
  );
}

function Column({ status, ids, children, onAdd }: { status: Status; ids: string[]; children: React.ReactNode; onAdd?: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const Icon = STATUS_ICON[status];
  return (
    <section className={`column column-${status}${isOver ? ' column-over' : ''}`} aria-label={STATUS_LABEL[status]}>
      <header className="column-head">
        <Icon size={15} className={`column-icon column-icon-${status}`} aria-hidden="true" />
        <h2>{STATUS_LABEL[status]}</h2>
        <span className="column-count">{ids.length}</span>
        {onAdd && (
          <button type="button" className="icon-button" aria-label={`Add a task to ${STATUS_LABEL[status]}`} onClick={onAdd}>
            <Plus size={18} aria-hidden="true" />
          </button>
        )}
      </header>
      <div ref={setNodeRef} className="column-cards">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
        {ids.length === 0 && <p className="column-empty">{onAdd ? EMPTY_TEXT[status] : 'No tasks here.'}</p>}
      </div>
    </section>
  );
}

export function Board({ tasks, today, onMove, onOpen, onToggle, onAdd }: BoardProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const saved = useMemo(() => {
    const columns: Columns = { todo: [], doing: [], done: [] };
    [...tasks].sort((a, b) => a.position - b.position).forEach((t) => columns[t.status].push(t.id));
    return columns;
  }, [tasks]);

  // While dragging, cards move in this local copy. Nothing is saved until the drop.
  const [dragging, setDragging] = useState<Columns | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const columns = dragging ?? saved;

  const columnOf = (id: string, from: Columns) =>
    STATUSES.includes(id as Status) ? (id as Status) : STATUSES.find((s) => from[s].includes(id));

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    setDragging(saved);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    setDragging((current) => {
      if (!current) return current;
      const id = String(active.id);
      const from = columnOf(id, current);
      const to = columnOf(String(over.id), current);
      if (!from || !to || from === to) return current;
      const overIndex = current[to].indexOf(String(over.id));
      const index = overIndex === -1 ? current[to].length : overIndex;
      return {
        ...current,
        [from]: current[from].filter((x) => x !== id),
        [to]: [...current[to].slice(0, index), id, ...current[to].slice(index)],
      };
    });
  };

  const finish = () => {
    setDragging(null);
    setActiveId(null);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const id = String(active.id);
    const task = byId.get(id);
    const status = dragging && columnOf(id, dragging);
    if (!over || !task || !dragging || !status) return finish();

    const list = dragging[status];
    const from = list.indexOf(id);
    const overIndex = list.indexOf(String(over.id));
    const final = overIndex === -1 ? list : arrayMove(list, from, overIndex);
    const index = final.indexOf(id);

    if (status !== task.status || saved[status].indexOf(id) !== index) {
      const before = index > 0 ? byId.get(final[index - 1])!.position : null;
      const after = index < final.length - 1 ? byId.get(final[index + 1])!.position : null;
      onMove(id, status, positionBetween(before, after));
    }
    finish();
  };

  const active = activeId ? byId.get(activeId) : undefined;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={finish}>
      <div className="board">
        {STATUSES.map((status) => (
          <Column key={status} status={status} ids={columns[status]} onAdd={onAdd && (() => onAdd(status))}>
            {columns[status].map((id) => {
              const task = byId.get(id);
              if (!task) return null;
              return <SortableCard key={id} task={task} today={today} onOpen={() => onOpen(task)} onToggle={() => onToggle(task)} />;
            })}
          </Column>
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 160, easing: 'ease-out' }}>
        {active ? <TaskCard task={active} today={today} lifted /> : null}
      </DragOverlay>
    </DndContext>
  );
}
