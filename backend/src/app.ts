import cookieParser from 'cookie-parser';
import express, { type ErrorRequestHandler } from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ZodError } from 'zod';
import { authRouter } from './routes/auth';
import { taskRouter } from './routes/tasks';

export function createApp(staticDir?: string) {
  const app = express();
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/api/auth', authRouter);
  app.use('/api/tasks', taskRouter);
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // `npm start` serves the built frontend from here, so one server hosts the whole app.
  if (staticDir && existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.use((_req, res) => res.sendFile(join(staticDir, 'index.html')));
  }

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) {
      res.status(400).json({ error: err.issues[0]?.message ?? 'Invalid input' });
      return;
    }
    if (err?.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Request body is not valid JSON' });
      return;
    }
    if (err?.code === 11000) {
      const error = err.keyPattern?.email ? 'An account with this email already exists' : 'This task already exists';
      res.status(409).json({ error });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server' });
  };
  app.use(onError);

  return app;
}
