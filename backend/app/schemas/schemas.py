from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr
from app.models.models import RoleEnum, TaskStatusEnum, TaskPriorityEnum

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Team schemas
class TeamBase(BaseModel):
    name: str
    description: Optional[str] = None

class TeamCreate(TeamBase):
    pass

class TeamMemberResponse(BaseModel):
    id: int
    user_id: int
    role: RoleEnum
    user: UserResponse
    class Config:
        from_attributes = True

class TeamResponse(TeamBase):
    id: int
    owner_id: int
    created_at: datetime
    members: List[TeamMemberResponse] = []
    class Config:
        from_attributes = True

# Project schemas
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#3B82F6"

class ProjectCreate(ProjectBase):
    team_id: int

class ProjectResponse(ProjectBase):
    id: int
    team_id: int
    created_at: datetime
    class Config:
        from_attributes = True

# Task schemas
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: TaskStatusEnum = TaskStatusEnum.TODO
    priority: TaskPriorityEnum = TaskPriorityEnum.MEDIUM
    assignee_id: Optional[int] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = 0.0
    position: Optional[int] = 0

class TaskCreate(TaskBase):
    project_id: int

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatusEnum] = None
    priority: Optional[TaskPriorityEnum] = None
    assignee_id: Optional[int] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    position: Optional[int] = None

class TaskResponse(TaskBase):
    id: int
    project_id: int
    creator_id: int
    created_at: datetime
    updated_at: datetime
    assignee: Optional[UserResponse] = None
    class Config:
        from_attributes = True

# Channel & Chat schemas
class ChannelBase(BaseModel):
    name: str
    topic: Optional[str] = None
    is_private: Optional[bool] = False

class ChannelCreate(ChannelBase):
    team_id: int

class ChannelResponse(ChannelBase):
    id: int
    team_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    content: str
    parent_id: Optional[int] = None

class MessageResponse(BaseModel):
    id: int
    channel_id: int
    sender_id: int
    content: str
    parent_id: Optional[int] = None
    created_at: datetime
    sender: UserResponse
    class Config:
        from_attributes = True

# Document schemas
class DocumentBase(BaseModel):
    title: str
    content: Optional[str] = ""

class DocumentCreate(DocumentBase):
    team_id: int
    project_id: Optional[int] = None

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class DocumentResponse(DocumentBase):
    id: int
    team_id: int
    project_id: Optional[int] = None
    created_by_id: int
    version: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

# Activity & Notification schemas
class ActivityLogResponse(BaseModel):
    id: int
    team_id: int
    user_id: int
    action_type: str
    entity_type: str
    entity_id: int
    metadata_json: str
    created_at: datetime
    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime
    class Config:
        from_attributes = True

# Workload schema
class WorkloadMemberStats(BaseModel):
    user: UserResponse
    total_assigned_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    total_estimated_hours: float
    capacity_percentage: float
