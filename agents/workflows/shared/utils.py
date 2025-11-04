"""Shared workflow utilities for cleanup and repository scanning."""

from __future__ import annotations

import glob
import os
import subprocess
from pathlib import Path
from typing import Dict, List

import json

from shared.utils.logging_utils import get_logger
from agents.services.git import git_ops

log = get_logger(__name__)


def cleanup_feature_branch(repo_path: str, *, base_branch: str = "master") -> None:
    """Clean up feature branch when workflow fails."""

    try:
        result = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            check=True,
        )
        current_branch = result.stdout.strip()

        if current_branch in {"master", "main", base_branch}:
            log.info("Not cleaning up branch %s (protected branch)", current_branch)
            return

        cleanup_result = git_ops.cleanup_feature_branch(
            repo_path=repo_path,
            feature_branch=current_branch,
            base=base_branch,
            allow_branch_cleanup=True,
        )

        if cleanup_result.get("cleaned_up"):
            log.info("Successfully cleaned up feature branch: %s", current_branch)
        else:
            log.warning(
                "Cleanup reported no action for branch %s: %s", current_branch, cleanup_result
            )
    except Exception as exc:
        log.error("Failed to cleanup feature branch: %s", exc)


def cleanup_generated_artifacts(repo_path: str) -> None:
    """Placeholder for cleaning up generated artifacts (implementation TBD)."""

    try:
        log.info("Cleaning up generated artifacts under %s", repo_path)
        # TODO: implement artifact cleanup when artifact generation is defined
    except Exception as exc:
        log.error("Failed to cleanup artifacts: %s", exc)


def scan_repository_directly(repo_path: str) -> Dict[str, List[str]]:
    """Scan repository directly using glob patterns."""

    try:
        repo_root = Path(repo_path)
        result: Dict[str, List[str]] = {
            "layouts": [],
            "resources": [],
            "schemas": [],
            "models": [],
            "config": [],
        }

        for layout_file in glob.glob(str(repo_root / "**/*/layouts/*.json"), recursive=True):
            result["layouts"].append(os.path.relpath(layout_file, repo_path))

        for resource_file in glob.glob(
            str(repo_root / "**/*/texts/resource.*.json"), recursive=True
        ):
            result["resources"].append(os.path.relpath(resource_file, repo_path))

        for schema_file in glob.glob(str(repo_root / "**/*/model.schema.*"), recursive=True):
            result["schemas"].append(os.path.relpath(schema_file, repo_path))

        for model_file in glob.glob(str(repo_root / "**/*/models/*.json"), recursive=True):
            result["models"].append(os.path.relpath(model_file, repo_path))

        for config_file in glob.glob(str(repo_root / "**/*/config/**/*.json"), recursive=True):
            result["config"].append(os.path.relpath(config_file, repo_path))

        log.info(
            "Direct repository scan found %d layouts, %d resources, %d schemas",
            len(result["layouts"]),
            len(result["resources"]),
            len(result["schemas"]),
        )
        return result
    except Exception as exc:
        log.warning("Repository scan failed: %s", exc)
        return {"layouts": [], "resources": [], "schemas": [], "error": str(exc)}


