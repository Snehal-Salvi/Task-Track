import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { loginSchema, registerSchema } from '../../../shared/auth';
import { endSession, sessionUserId, startSession } from '../middleware/auth';
import { toUser, UserModel } from '../models/User';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const { name, email, password } = registerSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create({ name, email, passwordHash });
  startSession(res, user._id.toString());
  res.status(201).json({ user: toUser(user) });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await UserModel.findOne({ email }).select('+passwordHash');
  // One message for both cases, so the form cannot reveal which emails have accounts.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Incorrect email or password' });
    return;
  }
  startSession(res, user._id.toString());
  res.json({ user: toUser(user) });
});

authRouter.post('/logout', (_req, res) => {
  endSession(res);
  res.status(204).end();
});

// Tells the app on page load whether someone is logged in. Being logged out is a normal answer.
authRouter.get('/me', async (req, res) => {
  const userId = sessionUserId(req);
  const user = userId ? await UserModel.findById(userId) : null;
  res.json({ user: user ? toUser(user) : null });
});
