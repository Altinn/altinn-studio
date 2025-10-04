"""API routes module"""
from .apps import register_app_routes
from .files import register_file_routes
from .git import register_git_routes
from .preview import register_preview_routes
from .websocket import register_websocket_routes
from .agent import router as agent_router

__all__ = ['register_app_routes', 'register_file_routes', 'register_git_routes', 'register_preview_routes', 'register_websocket_routes', 'agent_router']