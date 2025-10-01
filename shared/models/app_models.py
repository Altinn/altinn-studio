"""App-related data models"""
from typing import Optional
from pydantic import BaseModel


class AppInfo(BaseModel):
    """Information about an Altinn app"""
    name: str
    org: str
    repo_name: str
    path: str
    description: Optional[str] = None


class App(BaseModel):
    """App model for the system"""
    name: str
    org: str
    path: str | None = None
    repo: str | None = None
    display_name: str | None = None


class FileInfo(BaseModel):
    """File information model"""
    name: str
    path: str
    type: str
    size: Optional[int] = None
    last_modified: Optional[float] = None