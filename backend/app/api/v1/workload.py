from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import TeamMember, Task, User, ActivityLog, Notification, TaskStatusEnum
from app.schemas.schemas import WorkloadMemberStats, ActivityLogResponse, NotificationResponse, UserResponse
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/team/{team_id}", response_model=List[WorkloadMemberStats])
async def get_team_workload(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Fetch all members of the team
    result = await db.execute(
        select(TeamMember)
        .options(selectinload(TeamMember.user))
        .where(TeamMember.team_id == team_id)
    )
    members = result.scalars().all()
    
    workload_stats = []
    # Assumed standard weekly capacity per engineer = 40 hours
    WEEKLY_CAPACITY_HOURS = 40.0

    for mem in members:
        u = mem.user
        tasks_res = await db.execute(
            select(Task).where(Task.assignee_id == u.id)
        )
        tasks = tasks_res.scalars().all()

        total_assigned = len(tasks)
        completed = sum(1 for t in tasks if t.status == TaskStatusEnum.DONE)
        in_progress = sum(1 for t in tasks if t.status == TaskStatusEnum.IN_PROGRESS)
        
        # Calculate active estimated hours (non-completed tasks)
        active_hours = sum(t.estimated_hours for t in tasks if t.status != TaskStatusEnum.DONE and t.estimated_hours)
        capacity_pct = min(round((active_hours / WEEKLY_CAPACITY_HOURS) * 100, 1), 150.0)

        workload_stats.append(WorkloadMemberStats(
            user=UserResponse.model_validate(u),
            total_assigned_tasks=total_assigned,
            completed_tasks=completed,
            in_progress_tasks=in_progress,
            total_estimated_hours=round(active_hours, 1),
            capacity_percentage=capacity_pct
        ))

    return workload_stats

@router.get("/team/{team_id}/activity", response_model=List[ActivityLogResponse])
async def get_team_activity(
    team_id: int,
    limit: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.team_id == team_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()

@router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(20)
    )
    return result.scalars().all()

@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    )
    notif = result.scalars().first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    await db.commit()
    return {"message": "Marked as read"}
