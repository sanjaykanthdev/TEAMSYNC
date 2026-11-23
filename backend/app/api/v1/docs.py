from typing import List
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models.models import Document, DocumentSnapshot, User, ActivityLog
from app.schemas.schemas import DocumentCreate, DocumentUpdate, DocumentResponse
from app.api.deps import get_current_user
from app.services.websocket_manager import ws_manager

router = APIRouter()

@router.post("", response_model=DocumentResponse)
async def create_document(
    doc_in: DocumentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    doc = Document(
        team_id=doc_in.team_id,
        project_id=doc_in.project_id,
        created_by_id=current_user.id,
        title=doc_in.title,
        content=doc_in.content or ""
    )
    db.add(doc)
    await db.flush()

    # Log activity
    activity = ActivityLog(
        team_id=doc.team_id,
        user_id=current_user.id,
        action_type="doc_created",
        entity_type="document",
        entity_id=doc.id,
        metadata_json=json.dumps({"title": doc.title})
    )
    db.add(activity)

    await db.commit()
    await db.refresh(doc)
    return doc

@router.get("/team/{team_id}", response_model=List[DocumentResponse])
async def get_team_documents(
    team_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Document).where(Document.team_id == team_id).order_by(Document.updated_at.desc())
    )
    return result.scalars().all()

@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.patch("/{doc_id}", response_model=DocumentResponse)
async def update_document(
    doc_id: int,
    doc_update: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc_update.title is not None:
        doc.title = doc_update.title
    if doc_update.content is not None:
        doc.content = doc_update.content
        doc.version += 1
    doc.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(doc)
    return doc

@router.post("/{doc_id}/snapshot")
async def save_snapshot(
    doc_id: int,
    snapshot_data: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    snapshot = DocumentSnapshot(
        document_id=doc_id,
        snapshot_data=snapshot_data
    )
    db.add(snapshot)
    await db.commit()
    return {"status": "snapshot_saved", "document_id": doc_id}

@router.get("/{doc_id}/snapshot")
async def get_latest_snapshot(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(DocumentSnapshot)
        .where(DocumentSnapshot.document_id == doc_id)
        .order_by(DocumentSnapshot.created_at.desc())
    )
    snapshot = result.scalars().first()
    if not snapshot:
        return {"snapshot_data": None}
    return {"snapshot_data": snapshot.snapshot_data, "created_at": snapshot.created_at}
