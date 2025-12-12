"""Verifier workflow pipeline for running validation checks."""

from __future__ import annotations

from typing import Dict, List

from agents.services.validation import verify


def run_verifier_workflow(repo_path: str, changed_files: List[str]) -> Dict[str, object]:
    """Execute verification checks for the given repository changes."""

    results = verify.run_checks(repo_path, changed_files)
    return {
        "passed": results.get("ok", False),
        "notes": results.get("notes", []),
    }
