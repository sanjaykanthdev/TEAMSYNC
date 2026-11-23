from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "teamsync_workers",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "check-upcoming-deadlines-every-15-mins": {
            "task": "app.workers.tasks.check_upcoming_deadlines",
            "schedule": 900.0,  # 15 minutes
        },
        "daily-workload-digest-at-midnight": {
            "task": "app.workers.tasks.send_workload_digest",
            "schedule": 86400.0,  # 24 hours
        }
    }
)
