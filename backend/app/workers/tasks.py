import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.workers.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models.models import Task, Notification, TaskStatusEnum, User

logger = logging.getLogger("teamsync.celery")

async def _check_deadlines_async():
    now = datetime.utcnow()
    deadline_threshold_24h = now + timedelta(hours=24)
    deadline_threshold_1h = now + timedelta(hours=1)

    async with AsyncSessionLocal() as session:
        # Fetch non-done tasks with due_date within next 24 hours
        stmt = (
            select(Task)
            .options(selectinload(Task.assignee))
            .where(
                Task.status != TaskStatusEnum.DONE,
                Task.due_date != None,
                Task.due_date >= now,
                Task.due_date <= deadline_threshold_24h
            )
        )
        result = await session.execute(stmt)
        upcoming_tasks = result.scalars().all()

        reminders_sent = 0
        for task in upcoming_tasks:
            if not task.assignee_id:
                continue

            time_left = task.due_date - now
            hours_left = int(time_left.total_seconds() // 3600)
            
            # Create deadline alert notification
            title = f"⏰ Deadline Approaching: {task.title}"
            message = f"Task is due in {hours_left} hour(s) (by {task.due_date.strftime('%Y-%m-%d %H:%M UTC')})."
            
            notif = Notification(
                user_id=task.assignee_id,
                title=title,
                message=message,
                link=f"/projects/{task.project_id}"
            )
            session.add(notif)
            reminders_sent += 1

        await session.commit()
        return reminders_sent

@celery_app.task
def check_upcoming_deadlines():
    """Celery periodic task to evaluate upcoming deadlines and dispatch notifications"""
    logger.info("Executing check_upcoming_deadlines...")
    loop = asyncio.get_event_loop()
    if loop.is_running():
        # Handle cases where an event loop is already open
        import nest_asyncio
        nest_asyncio.apply()
    count = loop.run_until_complete(_check_deadlines_async())
    logger.info(f"Dispatched {count} deadline reminder(s).")
    return {"reminders_dispatched": count}

@celery_app.task
def send_workload_digest():
    """Daily summary digest of active tasks and workload"""
    logger.info("Executing send_workload_digest...")
    return {"status": "digest_processed"}
