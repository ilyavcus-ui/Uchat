# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Uchat — a Russian-language corporate chat app: work-item tracking ("работы"), scheduled events, a lunch schedule, and real-time 1:1 messaging over WebSocket. Backend is FastAPI + asyncpg (PostgreSQL), frontend is React 18 + Vite + Tailwind. In production the backend serves the built frontend as static files from a single process on one port.

Full feature/API/DB documentation lives in [README.md](README.md) (in Russian) — read it for user-facing behavior, the complete REST/WebSocket API surface, and DB table descriptions before making functional changes.

## Commands

Backend (from `backend/`):
```bash
pip install -r requirements.txt
python main.py          # runs on HOST:PORT from backend/.env (default 0.0.0.0:8001)
```

Frontend (from `frontend/`):
```bash
npm install
npm run dev              # Vite dev server on :3001, proxies /api, /ws, /uploads to :8001
npm run build             # outputs to frontend/dist, which backend/main.py serves directly
npm run preview
```

Docker (the only supported way to run the full stack — no Windows batch scripts anymore): `docker-compose.yml` runs Postgres 16 + the backend (Dockerfile does a multi-stage build: `npm run build` for the frontend, then copies `dist/` into the Python image alongside `backend/`). `docker compose up -d --build` from the repo root.

There is no test suite or type-checker configured in this repo — don't invent commands for `npm test`, `pytest`, etc. Backend style is checked with `flake8` (not a project dependency, install ad hoc: `pip install flake8`) — run `python -m flake8 --max-line-length=99 .` from `backend/` and it should report zero issues; keep it that way.

A Vite dev server config lives at [.claude/launch.json](.claude/launch.json) (`frontend-dev`, port 3001) for previewing the frontend without a full Docker rebuild — it proxies `/api`/`/ws` to the backend on :8001, so start the backend (Docker or `python main.py`) first.

## Architecture

**Single-port deployment**: `backend/main.py` mounts `frontend/dist` as static files and serves `index.html` for any non-`/api` route (SPA fallback), so in production there is only one server/port. During development the two run separately (Vite on :3001 proxying to FastAPI on :8001).

**Backend module layout** — everything is flat under `backend/`, no `app/` package:
- [main.py](backend/main.py) — FastAPI app assembly, lifespan (`init_db` → start background tasks → ... → `close_pool`), the single `/ws` WebSocket endpoint (handles `chat_message` and `typing` inline, not via a router), CORS, static file / SPA serving.
- [config.py](backend/config.py) — loads `backend/.env` (HOST, PORT, DATABASE_URL, CORS_ORIGINS, LOG_LEVEL) via `python-dotenv`.
- [database.py](backend/database.py) — the single asyncpg connection pool (`get_pool()`), `init_db()` (idempotent `CREATE TABLE IF NOT EXISTS` for all tables — there is no separate migration tool in normal operation; `migrate_sqlite_to_pg.sql` was a one-time legacy migration), and `now_ufa()` — **all timestamps in this app are naive datetimes in Ufa time (UTC+5)**, stored as ISO strings in TEXT columns, not real `TIMESTAMP`/`TIMESTAMPTZ` columns. Always use `now_ufa()` rather than `datetime.now()`/`utcnow()` when writing new backend code.
- [ws_manager.py](backend/ws_manager.py) — `ConnectionManager` (the module-level `manager` singleton): tracks `session_id → WebSocket` and `session_id → user_id`, flips `users.is_online` on connect/disconnect, and debounces `user_list` broadcasts (100ms after the last connect/disconnect). Routers push realtime updates through `manager.broadcast(...)` / `manager.send_to_user(...)` after writing to Postgres — the WebSocket layer is not itself a source of truth, it's a fan-out on top of DB writes.
- [background.py](backend/background.py) — long-running `asyncio` tasks started from `main.py`'s lifespan: hourly message cleanup (30-day retention), daily online-status reset + force-disconnect of all sockets, 30s event auto-expiry (flips `events.status` to `expired` when `event_time` has passed and clears importance), daily archival of completed works/events older than 30 days into `work_logs`/`event_logs`, and a 30s WebSocket heartbeat that prunes dead sessions. Each loop swallows its own exceptions and retries rather than crashing the process.
- `routers/` — one FastAPI router per domain (`auth`, `works`, `events`, `messages`, `lunches`, `admin`, `health`), each handling its own DB writes and its own WebSocket broadcast calls after mutating state. There is no service/repository layer — routers talk to asyncpg directly via `get_pool()`.
- [schemas.py](backend/schemas.py) — all Pydantic request/response models in one file.
- Auth is a simple SHA-256 password hash with no sessions/JWT; the client just holds the returned user object (see `frontend_localStorage` behavior below) and passes `user_id` explicitly on relevant requests.

**Frontend layout** — `frontend/src/`:
- `App.jsx` is just a router shell (`/` → `pages/Chat.jsx`, `/admin` → `pages/Admin.jsx`).
- [pages/Chat.jsx](frontend/src/pages/Chat.jsx) is a thin orchestrator (~330 lines): it calls one hook per domain from `hooks/` and renders `Sidebar` + the active view from `pages/Chat/` + `AdminModal`. It owns only the state that's genuinely cross-cutting between views — `activeView`/`sidebarOpen`/`showAdmin`, the admin-create-user form fields, and the editing/comment UI state shared between the Works and Events panels (`editingItem`, `editTitle`, `newComment`, `commentInputVisible` — deliberately one shared slot for both, keyed by id, matching pre-refactor behavior; don't split it per-domain).
- `hooks/` — one hook per data domain, each owning its own state, fetches, and CRUD calls: `useApi` (shared `fetch` wrapper + `loading`/`globalError`), `useAuth`, `useUsers`, `useWorks`, `useEvents`, `useLunches`, `useMessages`. `useWebSocket` holds the single WS connection and dispatches incoming messages to per-domain handler callbacks (`onUserList`, `onNewMessage`, `onWorkNotification`, `onEventNotification`, `onLunchNotification`) supplied by `Chat.jsx` — it always calls the *latest* handlers via an internal ref, so it works correctly regardless of the WS effect's own dependency array (no need for extra `selectedUserRef`/`activeViewRef`-style plumbing when adding new handlers). Mutating hook functions that touch the Works/Events shared editing state (`editWork`, `addWorkComment`, `editEvent`, `addEventComment`) return `false` without side effects on a no-op guard (e.g. empty title) and `true` on success — callers in `pages/Chat/*View.jsx` only clear the shared UI state when the call returns `true`, so a failed/rejected request leaves the edit box open with the draft intact (same as before the split).
- `pages/Chat/` — one presentational component per view (`LoginForm`, `WorksView`, `EventsView`, `LunchesView`, `MessagesView`), each taking hook state/handlers as props. `components/` still holds the smaller reusable pieces used across views (`Sidebar`, `DateTimePicker`, `EmojiPicker`, `AutoResizeInput`, `CardActions`, `FormattedText`, `AdminModal`). Note `AutoResizeInput` is a plain function component (no `forwardRef`), so the `ref={workInputRef}`/`ref={eventInputRef}` passed to it is a pre-existing no-op (harmless React dev-mode warning, not something introduced by the hook/view split).
- The WebSocket message-type contract (`chat_message`, `typing`, `user_list`, `work_notification`, `event_notification`, `lunch_notification`, `ping`) is documented in README.md and must stay in sync between `main.py`'s `/ws` handler + each router's broadcast calls and `useWebSocket`'s switch statement.
- Client persists auth, active tab, selected chat user, and unread-badge counts to `localStorage` (see README's "Поведение при обновлении страницы" section) — sidebar collapse state is intentionally NOT persisted.

**Mobile layout**: below the `md` (768px) Tailwind breakpoint, [Sidebar.jsx](frontend/src/components/Sidebar.jsx) and the content pane in [Chat.jsx](frontend/src/pages/Chat.jsx) never show side by side — only one is visible at a time, switched via the existing `sidebarOpen` state (`hooks/useIsMobile.js` tracks the breakpoint via `window.innerWidth`/`resize`). Selecting a view or a chat user auto-closes the sidebar on mobile only (`if (isMobile) setSidebarOpen(false)` in the `onSelectView`/`onSelectUser` handlers passed to `Sidebar`); the pre-existing `PanelLeftOpen` header button (shown whenever `!sidebarOpen`) doubles as the mobile "back to menu" control — no new UI was added for it. Desktop behavior (280px fixed sidebar, collapse to 0) is unchanged. Keep any new fixed-width popup or panel mindful of this — cap width with `maxWidth: 'calc(100vw - 24px)'`-style constraints (see `DateTimePicker`/`EmojiPicker`) rather than a bare fixed `px` width.

**Timezone**: the entire app operates in Ufa time (UTC+5), not UTC or server-local time — this affects both `now_ufa()` on the backend and any date/time logic added on the frontend.

**Maintenance script**: [backend/cleanup_users.py](backend/cleanup_users.py) wipes all users except `admin` (and their related rows) directly against `DATABASE_URL` — a manual ops tool, not invoked by the app itself.
