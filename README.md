# TEAMSYNC

> **One unified collaborative workspace with real-time synchronization.**

TEAMSYNC eliminates context-switching for remote teams by unifying **Tasks & Kanban**, **Real-time Collaborative Documents**, **Project Chat Channels**, **Timeline & Gantt Views**, and **Team Workload Visualization** into a single, cohesive application.

---

## 🌟 Unique Features

- **Real-time Collaborative Document Editing**: Yjs CRDT-based synchronization with multi-cursor presence awareness, automatic snapshots, and seamless offline IndexedDB caching.
- **Team Chat & Project Channels**: WebSocket-powered live channels (#general, #backend, etc.) with real-time streaming and presence status.
- **Kanban & Timeline Views**: Drag-and-drop task progression (To Do, In Progress, Review, Completed) with live WebSocket state replication across connected peers.
- **Live Task Assignment**: Instant collaborator notification and avatar updates when tasks are reassigned.
- **Workload Visualization**: Real-time team capacity tracking (0-40+ hrs/week) to balance workloads and identify bottlenecks.
- **Automated Deadline Reminders**: Celery background workers and Celery Beat periodically alerting assignees of approaching deadlines (24h, 1h).
- **Offline Editing with Synchronization**: Built-in IndexedDB mutation queue that buffers edits offline and automatically replays and merges changes upon reconnecting.

---

## 🏗️ Architecture

```text
React + TypeScript (Vite + Tailwind CSS)
                 │
           FastAPI (ASGI)
                 │
   ─────────────────────────────
   │             │             │
 Tasks         Chat          Docs
   │             │             │
   ─────────────────────────────
                 │
         PostgreSQL + Redis
                 │
            WebSockets
                 │
        Background Workers (Celery)
```

---

## 🚀 Quick Start (Local Development)

### 1. Start Backend

```bash
cd backend

# (Optional) activate your virtual environment
# python -m venv venv
# source venv/bin/activate  # on Windows: .\venv\Scripts\activate

pip install -r requirements.txt greenlet email-validator

# Run the FastAPI server (defaults to local SQLite for zero-setup development)
uvicorn app.main:app --reload --port 8000
```
- Interactive API Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### 2. Start Frontend

```bash
cd frontend

npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🐳 Docker Deployment

To spin up the entire production stack (PostgreSQL, Redis, FastAPI, Celery Worker, Celery Beat, and React Nginx frontend):

```bash
docker-compose up --build
```

---

## 🧪 Running Tests

```bash
cd backend
python -m pytest tests/test_api.py -v
```
