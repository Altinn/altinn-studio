"""API routes module"""
from .websocket import register_websocket_routes
from .agent import router as agent_router
from .observability import router as observability_router

__all__ = ['register_websocket_routes', 'agent_router', 'observability_router']
