import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import init_db

@pytest.mark.asyncio
async def test_full_flow():
    # Initialize DB
    await init_db()
    
    unique_id = uuid.uuid4().hex[:6]
    test_email = f"sarah.{unique_id}@teamsync.io"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Health check
        res = await ac.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

        # 2. Register User 1
        reg_res = await ac.post("/api/v1/auth/register", json={
            "email": test_email,
            "full_name": "Sarah Connor",
            "password": "Password123!"
        })
        assert reg_res.status_code == 200
        token_data = reg_res.json()
        token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Create Team
        team_res = await ac.post("/api/v1/teams", json={
            "name": "Alpha Engineering",
            "description": "Core product team"
        }, headers=headers)
        assert team_res.status_code == 200
        team = team_res.json()
        team_id = team["id"]
        assert team["name"] == "Alpha Engineering"

        # 4. Create Project
        proj_res = await ac.post("/api/v1/projects", json={
            "team_id": team_id,
            "name": "Sprint 42 - Realtime Engine",
            "description": "CRDT & WebSockets"
        }, headers=headers)
        assert proj_res.status_code == 200
        project = proj_res.json()
        project_id = project["id"]

        # 5. Create Task
        task_res = await ac.post("/api/v1/tasks", json={
            "project_id": project_id,
            "title": "Implement Yjs WebSocket Provider",
            "description": "Hook up document real-time sync",
            "status": "todo",
            "priority": "high",
            "estimated_hours": 8.0
        }, headers=headers)
        assert task_res.status_code == 200
        task = task_res.json()
        assert task["title"] == "Implement Yjs WebSocket Provider"
        task_id = task["id"]

        # 6. Update Task Status (Kanban shift)
        update_res = await ac.patch(f"/api/v1/tasks/{task_id}", json={
            "status": "in_progress"
        }, headers=headers)
        assert update_res.status_code == 200
        assert update_res.json()["status"] == "in_progress"

        # 7. Create Channel & Post Message
        chan_res = await ac.post("/api/v1/chat/channels", json={
            "team_id": team_id,
            "name": "frontend-dev",
            "topic": "Frontend discussions"
        }, headers=headers)
        assert chan_res.status_code == 200
        channel_id = chan_res.json()["id"]

        msg_res = await ac.post(f"/api/v1/chat/channels/{channel_id}/messages", json={
            "content": "Sprint kickoff meeting in 10 minutes!"
        }, headers=headers)
        assert msg_res.status_code == 200
        assert msg_res.json()["content"] == "Sprint kickoff meeting in 10 minutes!"

        # 8. Create Document & Snapshot
        doc_res = await ac.post("/api/v1/docs", json={
            "team_id": team_id,
            "project_id": project_id,
            "title": "Architecture Blueprint",
            "content": "<h1>System Architecture</h1><p>Real-time sync details...</p>"
        }, headers=headers)
        assert doc_res.status_code == 200
        doc_id = doc_res.json()["id"]

        snap_res = await ac.post(f"/api/v1/docs/{doc_id}/snapshot", json={
            "snapshot_data": "base64_encoded_yjs_binary_snapshot"
        }, headers=headers)
        assert snap_res.status_code == 200

        # 9. Workload & Activity check
        workload_res = await ac.get(f"/api/v1/workload/team/{team_id}", headers=headers)
        assert workload_res.status_code == 200
        workload = workload_res.json()
        assert len(workload) >= 1

        activity_res = await ac.get(f"/api/v1/workload/team/{team_id}/activity", headers=headers)
        assert activity_res.status_code == 200
        activities = activity_res.json()
        assert len(activities) > 0
