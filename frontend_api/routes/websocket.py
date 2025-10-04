"""WebSocket routes for real-time communication"""
import logging
import json
from typing import Dict, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from agents.services.jobs import sink
from agents.services.events import AgentEvent

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.session_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str = None):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        self.active_connections.add(websocket)
        if session_id:
            self.session_connections[session_id] = websocket
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket, session_id: str = None):
        """Remove a WebSocket connection"""
        self.active_connections.discard(websocket)
        if session_id and session_id in self.session_connections:
            del self.session_connections[session_id]
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific connection"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending message: {e}")
    
    async def broadcast(self, message: dict):
        """Broadcast a message to all connections"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        
        # Clean up disconnected connections
        for connection in disconnected:
            self.active_connections.discard(connection)


# Global connection manager
connection_manager = ConnectionManager()


def register_websocket_routes(app: FastAPI):
    """Register WebSocket routes"""
    
    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        """WebSocket endpoint for real-time communication"""
        session_id = None
        
        try:
            await connection_manager.connect(websocket, session_id)
            
            # Send welcome message
            await connection_manager.send_message({
                "type": "connection",
                "status": "connected",
                "message": "WebSocket connection established"
            }, websocket)
            
            # Listen for messages
            while True:
                try:
                    data = await websocket.receive_json()
                    
                    # Handle different message types
                    message_type = data.get("type")
                    
                    if message_type == "ping":
                        # Respond to ping
                        await connection_manager.send_message({
                            "type": "pong",
                            "timestamp": data.get("timestamp")
                        }, websocket)
                    
                    elif message_type == "session":
                        # Register session
                        session_id = data.get("session_id")
                        if session_id:
                            connection_manager.session_connections[session_id] = websocket

                            # Subscribe to agent events for this session
                            async def event_handler(event: AgentEvent):
                                # Forward agent events to WebSocket
                                if session_id == event.session_id:
                                    try:
                                        await websocket.send_json(event.model_dump())
                                    except Exception as e:
                                        logger.error(f"Failed to send agent event: {e}")

                            sink.subscribe(session_id, event_handler)

                            await connection_manager.send_message({
                                "type": "session",
                                "status": "registered",
                                "session_id": session_id
                            }, websocket)
                    
                    else:
                        # Echo back unknown messages for now
                        await connection_manager.send_message({
                            "type": "echo",
                            "data": data
                        }, websocket)
                
                except WebSocketDisconnect:
                    break
                except Exception as e:
                    logger.error(f"Error processing WebSocket message: {e}")
                    break
        
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        
        finally:
            connection_manager.disconnect(websocket, session_id)
    
    @app.get("/api/ws/status")
    async def get_websocket_status():
        """Get WebSocket connection status"""
        return {
            "active_connections": len(connection_manager.active_connections),
            "session_connections": len(connection_manager.session_connections)
        }
