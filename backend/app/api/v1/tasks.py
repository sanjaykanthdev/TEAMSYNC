from typing import List
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import Task, Project, User, ActivityLog, Notification, TaskStatusEnum
from app.schemas.schemas import TaskCreate, TaskUpdate, TaskResponse
from app.api.deps import get_current_user
from app.services.websocket_manager import ws_manager

router = APIRouter()

@router.post("", response_model=TaskResponse)
async def create_task(
    task_in: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    project_res = await db.execute(select(Project).where(Project.id == task_in.project_id))
    project = project_res.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    task = Task(
        project_id=task_in.project_id,
        title=task_in.title,
        description=task_in.description,
        status=task_in.status,
        priority=task_in.priority,
        assignee_id=task_in.assignee_id,
        creator_id=current_user.id,
        due_date=task_in.due_date,
        estimated_hours=task_in.estimated_hours or 0.0,
        position=task_in.position or 0
    )
    db.add(task)
    await db.flush()

    # Log activity
    activity = ActivityLog(
        team_id=project.team_id,
        user_id=current_user.id,
        action_type="task_created",
        entity_type="task",
        entity_id=task.id,
        metadata_json=json.dumps({"title": task.title, "project_id": project.id})
    )
    db.add(activity)

    # Notify assignee if assigned to someone else
    if task.assignee_id and task.assignee_id != current_user.id:
        notif = Notification(
            user_id=task.assignee_id,
            title="New Task Assigned",
            message=f"{current_user.full_name} assigned '{task.title}' to you.",
            link=f"/projects/{project.id}"
        )
        db.add(notif)

    await db.commit()

    # Load with assignee
    result = await db.execute(
        select(Task).options(selectinload(Task.assignee)).where(Task.id == task.id)
    )
    created_task = result.scalars().first()

    # Broadcast real-time task creation
    task_dict = {
        "id": created_task.id,
        "project_id": created_task.project_id,
        "title": created_task.title,
        "status": created_task.status.value,
        "priority": created_task.priority.value,
        "assignee_id": created_task.assignee_id,
        "due_date": created_task.due_date.isoformat() if created_task.due_date else None,
        "estimated_hours": created_task.estimated_hours,
        "position": created_task.position
    }
    await ws_manager.broadcast_task_event(created_task.project_id, "created", task_dict)

    return created_task

@router.get("/project/{project_id}", response_model=List[TaskResponse])
async def get_project_tasks(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Task)
        .options(selectinload(Task.assignee))
        .where(Task.project_id == project_id)
        .order_by(Task.position.asc(), Task.created_at.desc())
    )
    return result.scalars().all()

@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Task).options(selectinload(Task.project)).where(Task.id == task_id)
    )
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_assignee_id = task.assignee_id
    old_status = task.status

    update_data = task_update.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(task, field, val)
    task.updated_at = datetime.utcnow()

    # Live task assignment notification
    if task.assignee_id and task.assignee_id != old_assignee_id and task.assignee_id != current_user.id:
        notif = Notification(
            user_id=task.assignee_id,
            title="Task Assigned to You",
            message=f"{current_user.full_name} assigned '{task.title}' to you.",
            link=f"/projects/{task.project_id}"
        )
        db.add(notif)

    # Activity log
    activity = ActivityLog(
        team_id=task.project.team_id,
        user_id=current_user.id,
        action_type="task_updated" if old_status == task.status else "task_moved",
        entity_type="task",
        entity_id=task.id,
        metadata_json=json.dumps({
            "title": task.title,
            "status": task.status.value,
            "assignee_id": task.assignee_id
        })
    )
    db.add(activity)

    await db.commit()

    res = await db.execute(
        select(Task).options(selectinload(Task.assignee)).where(Task.id == task.id)
    )
    updated_task = res.scalars().first()

    # Broadcast update event to all project members
    task_dict = {
        "id": updated_task.id,
        "project_id": updated_task.project_id,
        "title": updated_task.title,
        "status": updated_task.status.value,
        "priority": updated_task.priority.value,
        "assignee_id": updated_task.assignee_id,
        "due_date": updated_task.due_date.isoformat() if updated_task.due_date else None,
        "estimated_hours": updated_task.estimated_hours,
        "position": updated_task.position
    }
    await ws_manager.broadcast_task_event(updated_task.project_id, "updated", task_dict)

    return updated_task

@router.delete("/{task_id}")
async def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    project_id = task.project_id
    await db.delete(task)
    await db.commit()

    await ws_manager.broadcast_task_event(project_id, "deleted", {"id": task_id, "project_id": project_id})
    return {"message": "Task deleted successfully"}
