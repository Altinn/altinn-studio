"""Git-related API routes"""
import logging
import subprocess
from pathlib import Path
from fastapi import FastAPI, HTTPException

from frontend_api.apps import AppManager

logger = logging.getLogger(__name__)


def register_git_routes(app: FastAPI, app_manager: AppManager):
    """Register all git-related routes"""
    
    @app.get("/api/git/status")
    async def get_git_status():
        """Get Git status for the current app"""
        current_app = app_manager.get_current_app()
        if not current_app:
            raise HTTPException(status_code=400, detail="No app selected")
        
        app_path = Path(current_app['path'])
        git_dir = app_path / ".git"
        
        if not git_dir.exists():
            return {
                "initialized": False,
                "message": "Git repository not initialized"
            }
        
        try:
            # Get status
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=str(app_path),
                capture_output=True,
                text=True,
                check=True
            )
            
            # Parse status
            changes = []
            for line in result.stdout.strip().split('\n'):
                if not line:
                    continue
                status = line[:2]
                file_path = line[3:]
                changes.append({
                    "status": status.strip(),
                    "file": file_path
                })
            
            # Get branch name
            branch_result = subprocess.run(
                ["git", "branch", "--show-current"],
                cwd=str(app_path),
                capture_output=True,
                text=True,
                check=True
            )
            
            return {
                "initialized": True,
                "branch": branch_result.stdout.strip(),
                "changes": changes,
                "has_changes": len(changes) > 0
            }
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Git command failed: {e}")
            raise HTTPException(status_code=500, detail=f"Git command failed: {e.stderr}")
        except Exception as e:
            logger.error(f"Error getting git status: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/api/git/diff")
    async def get_git_diff(file_path: str = None):
        """Get Git diff for a specific file or all changes"""
        current_app = app_manager.get_current_app()
        if not current_app:
            raise HTTPException(status_code=400, detail="No app selected")
        
        app_path = Path(current_app['path'])
        
        try:
            cmd = ["git", "diff"]
            if file_path:
                cmd.append(file_path)
            
            result = subprocess.run(
                cmd,
                cwd=str(app_path),
                capture_output=True,
                text=True,
                check=True
            )
            
            return {
                "diff": result.stdout,
                "file": file_path
            }
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Git diff failed: {e}")
            raise HTTPException(status_code=500, detail=f"Git diff failed: {e.stderr}")
        except Exception as e:
            logger.error(f"Error getting git diff: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/git/commit")
    async def commit_changes(commit_data: dict):
        """Commit changes with a message"""
        current_app = app_manager.get_current_app()
        if not current_app:
            raise HTTPException(status_code=400, detail="No app selected")
        
        message = commit_data.get("message")
        files = commit_data.get("files", [])
        
        if not message:
            raise HTTPException(status_code=400, detail="Commit message is required")
        
        app_path = Path(current_app['path'])
        
        try:
            # Add files
            if files:
                for file in files:
                    subprocess.run(
                        ["git", "add", file],
                        cwd=str(app_path),
                        check=True,
                        capture_output=True
                    )
            else:
                # Add all changes
                subprocess.run(
                    ["git", "add", "-A"],
                    cwd=str(app_path),
                    check=True,
                    capture_output=True
                )
            
            # Commit
            result = subprocess.run(
                ["git", "commit", "-m", message],
                cwd=str(app_path),
                capture_output=True,
                text=True,
                check=True
            )
            
            return {
                "success": True,
                "message": result.stdout
            }
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Git commit failed: {e}")
            raise HTTPException(status_code=500, detail=f"Git commit failed: {e.stderr}")
        except Exception as e:
            logger.error(f"Error committing changes: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/git/init")
    async def init_git_repository():
        """Initialize a Git repository in the current app directory"""
        current_app = app_manager.get_current_app()
        if not current_app:
            raise HTTPException(status_code=400, detail="No app selected")
        
        app_path = Path(current_app['path'])
        git_dir = app_path / ".git"
        
        if git_dir.exists():
            return {
                "success": False,
                "message": "Git repository already initialized"
            }
        
        try:
            subprocess.run(
                ["git", "init"],
                cwd=str(app_path),
                check=True,
                capture_output=True
            )
            
            return {
                "success": True,
                "message": "Git repository initialized"
            }
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Git init failed: {e}")
            raise HTTPException(status_code=500, detail=f"Git init failed: {e.stderr}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
