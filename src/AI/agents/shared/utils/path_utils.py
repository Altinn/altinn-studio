"""Path utilities"""
from pathlib import Path
from typing import Union


def ensure_directory(path: Union[str, Path]) -> Path:
    """
    Ensure a directory exists, creating it if necessary.

    Args:
        path: Directory path

    Returns:
        Path object of the directory
    """
    path_obj = Path(path)
    path_obj.mkdir(parents=True, exist_ok=True)
    return path_obj


def get_project_root() -> Path:
    """
    Get the project root directory.

    Returns:
        Path to the project root
    """
    # Assume this file is in shared/utils/ so go up 2 levels
    return Path(__file__).parent.parent.parent


def normalize_path(path: Union[str, Path]) -> Path:
    """
    Normalize a path (resolve, absolute).

    Args:
        path: Path to normalize

    Returns:
        Normalized path
    """
    return Path(path).resolve()