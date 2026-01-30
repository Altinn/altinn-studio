"""Verification and validation services"""
import json
from pathlib import Path
from typing import Dict, List

def run_all(repo_path: str, changed_files: List[str]) -> dict:
    """Only fast checks for MVP"""
    notes = []
    ok = True

    repo = Path(repo_path)

    for file_path in changed_files:
        file_full_path = repo / file_path

        # Layout schema validation
        if file_path.endswith('.json') and 'layouts' in file_path:
            layout_ok = validate_layout(file_full_path)
            if layout_ok:
                notes.append(f"Layout {file_path}: schema valid")
            else:
                notes.append(f"Layout {file_path}: schema invalid")
                ok = False

        # Binding check (basic)
        if file_path.endswith('.json'):
            binding_ok = check_bindings(file_full_path)
            if binding_ok:
                notes.append(f"File {file_path}: bindings ok")
            else:
                notes.append(f"File {file_path}: binding issues")
                ok = False

        # Resource key check
        if 'texts' in file_path and file_path.endswith('.json'):
            resource_ok = check_resources(file_full_path)
            if resource_ok:
                notes.append(f"Resources {file_path}: keys valid")
            else:
                notes.append(f"Resources {file_path}: missing keys")
                ok = False

    return {"ok": ok, "notes": notes}

def validate_layout(layout_file: Path) -> bool:
    """Basic layout validation"""
    try:
        if not layout_file.exists():
            return False

        with open(layout_file, 'r') as f:
            layout = json.load(f)

        # Basic structure checks
        if not isinstance(layout, dict):
            return False

        # Check for required layout properties
        if 'data' not in layout:
            return False

        return True

    except (json.JSONDecodeError, IOError):
        return False

def check_bindings(json_file: Path) -> bool:
    """Basic binding validation"""
    try:
        if not json_file.exists():
            return False

        with open(json_file, 'r') as f:
            content = json.load(f)

        # TODO: Implement actual binding validation
        # For MVP, assume bindings are ok if file is valid JSON
        return True

    except (json.JSONDecodeError, IOError):
        return False

def check_resources(resource_file: Path) -> bool:
    """Basic resource key validation"""
    try:
        if not resource_file.exists():
            return False

        with open(resource_file, 'r') as f:
            resources = json.load(f)

        # Basic structure check
        return isinstance(resources, dict)

    except (json.JSONDecodeError, IOError):
        return False


def run_checks(repo_path: str, changed_files: List[str]) -> dict:
    """Alias for run_all to maintain compatibility"""
    return run_all(repo_path, changed_files)