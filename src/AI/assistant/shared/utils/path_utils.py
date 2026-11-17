"""Path utilities"""

from urllib.parse import urlparse


def repo_owner_and_app_name(repo_url: str) -> tuple[str, str]:
    """Get the owner of the repository and the app name from the last two segments of the URL path.

    The owner is an organization, or the developer for the developer's own repository.
    """
    segments = [segment for segment in urlparse(repo_url).path.split("/") if segment]
    app_name = segments[-1].removesuffix(".git") if segments else ""
    if len(segments) < 2 or not app_name:
        raise ValueError(f"Cannot derive the repository owner and app name from repo_url: {repo_url!r}")
    return segments[-2], app_name
