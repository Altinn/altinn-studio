"""App-related API routes"""
import logging
from typing import List
from fastapi import FastAPI, HTTPException
from pathlib import Path

from json.decoder import JSONArray

from shared.models import App, AppInfo
from frontend_api.apps import AppManager, list_local_apps, fetch_app_from_gitea

logger = logging.getLogger(__name__)


def register_app_routes(app: FastAPI, app_manager: AppManager, studio_apps_dir: str, gitea_token: str = None):
    """Register all app-related routes"""
    
    @app.get("/api/apps", response_model=List[AppInfo])
    async def get_apps():
        """Get list of available applications"""
        apps = list_local_apps(studio_apps_dir)
        return apps

    @app.post("/apps/select")
    async def select_app(app: App):
        try:
            # Parse App from JSON string
            repo_owner = app.org
            repo_name = app.name
            # Check if app exists locally, download if needed
            await app_manager._ensure_app_available(repo_owner, repo_name)
            
            app_manager.set_current_app(app)
            
            return app_manager.get_current_app()
            
        except Exception as e:
            logger.error(f"Failed to select app {app}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to select app: {str(e)}")
    
    @app.get("/apps/list")
    async def list_available_apps():
        """Get a list of all available apps in the studio apps directory"""
        try:
            apps = list_local_apps(studio_apps_dir)
            return {"apps": apps, "count": len(apps)}
        except Exception as e:
            logger.error(f"Error listing apps: {e}")
            return {"apps": [], "error": str(e)}
    
    @app.post("/apps/fetch")
    async def fetch_app_endpoint(request: dict):
        """Fetch an app from Altinn Studio/Gitea"""
        try:
            app_name = request.get("app_name")
                    # Parse app name (e.g., "krt/krt-3006a-1" or "krt-krt-3006a-1")
            if '/' in app_name:
                org, repo = app_name.split('/', 1)
            else:
                # Try to parse from directory-style name
                parts = app_name.split('-', 1)
                org = parts[0] if parts else "unknown"
                repo = app_name
            
            if not org or not repo:
                return {"success": False, "error": "app_name is required"}
            
            # Fetch the app
            result = await fetch_app_from_gitea(org, repo, studio_apps_dir, gitea_token)
            
            # If successful, set as current app
            if result.get("success"):
                app_info = result.get("app")
                app = App(
                    name=app_info["name"],
                    org=app_info["org"],
                    repo=app_info["repo_name"],
                    path=app_info["path"],
                    display_name=app_info["display_name"]
                )
                app_manager.set_current_app(app)
            
            return result
            
        except Exception as e:
            logger.error(f"Error fetching app: {e}")
            return {"success": False, "error": str(e)}
    
    @app.get("/api/current-app")
    async def get_current_app():
        """Get information about the currently selected app"""
        current_app = app_manager.get_current_app()
        if current_app:
            return current_app
        else:
            return {"message": "No app currently selected"}
    
    @app.get("/current-app")
    async def get_current_app_legacy():
        """Legacy endpoint for getting current app info"""
        return await get_current_app()
    
    @app.post("/api/reset")
    async def reset_app_selection():
        """Reset the current app selection"""
        app_manager.reset()
        return {"message": "App selection has been reset"}
    
    @app.post("/reset")
    async def reset_app_selection_legacy():
        """Legacy endpoint to reset app selection"""
        return await reset_app_selection()
