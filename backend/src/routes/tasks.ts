import { Router, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { createTaskSchema, updateTaskSchema, type Status } from '../../../shared/task';
import { requireAuth } from '../middleware/auth';
import { TaskModel, toTask, type TaskDoc } from '../models/Task';

const GAP = 1024; // room left between tasks so later moves can land between them

export const taskRouter = Router();
taskRouter.use(requireAuth);

// Every query starts from this filter, so a user can only ever reach their own tasks.
const mine = (res: Response) => ({ userId: res.locals.userId as string });
const mineAndLive = (res: Response) => ({ ...mine(res), deletedAt: null });

// New tasks and tasks moved without a position go to the top of their column.
async function topOf(res: Response, status: Status) {
  const first = await TaskModel.findOne({ ...mineAndLive(res), status }).sort({ position: 1 }).lean<TaskDoc>();
  return first ? first.position - GAP : 0;
}

taskRouter.get('/', async (_req, res) => {
  const docs = await TaskModel.find(mineAndLive(res)).sort({ position: 1 }).lean<TaskDoc[]>();
  res.json(docs.map(toTask));
});

taskRouter.post('/', async (req, res) => {
  const { id, ...input } = createTaskSchema.parse(req.body);
  const doc = await TaskModel.create({
    ...input,
    ...mine(res),
    _id: id ?? randomUUID(),
    position: await topOf(res, input.status),
  });
  res.status(201).json(toTask(doc));
});

taskRouter.patch('/:id', async (req, res) => {
  const patch = updateTaskSchema.parse(req.body);
  const filter = { ...mineAndLive(res), _id: req.params.id };
  const current = await TaskModel.findOne(filter).lean<TaskDoc>();
  if (!current) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  const moved = patch.status && patch.status !== current.status;
  if (moved && patch.position === undefined) patch.position = await topOf(res, patch.status!);

  const doc = await TaskModel.findOneAndUpdate(filter, { $set: patch }, { returnDocument: 'after' }).lean<TaskDoc>();
  res.json(toTask(doc!));
});

// Soft delete: the document stays so that Undo can bring the task back exactly as it was.
taskRouter.delete('/:id', async (req, res) => {
  const { modifiedCount } = await TaskModel.updateOne(
    { ...mineAndLive(res), _id: req.params.id },
    { deletedAt: new Date() },
    { timestamps: false },
  );
  if (!modifiedCount) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.status(204).end();
});

taskRouter.post('/:id/restore', async (req, res) => {
  const doc = await TaskModel.findOneAndUpdate(
    { ...mine(res), _id: req.params.id },
    { deletedAt: null },
    { returnDocument: 'after', timestamps: false },
  ).lean<TaskDoc>();
  if (!doc) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json(toTask(doc));
});
