from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import Team, TeamMember, User, RoleEnum, Channel
from app.schemas.schemas import TeamCreate, TeamResponse, TeamMemberResponse
from app.api.deps import get_current_user

router = APIRouter()

@router.post("", response_model=TeamResponse)
async def create_team(
    team_in: TeamCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    team = Team(
        name=team_in.name,
        description=team_in.description,
        owner_id=current_user.id
    )
    db.add(team)
    await db.flush()

    # Add owner as team member
    member = TeamMember(
        team_id=team.id,
        user_id=current_user.id,
        role=RoleEnum.OWNER
    )
    db.add(member)

    # Create default #general channel
    channel = Channel(
        team_id=team.id,
        name="general",
        topic="General team discussions",
        is_private=False
    )
    db.add(channel)

    await db.commit()
    
    # Reload with members and user relation
    result = await db.execute(
        select(Team)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
        .where(Team.id == team.id)
    )
    return result.scalars().first()

@router.get("", response_model=List[TeamResponse])
async def get_my_teams(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Team)
        .join(TeamMember, Team.id == TeamMember.team_id)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
        .where(TeamMember.user_id == current_user.id)
    )
    return result.scalars().all()

@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Team)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
        .where(Team.id == team_id)
    )
    team = result.scalars().first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@router.post("/{team_id}/members", response_model=TeamMemberResponse)
async def add_team_member(
    team_id: int,
    email: str,
    role: RoleEnum = RoleEnum.MEMBER,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Find user by email
    user_res = await db.execute(select(User).where(User.email == email))
    user_to_add = user_res.scalars().first()
    if not user_to_add:
        raise HTTPException(status_code=404, detail="User with this email not found")

    # Check if already member
    mem_res = await db.execute(
        select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user_to_add.id)
    )
    if mem_res.scalars().first():
        raise HTTPException(status_code=400, detail="User is already a member of this team")

    new_member = TeamMember(
        team_id=team_id,
        user_id=user_to_add.id,
        role=role
    )
    db.add(new_member)
    await db.commit()
    await db.refresh(new_member)

    # Load user relation
    res = await db.execute(
        select(TeamMember).options(selectinload(TeamMember.user)).where(TeamMember.id == new_member.id)
    )
    return res.scalars().first()
