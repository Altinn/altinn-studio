"""Git operations and repository management services."""

from .git_ops import (
    enforce_caps,
    preview,
    CapsExceededError,
    search_files,
    modify_file_content,
    modify_json_field,
    find_and_replace_in_resources,
    apply,
    commit,
    revert,
    deduplicate_resource_ids,
    cleanup_feature_branch,
)

__all__ = [
    "enforce_caps",
    "preview",
    "CapsExceededError",
    "search_files",
    "modify_file_content",
    "modify_json_field",
    "find_and_replace_in_resources",
    "apply",
    "commit",
    "revert",
    "deduplicate_resource_ids",
    "cleanup_feature_branch",
]
