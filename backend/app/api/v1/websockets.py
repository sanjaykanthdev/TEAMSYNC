import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.websocket_manager import ws_manager
from app.core.security import decode_token

router = APIRouter()
logger = logging.getLogger("teamsync.ws_endpoint")

@router.websocket("/ws/{room}")
async def websocket_endpoint(
    websocket: WebSocket,
    room: str,
    token: str = Query(...)
):
    user_id_str = decode_token(token)
    if not user_id_str:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    user_id = int(user_id_str)
    await ws_manager.connect(websocket, room, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                msg_type = payload.get("type")
                
                # Forward Yjs CRDT updates or typing/presence indicators to room members
                if msg_type in ("yjs_sync", "cursor_position", "typing_indicator", "presence_ping"):
                    payload["sender_user_id"] = user_id
                    await ws_manager.broadcast_to_room(room, payload, exclude=websocket)
                else:
                    # Echo broadcast for general custom room events
                    payload["sender_user_id"] = user_id
                    await ws_manager.broadcast_to_room(room, payload, exclude=websocket)
            except json.JSONDecodeError:
                # Direct binary or raw text update
                await ws_manager.broadcast_to_room(room, {
                    "type": "raw_update",
                    "sender_user_id": user_id,
                    "payload": data
                }, exclude=websocket)
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, room)
        await ws_manager.broadcast_to_room(room, {
            "type": "presence_update",
            "user_id": user_id,
            "status": "offline"
        })
    except Exception as e:
        logger.warning(f"WebSocket error in room {room}: {e}")
        ws_manager.disconnect(websocket, room)
