"""The starting state a benchmark item runs against."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

APP_TEMPLATE_VERSIONS = ("v8", "v9")
DEFAULT_APP_VERSION = "v8"

_REPO_SRC = Path(__file__).resolve().parents[3]
FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


def template_app_dir(app_version: str = DEFAULT_APP_VERSION) -> Path:
    """The `App` directory of the template for one app version."""
    if app_version not in APP_TEMPLATE_VERSIONS:
        raise ValueError(
            f"unknown app version {app_version!r}, expected one of {APP_TEMPLATE_VERSIONS}"
        )
    path = _REPO_SRC / "App" / "template" / app_version / "src" / "App"
    if not path.is_dir():
        raise FileNotFoundError(f"app template not found at {path}")
    return path


def fixture_dir(name: str) -> Path:
    path = FIXTURES_DIR / name
    if not path.is_dir():
        raise FileNotFoundError(f"fixture {name!r} not found at {path}")
    return path


def _tracked_files(directory: Path) -> list[Path]:
    """The template as git has it."""
    listing = subprocess.run(
        ["git", "ls-files", "-z", "--", "."],
        cwd=directory,
        capture_output=True,
        text=True,
        check=True,
    )
    return [Path(name) for name in listing.stdout.split("\0") if name]


def materialize_base_app(
    destination: Path,
    app_version: str = DEFAULT_APP_VERSION,
    fixture: str | None = None,
) -> Path:
    """Write the starting app into `destination/App` and return that path."""
    template = template_app_dir(app_version)
    app_dir = destination / "App"
    for relative in _tracked_files(template):
        target = app_dir / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(template / relative, target)
    if fixture:
        shutil.copytree(fixture_dir(fixture), app_dir, dirs_exist_ok=True)
    return app_dir
