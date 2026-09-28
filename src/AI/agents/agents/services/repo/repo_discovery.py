"""
Repository discovery service for dynamic context-aware planning.
Scans repository to discover locales, source of truth, available files, etc.
"""

import re
from pathlib import Path

from agents.schemas.plan_schema import PlanContext
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)

LAYOUT_FILE_GLOB_PATTERN = "*/layouts/*.json"


class RepositoryDiscovery:
    """Discovers repository structure and context for adaptive planning"""

    def __init__(self, repo_path: str):
        self.repo_path = Path(repo_path)

    def discover_context(self) -> PlanContext:
        """Main discovery method - scans repo and builds context"""
        context = PlanContext()

        # Discover available locales from resource files
        context.available_locales = self._discover_locales()

        # Find available layout pages
        context.layout_pages = self._discover_layout_files()

        # Find model files
        context.model_files = self._discover_model_files()

        # Find resource files
        context.resource_files = self._discover_resource_files()

        log.info(
            f"Repository discovery complete: {len(context.available_locales)} locales, "
            f"{len(context.layout_pages)} layouts"
        )

        return context

    def _discover_locales(self) -> list[str]:
        """Discover available locales from resource files"""
        locales = set()
        resource_dir = self.repo_path / "App" / "config" / "texts"

        if not resource_dir.exists():
            log.warning(f"Resource directory not found: {resource_dir}")
            return []

        # Find all resource.<locale>.json files
        resource_pattern = re.compile(r"resource\.([a-z]{2})\.json$")

        for file_path in resource_dir.glob("resource.*.json"):
            match = resource_pattern.match(file_path.name)
            if match:
                locale = match.group(1)
                locales.add(locale)
                log.debug(f"Found locale: {locale}")

        return sorted(locales)

    def _discover_layout_files(self) -> list[str]:
        """Find all available layout files"""
        ui_dir = self.repo_path / "App" / "ui"
        layout_files = []

        for layout_file in ui_dir.glob(LAYOUT_FILE_GLOB_PATTERN):
            relative_path = str(layout_file.relative_to(self.repo_path))
            layout_files.append(relative_path)
            log.debug(f"Found layout: {relative_path}")

        if not layout_files:
            log.warning(f"No layout files found under: {ui_dir}")

        return sorted(layout_files)

    def _discover_model_files(self) -> list[str]:
        """Find all model-related files"""
        models_dir = self.repo_path / "App" / "models"
        model_files = []

        if not models_dir.exists():
            return []

        # Look for various model file types
        model_patterns = ["*.schema.json", "*.xsd", "*.cs"]

        for pattern in model_patterns:
            for model_file in models_dir.glob(pattern):
                relative_path = str(model_file.relative_to(self.repo_path))
                model_files.append(relative_path)

        return sorted(model_files)

    def _discover_resource_files(self) -> list[str]:
        """Find all resource files"""
        resource_dir = self.repo_path / "App" / "config" / "texts"
        resource_files = []

        if not resource_dir.exists():
            return []

        for resource_file in resource_dir.glob("*.json"):
            relative_path = str(resource_file.relative_to(self.repo_path))
            resource_files.append(relative_path)

        return sorted(resource_files)


def discover_repository_context(repo_path: str) -> PlanContext:
    """
    Main entry point for repository discovery.
    Returns discovered context for use in planning and validation.
    """
    discovery = RepositoryDiscovery(repo_path)
    return discovery.discover_context()
