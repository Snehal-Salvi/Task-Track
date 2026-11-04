# TaskTrack

A task manager where each user has a private account. Add a task in one line, drag it between columns on a board, and see at a glance what is overdue and what is due today.

## Run it

You need Node 22.13 or newer, and MongoDB running locally or an Atlas connection string.

```bash
npm install
npm run dev
```

Open http://localhost:5173 and create an account. Each new account starts with an empty board.

The app connects to `mongodb://127.0.0.1:27017/tasktrack` by default. To use Atlas or another address, copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI`. Set `JWT_SECRET` there too. It is required for `npm start`, and `openssl rand -hex 32` generates a good value.

Run all commands from the project root:

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the API (port 4000) and the frontend (port 5173) with live reload |
| `npm test` | Runs the backend and frontend tests. The backend tests need MongoDB running |
| `npm run build` | Type checks both sides and builds the frontend |
| `npm start` | Serves the built app and the API together on http://localhost:4000. Session cookies are https only in this mode, so deploy it behind https |

## Features

- Sign up, log in and log out, with each user's tasks private to them
- Create, edit and delete tasks, with a title, description, status, priority and due date
- Board view with drag and drop between and within columns, by mouse, touch or keyboard
- List view sorted by urgency
- Tabs with live counts that filter tasks (all, open, due today, overdue)
- Search and priority filter
- Undo after delete
- Phone layout
- Shortcuts: `N` for a new task, `/` for search

To drag with the keyboard, tab to a card, press Space, use the arrow keys, and press Space to drop.

## Stack

Built on the MERN stack, in TypeScript.

| Layer | Choice |
| --- | --- |
| Database | MongoDB with Mongoose |
| API | Express and Node, with Zod validation |
| Login | JWT in an httpOnly cookie, passwords hashed with bcrypt |
| Frontend | React, Vite, TanStack Query, dnd-kit, React-Toastify |
| Tests | Vitest, Supertest |

```
backend/src/
  index.ts         Connects to MongoDB and starts the server
  app.ts           Express setup and error handling
  routes/          Auth routes and task routes
  middleware/      Session cookie and requireAuth
  models/          User and Task schemas
frontend/src/
  App.tsx          Shows the login page or the task app
  TaskApp.tsx      The main screen
  components/      Login page, board, list, tabs, task drawer
  useTasks.ts      Loading and saving, with instant updates and rollback
  ordering.ts      Position between two neighbours
  filters.ts       Search, filter and sort rules
shared/            Validation rules and types used by both sides
```

## API

Every task route needs a logged in session and only ever touches that user's tasks.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account and log in |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/auth/me` | Get the logged in user |
| GET | `/api/tasks` | List your tasks |
| POST | `/api/tasks` | Create a task |
| PATCH | `/api/tasks/:id` | Update or move a task |
| DELETE | `/api/tasks/:id` | Soft delete a task |
| POST | `/api/tasks/:id/restore` | Undo a delete |

```bash
curl -c cookies.txt -X POST localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Asha","email":"asha@example.com","password":"password123"}'

curl -b cookies.txt -X POST localhost:4000/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Try the API","priority":"high","dueDate":"2026-12-01"}'
```

## Three key decisions

1. **Private accounts, enforced on the server.** A task manager on a shared platform is only useful if each person sees their own work, so every task has an owner and every query filters by the logged in user. The session is a JWT in an httpOnly cookie, which browser scripts cannot read. The trade-off is that a JWT cannot be cancelled before it expires, so a stolen session stays valid for up to 7 days.
2. **Update the screen first, then save.** Every change appears immediately and is rolled back with an error message if the server refuses it. This matters most for drag and drop, where waiting for a response would feel broken.
3. **Fractional positions for ordering.** A moved task gets a position halfway between its new neighbours, so a drag updates one document instead of renumbering a whole column.

## Deliberately not implemented

1. **Team sharing and roles.** Shared boards, admin and member roles, and live updates need a permissions model and WebSockets. Private tasks for each user meet the brief, so a team layer would be a large addition for this version.
2. **Password reset and email verification.** Both need an email service and secure one-time links. I would rather leave them out than ship a weak reset flow.
3. **Recurring tasks and reminders.** They need a background scheduler and notification delivery, plus rules for time zones and repeat patterns. That time was better spent on the quality of the main flow.

## Known limitation

**Two tabs can overwrite each other.** Saves are last write wins, so if the same task is edited in two tabs, the later save silently replaces the earlier one. With one more day I would add a `version` column, send the expected version with each update, return `409 Conflict` when it is out of date, and let the user review the newer copy before saving.
