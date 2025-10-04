"""Git-related API routes"""
import logging
import subprocess
from pathlib import Path
from typing import Optional, List
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException

from frontend_api.apps import AppManager
from shared.config.base_config import get_config

logger = logging.getLogger(__name__)
config = get_config()


class CommitRequest(BaseModel):
    message: str
    files: Optional[List[str]] = None


class CloneRequest(BaseModel):
    repo_owner: str
    repo_name: str
    target_dir: Optional[str] = None


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
            
            # Parse status - git status --porcelain format:
            # XY PATH - where X is staged status, Y is unstaged status
            # ' M' = modified unstaged, 'M ' = modified staged, '??' = untracked, etc.
            changes = []
            for line in result.stdout.strip().split('\n'):
                if not line:
                    continue
                status_code = line[:2]
                file_path = line[3:]
                
                # Parse git status codes to frontend format
                staged = status_code[0] != ' ' and status_code[0] != '?'
                
                if '??' in status_code:
                    status = 'untracked'
                elif 'D' in status_code:
                    status = 'deleted'
                elif 'A' in status_code:
                    status = 'added'
                elif 'M' in status_code:
                    status = 'modified'
                else:
                    status = 'modified'  # Default
                
                changes.append({
                    "file": file_path,
                    "status": status,
                    "staged": staged
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
    async def commit_changes(commit_data: CommitRequest):
        """Commit changes with a message"""
        current_app = app_manager.get_current_app()
        if not current_app:
            raise HTTPException(status_code=400, detail="No app selected")
        
        message = commit_data.message
        files = commit_data.files or []
        
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
    
    @app.get("/api/git/log")
    async def get_git_log(limit: int = 10):
        """Get git commit history"""
        current_app = app_manager.get_current_app()
        if not current_app:
            raise HTTPException(status_code=400, detail="No app selected")
        
        app_path = Path(current_app['path'])
        
        try:
            # Get commit log with format: hash|author|email|date|message
            result = subprocess.run(
                ["git", "log", f"-{limit}", "--pretty=format:%H|%an|%ae|%ai|%s"],
                cwd=str(app_path),
                capture_output=True,
                text=True,
                check=True
            )
            
            commits = []
            for line in result.stdout.strip().split('\n'):
                if not line:
                    continue
                parts = line.split('|', 4)
                if len(parts) == 5:
                    commits.append({
                        "hash": parts[0],
                        "author": parts[1],
                        "email": parts[2],
                        "date": parts[3],
                        "message": parts[4]
                    })
            
            return {
                "commits": commits
            }
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Git log failed: {e}")
            raise HTTPException(status_code=500, detail=f"Git log failed: {e.stderr}")
        except Exception as e:
            logger.error(f"Error getting git log: {e}")
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
    
    @app.post("/api/git/clone")
    async def clone_gitea_repository(clone_data: CloneRequest):
        """Clone a repository from Gitea"""
        try:
            repo_owner = clone_data.repo_owner
            repo_name = clone_data.repo_name
            target_dir = clone_data.target_dir
            
            # Determine target directory
            if not target_dir:
                # Use configured apps path
                apps_path = Path(config.ALTINN_STUDIO_APPS_PATH)
                target_dir = apps_path / f"{repo_owner}-{repo_name}"
            else:
                target_dir = Path(target_dir)
            
            # Check if directory already exists
            if target_dir.exists():
                raise HTTPException(
                    status_code=400,
                    detail=f"Directory {target_dir} already exists"
                )
            
            # Build clone URL
            gitea_token = config.GITEA_API_TOKEN
            if not gitea_token:
                raise HTTPException(
                    status_code=500,
                    detail="GITEA_API_TOKEN not configured"
                )
            
            # Extract base URL from GITEA_URL (remove /api/v1 if present)
            gitea_base = config.GITEA_URL.replace('/repos/api/v1', '').replace('/api/v1', '')
            
            # Build authenticated clone URL
            # Format: https://token@altinn.studio/repos/owner/repo.git
            clone_url = f"{gitea_base}/{repo_owner}/{repo_name}.git"
            
            # Clone the repository
            logger.info(f"Cloning {clone_url} to {target_dir}")
            
            subprocess.run(
                ["git", "clone", clone_url, str(target_dir)],
                capture_output=True,
                text=True,
                check=True,
                env={
                    **subprocess.os.environ,
                    "GIT_TERMINAL_PROMPT": "0",  # Disable interactive prompts
                }
            )
            
            # Set the current app to the cloned repo
            app_manager.set_current_app(str(target_dir))
            
            return {
                "success": True,
                "path": str(target_dir),
                "message": f"Successfully cloned {repo_owner}/{repo_name}"
            }
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Git clone failed: {e.stderr}")
            raise HTTPException(
                status_code=500,
                detail=f"Git clone failed: {e.stderr}"
            )
        except Exception as e:
            logger.error(f"Error cloning repository: {e}")
            raise HTTPException(status_code=500, detail=str(e))
