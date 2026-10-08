"""Path utilities"""


def app_name_from_repo_url(repo_url: str) -> str:
    last_segment = repo_url.rstrip("/").split("/")[-1].removesuffix(".git")
    if not last_segment:
        raise ValueError(f"Cannot derive app name from repo_url: {repo_url!r}")
    return last_segment
