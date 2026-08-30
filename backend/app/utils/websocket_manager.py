from typing import Dict, List, Optional
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # Maps user_id (int) -> List of active WebSocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        uid = int(user_id)
        if uid not in self.active_connections:
            self.active_connections[uid] = []
        self.active_connections[uid].append(websocket)

    def disconnect(self, user_id: int, websocket: Optional[WebSocket] = None):
        uid = int(user_id)
        if uid in self.active_connections:
            if websocket and websocket in self.active_connections[uid]:
                self.active_connections[uid].remove(websocket)
            # Agar websocket pass na kiya ho ya list empty ho jaye toh remove karein
            if not websocket or len(self.active_connections[uid]) == 0:
                self.active_connections.pop(uid, None)

    def is_online(self, user_id: int) -> bool:
        uid = int(user_id)
        return uid in self.active_connections and len(self.active_connections[uid]) > 0

    def get_online_users(self) -> List[int]:
        return [uid for uid, conns in self.active_connections.items() if len(conns) > 0]

    async def send_personal_message(self, message: dict, user_id: int):
        """Specific user ke sabhi open tabs/devices par message bhejta hai"""
        uid = int(user_id)
        if uid in self.active_connections:
            dead_sockets = []
            for ws in list(self.active_connections[uid]):
                try:
                    await ws.send_json(message)
                except Exception:
                    dead_sockets.append(ws)

            # Dead / closed sockets ko automatically clean karein
            for ds in dead_sockets:
                self.disconnect(uid, ds)

    async def broadcast(self, message: dict):
        """Sabhi online users ko message broadcast karta hai"""
        for user_id in list(self.active_connections.keys()):
            await self.send_personal_message(message, user_id)


manager = ConnectionManager()