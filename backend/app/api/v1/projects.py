from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models.models import Project, TeamMember, User
from app.schemas.schemas import ProjectCreate, ProjectResponse
from app.api.deps import get_current_user

router = APIRouter()

@router.post("", response_model=ProjectResponse)
async def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify user belongs to the team
    mem_res = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == project_in.team_id,
            TeamMember.user_id == current_user.id
        )
    )
    if not mem_res.scalars().first():
        raise HTTPException(status_code=403, detail="Not authorized for this team")

    project = Project(
        team_id=project_in.team_id,
        name=project_in.name,
        description=project_in.description,
        color=project_in.color or "#3B82F6"
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project

@router.get("/team/{team_id}", response_model=List[ProjectResponse])
async def get_team_projects(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Project).where(Project.team_id == team_id)
    )
    return result.scalars().all()

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
