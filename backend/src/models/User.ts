import { model, Schema, type Types } from 'mongoose';
import type { User } from '../../../shared/auth';

export interface UserDoc {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
}

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    // Left out of every query unless a route asks for it, so it can never leak in a response.
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true, versionKey: false },
);

export const UserModel = model<UserDoc>('User', userSchema);

export const toUser = (doc: Pick<UserDoc, '_id' | 'name' | 'email'>): User => ({
  id: doc._id.toString(),
  name: doc.name,
  email: doc.email,
});
