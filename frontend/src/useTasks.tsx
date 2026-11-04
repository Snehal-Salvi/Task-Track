import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Undo2 } from 'lucide-react';
import { toast } from 'react-toastify';
import type { CreateTask, Status, Task, UpdateTask } from '../../shared/task';
import { api } from './api';

const key = ['tasks'];

// Same rule as the server: a task with no explicit position goes to the top of its column.
const topOf = (tasks: Task[], status: Status) =>
  Math.min(1024, ...tasks.filter((t) => t.status === status).map((t) => t.position)) - 1024;

export function useTasks() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: key, queryFn: api.list });

  const mutation = useMutation({
    mutationKey: key,
    mutationFn: (send: () => Promise<unknown>) => send(),
    onSettled: () => {
      // Refetch only after the last pending change, or an old response could undo a newer move.
      if (client.isMutating({ mutationKey: key }) === 1) client.invalidateQueries({ queryKey: key });
    },
  });
  const { mutateAsync } = mutation;

  /** Update the screen first, then the server. Put the old state back if the server refuses. */
  const change = useCallback(
    async (apply: (tasks: Task[]) => Task[], send: () => Promise<unknown>) => {
      client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<Task[]>(key);
      client.setQueryData<Task[]>(key, (tasks = []) => apply(tasks));
      try {
        await mutateAsync(send);
        return true;
      } catch (error) {
        client.setQueryData(key, previous);
        toast.error(`Change not saved. ${(error as Error).message}`);
        return false;
      }
    },
    [client, mutateAsync],
  );

  const createTask = useCallback(
    async (input: Omit<CreateTask, 'id'>) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const saved = await change(
        (tasks) => [{ ...input, id, position: topOf(tasks, input.status), createdAt: now, updatedAt: now }, ...tasks],
        () => api.create({ ...input, id }),
      );
      if (saved) toast.success('Task added');
    },
    [change],
  );

  const updateTask = useCallback(
    async (id: string, patch: UpdateTask, message: string) => {
      const saved = await change(
        (tasks) =>
          tasks.map((t) => {
            if (t.id !== id) return t;
            const moved = patch.status && patch.status !== t.status && patch.position === undefined;
            return { ...t, ...patch, position: moved ? topOf(tasks, patch.status!) : (patch.position ?? t.position) };
          }),
        () => api.update(id, patch),
      );
      if (saved) toast.success(message);
    },
    [change],
  );

  const deleteTask = useCallback(
    async (task: Task) => {
      const undo = async () => {
        const saved = await change(
          (tasks) => [...tasks, task],
          () => api.restore(task.id),
        );
        if (saved) toast.success('Task restored');
      };
      const saved = await change(
        (tasks) => tasks.filter((t) => t.id !== task.id),
        () => api.remove(task.id),
      );
      if (!saved) return;
      toast.info(
        ({ closeToast }) => (
          <span className="toast-undo">
            Task deleted
            <button
              type="button"
              onClick={() => {
                closeToast();
                undo();
              }}
            >
              <Undo2 size={14} aria-hidden="true" /> Undo
            </button>
          </span>
        ),
        { autoClose: 6000, closeButton: false },
      );
    },
    [change],
  );

  return { ...query, tasks: query.data ?? [], createTask, updateTask, deleteTask };
}
