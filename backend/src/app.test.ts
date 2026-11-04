import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { TaskModel } from './models/Task';
import { UserModel } from './models/User';

// Uses a real MongoDB, in a separate database that is removed afterwards.
const uri = process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017/tasktrack-test';
const app = createApp();

let api: ReturnType<typeof request.agent>; // keeps the login cookie between requests

const signUp = async (email: string) => {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: 'Test', email, password: 'password123' }).expect(201);
  return agent;
};

const add = async (title: string, extra = {}, agent = api) =>
  (await agent.post('/api/tasks').send({ title, ...extra }).expect(201)).body;

beforeAll(async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  await UserModel.init(); // waits for the unique email index
});
beforeEach(async () => {
  await Promise.all([TaskModel.deleteMany({}), UserModel.deleteMany({})]);
  api = await signUp('asha@example.com');
});
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('accounts', () => {
  it('never returns the password or its hash, and stores only a hash', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ravi', email: 'RAVI@example.com', password: 'password123' })
      .expect(201);
    expect(res.body.user).toEqual({ id: expect.any(String), name: 'Ravi', email: 'ravi@example.com' });
    const stored = await UserModel.findOne({ email: 'ravi@example.com' }).select('+passwordHash');
    expect(stored!.passwordHash).not.toContain('password123');
  });

  it('sets the session in an httpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'asha@example.com', password: 'password123' })
      .expect(200);
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/);
    expect(res.headers['set-cookie'][0]).toMatch(/SameSite=Lax/);
  });

  it('rejects a duplicate email, a short password and a bad email', async () => {
    const send = (body: object) => request(app).post('/api/auth/register').send(body);
    const taken = await send({ name: 'A', email: 'asha@example.com', password: 'password123' }).expect(409);
    expect(taken.body.error).toBe('An account with this email already exists');
    await send({ name: 'A', email: 'new@example.com', password: 'short' }).expect(400);
    await send({ name: 'A', email: 'nope', password: 'password123' }).expect(400);
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const wrong = await request(app).post('/api/auth/login').send({ email: 'asha@example.com', password: 'wrong' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'no@example.com', password: 'wrong' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it('remembers the user until they log out', async () => {
    expect((await api.get('/api/auth/me')).body.user.email).toBe('asha@example.com');
    await api.post('/api/auth/logout').expect(204);
    expect((await api.get('/api/auth/me')).body.user).toBeNull();
    await api.get('/api/tasks').expect(401);
  });

  it('rejects a forged session cookie', async () => {
    await request(app).get('/api/tasks').set('Cookie', 'tasktrack_session=forged.token.here').expect(401);
  });
});

describe('private tasks', () => {
  it('requires a login for every task route', async () => {
    const guest = request(app);
    await guest.get('/api/tasks').expect(401);
    await guest.post('/api/tasks').send({ title: 'A' }).expect(401);
    await guest.patch('/api/tasks/x').send({ title: 'A' }).expect(401);
    await guest.delete('/api/tasks/x').expect(401);
    await guest.post('/api/tasks/x/restore').expect(401);
  });

  it('never lets one user read or change another user’s task', async () => {
    const task = await add('Private', { priority: 'high' });
    const other = await signUp('ravi@example.com');

    expect((await other.get('/api/tasks')).body).toEqual([]);
    await other.patch(`/api/tasks/${task.id}`).send({ title: 'Hacked' }).expect(404);
    await other.delete(`/api/tasks/${task.id}`).expect(404);
    await other.post(`/api/tasks/${task.id}/restore`).expect(404);

    const [mine] = (await api.get('/api/tasks')).body;
    expect(mine).toMatchObject({ id: task.id, title: 'Private', priority: 'high' });
  });

  it('cannot restore another user’s deleted task', async () => {
    const task = await add('Private');
    await api.delete(`/api/tasks/${task.id}`).expect(204);
    const other = await signUp('ravi@example.com');
    await other.post(`/api/tasks/${task.id}/restore`).expect(404);
    expect((await api.get('/api/tasks')).body).toEqual([]);
  });

  it('keeps each user’s column order separate', async () => {
    const first = await add('Mine');
    const other = await signUp('ravi@example.com');
    const theirs = await add('Theirs', {}, other);
    expect(theirs.position).toBe(first.position);
  });

  it('does not accept an owner in an update', async () => {
    const task = await add('A');
    await api.patch(`/api/tasks/${task.id}`).send({ userId: 'someone-else' }).expect(400);
  });
});

describe('tasks API', () => {
  it('creates a task with sensible defaults', async () => {
    const task = await add('  Buy milk  ');
    expect(task).toMatchObject({ title: 'Buy milk', status: 'todo', priority: 'medium', dueDate: null });
  });

  it('rejects an empty title and a bad date with a readable message', async () => {
    const empty = await api.post('/api/tasks').send({ title: '   ' }).expect(400);
    expect(empty.body.error).toBe('Give the task a title');
    await api.post('/api/tasks').send({ title: 'x', dueDate: '2026-13-40' }).expect(400);
  });

  it('puts new tasks at the top of the column', async () => {
    await add('First');
    await add('Second');
    const { body } = await api.get('/api/tasks').expect(200);
    expect(body.map((t: { title: string }) => t.title)).toEqual(['Second', 'First']);
  });

  it('moves one task by changing only that task', async () => {
    const a = await add('A');
    const b = await add('B');
    await api.patch(`/api/tasks/${b.id}`).send({ status: 'doing', position: 512 }).expect(200);
    const { body } = await api.get('/api/tasks');
    expect(body.find((t: { id: string }) => t.id === a.id).updatedAt).toBe(a.updatedAt);
    expect(body.find((t: { id: string }) => t.id === b.id)).toMatchObject({ status: 'doing', position: 512 });
  });

  it('can clear a due date but keeps it when not mentioned', async () => {
    const task = await add('A', { dueDate: '2026-12-01' });
    const kept = await api.patch(`/api/tasks/${task.id}`).send({ title: 'B' });
    expect(kept.body.dueDate).toBe('2026-12-01');
    const cleared = await api.patch(`/api/tasks/${task.id}`).send({ dueDate: null });
    expect(cleared.body.dueDate).toBeNull();
  });

  it('hides a deleted task and restores it unchanged', async () => {
    const task = await add('A', { priority: 'high' });
    await api.delete(`/api/tasks/${task.id}`).expect(204);
    expect((await api.get('/api/tasks')).body).toEqual([]);
    await api.patch(`/api/tasks/${task.id}`).send({ title: 'B' }).expect(404);
    const restored = await api.post(`/api/tasks/${task.id}/restore`).expect(200);
    expect(restored.body).toMatchObject({ title: 'A', priority: 'high' });
  });

  it('rejects a duplicate id and returns 404 for unknown routes', async () => {
    const id = crypto.randomUUID();
    await add('A', { id });
    await api.post('/api/tasks').send({ title: 'B', id }).expect(409);
    await api.delete('/api/tasks/nope').expect(404);
    await api.get('/api/nope').expect(404);
  });
});
