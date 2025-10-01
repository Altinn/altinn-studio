"""File management API routes"""
import logging
from typing import List
from pathlib import Path
from fastapi import FastAPI, HTTPException

from shared.models import FileInfo
from frontend_api.apps import AppManager

logger = logging.getLogger(__name__)


def register_file_routes(app: FastAPI, app_manager: AppManager):
    """Register all file-related routes"""
    
    @app.get("/api/files", response_model=List[FileInfo])
    async def get_files(path: str = ""):
        """Get file tree structure for current app"""
        current_app = app_manager.get_current_app()
        print(current_app)
        if not current_app:
            raise HTTPException(status_code=400, detail="No app selected")
        
        app_path = Path(current_app['path'])
        print(app_path)
        target_path = app_path / path if path else app_path
        
        if not target_path.exists():
            raise HTTPException(status_code=404, detail="Path not found")
        
        files = []
        try:
            for item in target_path.iterdir():
                if item.name.startswith('.'):
                    continue
                
                files.append(FileInfo(
                    name=item.name,
                    path=str(item.relative_to(app_path)),
                    type="directory" if item.is_dir() else "file",
                    size=item.stat().st_size if item.is_file() else None,
                    last_modified=item.stat().st_mtime
                ))
            
            # Sort: directories first, then files
            files.sort(key=lambda x: (not x.type == "directory", x.name.lower()))
            print(files)
            return files
            
        except Exception as e:
            logger.error(f"Error reading directory: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/files", response_model=List[FileInfo])
    async def get_files_legacy(path: str = ""):
        """Legacy endpoint for getting file tree"""
        return await get_files(path)
    
    @app.get("/api/files/content")
    async def get_file_content(file_path: str):
        """Get the content of a specific file"""
        current_app = app_manager.get_current_app()
        if not current_app:
            raise HTTPException(status_code=400, detail="No app selected")
        
        app_path = Path(current_app['path'])
        full_path = app_path / file_path
        print(full_path)
        
        if not full_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        if not full_path.is_file():
            raise HTTPException(status_code=400, detail="Path is not a file")
        
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            return {
                "path": file_path,
                "content": content,
                "size": full_path.stat().st_size
            }
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="File is not a text file")
        except Exception as e:
            logger.error(f"Error reading file: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/files/content")
    async def get_file_content_legacy(file_path: str):
        """Legacy endpoint for getting file content"""
        return await get_file_content(file_path)
