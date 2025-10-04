"""Repository scanning and analysis"""
import os
from pathlib import Path

def scan(repo_path: str) -> dict:
    """Return facts like layout files, data model paths, resource files"""
    repo = Path(repo_path)

    # Scan for Altinn app structure
    layouts = []
    models = []
    resources = []

    # Find layouts - check both old and new Altinn structure
    layout_dirs = [
        repo / "App" / "ui" / "layouts",           # Old structure
        repo / "App" / "ui" / "form" / "layouts",  # New structure (layout sets)
    ]
    
    for layout_dir in layout_dirs:
        if layout_dir.exists():
            layouts.extend([str(f.relative_to(repo)) for f in layout_dir.glob("*.json")])

    # Find data models
    model_dir = repo / "App" / "models"
    if model_dir.exists():
        models = [str(f.relative_to(repo)) for f in model_dir.glob("*.json")]

    # Find resources
    resource_dir = repo / "App" / "config" / "texts"
    if resource_dir.exists():
        resources = [str(f.relative_to(repo)) for f in resource_dir.glob("*.json")]

    return {
        "layouts": layouts,
        "models": models,
        "resources": resources,
        "app_type": "altinn" if (repo / "App").exists() else "unknown"
    }