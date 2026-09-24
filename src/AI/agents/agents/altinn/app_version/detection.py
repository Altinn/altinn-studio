"""Which Altinn app version a repository targets, read from its project file.

Follows Designer's `AppVersionService.IsV9App`: the major version of the
`Altinn.App.Api` package reference decides.
"""

from __future__ import annotations

import logging
import re
import xml.etree.ElementTree as ElementTree
from pathlib import Path

from .profile import AppVersionProfile
from .v8 import V8_PROFILE

log = logging.getLogger(__name__)

APP_LIBRARY_PACKAGE_NAMES = ("Altinn.App.Api", "Altinn.App.Api.Experimental")
DEFAULT_MAJOR_VERSION = 8
PROJECT_FILE_GLOB_PATTERN = "*.csproj"
_LEADING_MAJOR_VERSION = re.compile(r"[\[(]?\s*(\d+)")


def detect_app_version_profile(repo_path: str) -> AppVersionProfile:
    return get_app_version_profile(detect_app_major_version(repo_path))


def get_app_version_profile(major_version: int) -> AppVersionProfile:
    return V8_PROFILE


def detect_app_major_version(repo_path: str) -> int:
    for project_file in sorted(Path(repo_path).rglob(PROJECT_FILE_GLOB_PATTERN)):
        major_version = _read_app_library_major_version(project_file)
        if major_version is not None:
            return major_version
    return DEFAULT_MAJOR_VERSION


def _read_app_library_major_version(project_file: Path) -> int | None:
    for package_reference in _find_app_library_references(project_file):
        major_version = _parse_major_version(package_reference.get("Version", ""))
        if major_version is not None:
            return major_version
    return None


def _find_app_library_references(project_file: Path) -> list[ElementTree.Element]:
    try:
        root = ElementTree.parse(project_file).getroot()
    except ElementTree.ParseError:
        log.warning("Skipping unreadable project file %s", project_file)
        return []
    return [
        package_reference
        for package_reference in root.iter("PackageReference")
        if package_reference.get("Include") in APP_LIBRARY_PACKAGE_NAMES
    ]


def _parse_major_version(version: str) -> int | None:
    """Reads `8.7.0`, `9.0.0-preview.4`, `[9.0.0]`, `[8.0,9.0)` and `9.*` alike."""
    match = _LEADING_MAJOR_VERSION.match(version.strip())
    return int(match.group(1)) if match else None
