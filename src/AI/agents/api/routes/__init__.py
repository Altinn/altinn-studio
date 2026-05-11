"""API routes module"""
from .websocket import register_websocket_routes
from .agent import router as agent_router
from .metrics import router as metrics_router

__all__ = ['register_websocket_routes', 'agent_router', 'metrics_router']