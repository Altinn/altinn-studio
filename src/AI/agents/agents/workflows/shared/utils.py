"""Shared workflow utilities for cleanup."""

from __future__ import annotations

import subprocess

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
