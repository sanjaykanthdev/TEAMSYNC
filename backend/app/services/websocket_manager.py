import json
import logging
from typing import Dict, Set, Any, Optional
from fastapi import WebSocket
from app.core.config import settings

logger = logging.getLogger("teamsync.ws")

class WebSocketManager:
    def __init__(self):
        # Map room_name -> Set[WebSocket]
        self.rooms: Dict[str, Set[WebSocket]] = {}
        # Map WebSocket -> user_id
        self.socket_user: Dict[WebSocket, int] = {}
        # Active users presence set
        self.active_users: Set[int] = set()

    async def connect(self, websocket: WebSocket, room: str, user_id: int):
        await websocket.accept()
        if room not in self.rooms:
            self.rooms[room] = set()
        self.rooms[room].add(websocket)
        self.socket_user[websocket] = user_id
        self.active_users.add(user_id)
        
        # Broadcast presence
        await self.broadcast_to_room(room, {
            "type": "presence_update",
            "user_id": user_id,
            "status": "online"
        }, exclude=websocket)

    def disconnect(self, websocket: WebSocket, room: str):
        user_id = self.socket_user.pop(websocket, None)
        if room in self.rooms and websocket in self.rooms[room]:
            self.rooms[room].remove(websocket)
            if not self.rooms[room]:
                del self.rooms[room]

        # Check if user is still active in any room
        if user_id and user_id not in self.socket_user.values():
            self.active_users.discard(user_id)

    async def broadcast_to_room(self, room: str, message: Dict[str, Any], exclude: Optional[WebSocket] = None):
        if room not in self.rooms:
            return
        
        data = json.dumps(message)
        dead_sockets = set()
        for connection in self.rooms[room]:
            if connection != exclude:
                try:
                    await connection.send_text(data)
                except Exception as e:
                    logger.warning(f"Error sending to websocket: {e}")
                    dead_sockets.add(connection)
        
        for dead in dead_sockets:
            self.disconnect(dead, room)

    async def broadcast_yjs_update(self, doc_id: int, update_data: str, exclude: Optional[WebSocket] = None):
        room = f"doc_{doc_id}"
        await self.broadcast_to_room(room, {
            "type": "yjs_update",
            "doc_id": doc_id,
            "update": update_data
        }, exclude=exclude)

    async def broadcast_task_event(self, project_id: int, event_type: str, task_data: Dict[str, Any]):
        room = f"project_{project_id}"
        await self.broadcast_to_room(room, {
            "type": "task_event",
            "event": event_type,
            "task": task_data
        })

    async def broadcast_chat_message(self, channel_id: int, message_data: Dict[str, Any]):
        room = f"channel_{channel_id}"
        await self.broadcast_to_room(room, {
            "type": "chat_message",
            "message": message_data
        })

ws_manager = WebSocketManager()
