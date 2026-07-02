"""API routes module"""
from .websocket import register_websocket_routes
from .agent import router as agent_router
from .feedback import router as feedback_router
from .metrics import router as metrics_router

__all__ = ['register_websocket_routes', 'agent_router', 'feedback_router', 'metrics_router']
