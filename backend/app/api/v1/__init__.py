from fastapi import APIRouter
from app.api.v1 import auth, teams, projects, tasks, chat, docs, workload, websockets

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(teams.router, prefix="/teams", tags=["Teams"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])
api_router.include_router(docs.router, prefix="/docs", tags=["Documents"])
api_router.include_router(workload.router, prefix="/workload", tags=["Workload & Analytics"])
