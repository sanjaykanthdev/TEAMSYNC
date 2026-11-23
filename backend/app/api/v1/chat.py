from typing import List
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import Channel, Message, User, ActivityLog
from app.schemas.schemas import ChannelCreate, ChannelResponse, MessageCreate, MessageResponse
from app.api.deps import get_current_user
from app.services.websocket_manager import ws_manager

router = APIRouter()

@router.post("/channels", response_model=ChannelResponse)
async def create_channel(
    channel_in: ChannelCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    channel = Channel(
        team_id=channel_in.team_id,
        name=channel_in.name.lower().replace(" ", "-"),
        topic=channel_in.topic,
        is_private=channel_in.is_private or False
    )
    db.add(channel)
    await db.commit()
    await db.refresh(channel)
    return channel

@router.get("/channels/team/{team_id}", response_model=List[ChannelResponse])
async def get_team_channels(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Channel).where(Channel.team_id == team_id))
    return result.scalars().all()

@router.get("/channels/{channel_id}/messages", response_model=List[MessageResponse])
async def get_channel_messages(
    channel_id: int,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Message)
        .options(selectinload(Message.sender))
        .where(Message.channel_id == channel_id)
        .order_by(Message.created_at.asc())
        .limit(limit)
    )
    return result.scalars().all()

@router.post("/channels/{channel_id}/messages", response_model=MessageResponse)
async def send_message(
    channel_id: int,
    msg_in: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    channel_res = await db.execute(select(Channel).where(Channel.id == channel_id))
    channel = channel_res.scalars().first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    message = Message(
        channel_id=channel_id,
        sender_id=current_user.id,
        content=msg_in.content,
        parent_id=msg_in.parent_id
    )
    db.add(message)
    await db.flush()

    # Log activity
    activity = ActivityLog(
        team_id=channel.team_id,
        user_id=current_user.id,
        action_type="message_sent",
        entity_type="channel",
        entity_id=channel_id,
        metadata_json=json.dumps({"snippet": msg_in.content[:50]})
    )
    db.add(activity)
    await db.commit()

    # Reload with sender
    result = await db.execute(
        select(Message).options(selectinload(Message.sender)).where(Message.id == message.id)
    )
    created_message = result.scalars().first()

    # Broadcast to room
    msg_dict = {
        "id": created_message.id,
        "channel_id": created_message.channel_id,
        "sender_id": created_message.sender_id,
        "content": created_message.content,
        "parent_id": created_message.parent_id,
        "created_at": created_message.created_at.isoformat(),
        "sender": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "avatar_url": current_user.avatar_url
        }
    }
    await ws_manager.broadcast_chat_message(channel_id, msg_dict)

    return created_message
