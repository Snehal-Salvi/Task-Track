import { model, Schema } from 'mongoose';
import { PRIORITIES, STATUSES, type Priority, type Status, type Task } from '../../../shared/task';

export interface TaskDoc {
  _id: string; // a UUID, so the browser can create the id and show the task instantly
  userId: string; // the owner
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  dueDate: string | null; // YYYY-MM-DD, stored as text so time zones cannot shift it
  position: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<TaskDoc>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, enum: STATUSES, required: true },
    priority: { type: String, enum: PRIORITIES, required: true },
    dueDate: { type: String, default: null },
    position: { type: Number, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

// Matches the two common reads: one user's live tasks, and the top of one column.
taskSchema.index({ userId: 1, deletedAt: 1, status: 1, position: 1 });

export const TaskModel = model<TaskDoc>('Task', taskSchema);

export const toTask = (doc: TaskDoc): Task => ({
  id: doc._id,
  title: doc.title,
  description: doc.description,
  status: doc.status,
  priority: doc.priority,
  dueDate: doc.dueDate,
  position: doc.position,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});
