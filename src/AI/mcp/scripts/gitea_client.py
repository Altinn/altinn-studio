"""Client for interacting with Gitea API.

This client supports both single-tenant and multi-tenant modes:
- Multi-tenant: Token passed via Authorization header per request
- Single-tenant: Token from environment variable (GITEA_API_KEY)
"""

from typing import List, Dict, Any, Optional
import requests
import base64
import os
from server.config import APP_FETCHER_CONFIG
from server.auth import get_gitea_token_with_fallback

# Configuration
GITEA_URL = APP_FETCHER_CONFIG["GITEA_URL"]

def check_api_token(headers: Optional[dict] = None) -> bool:
    """Check if the API token is available.

    Args:
        headers: Optional HTTP headers for multi-tenant mode

    Returns:
        True if token is available, False otherwise
    """
    try:
        token = get_gitea_token_with_fallback(headers)
        return bool(token)
    except ValueError:
        return False

def get_directory_metadata(repo_owner: str, repo_name: str, directory_path: str, headers: Optional[dict] = None) -> List[Dict[str, Any]]:
    """Get a list of all files from a directory through Gitea API.

    Args:
        repo_owner: Repository owner username
        repo_name: Repository name
        directory_path: Path to directory in repository
        headers: Optional HTTP headers for multi-tenant mode

    Returns:
        List of file metadata dictionaries
    """
    # Get API token (from header or environment)
    if not check_api_token(headers):
        raise Exception("Missing API token")

    api_token = get_gitea_token_with_fallback(headers)
    api_url = f"{GITEA_URL}/repos/{repo_owner}/{repo_name}/contents/{directory_path}"

    # Send token as Authorization header (SECURE - not in URL!)
    request_headers = {"Authorization": f"token {api_token}"}

    try:
        resp = requests.get(api_url, headers=request_headers)
        resp.raise_for_status()
        files = resp.json()
        return files
    except Exception as e:
        raise e

def get_directory_files(repo_owner: str, repo_name: str, directory_path: str, headers: Optional[dict] = None) -> List[Dict[str, Any]]:
    """Get all files from a directory through Gitea API.

    Args:
        repo_owner: Repository owner username
        repo_name: Repository name
        directory_path: Path to directory in repository
        headers: Optional HTTP headers for multi-tenant mode

    Returns:
        List of file content dictionaries with 'name' and 'content' keys
    """
    files = get_directory_metadata(repo_owner, repo_name, directory_path, headers)
    api_token = get_gitea_token_with_fallback(headers)

    # Prepare Authorization header (SECURE - token not in URL!)
    request_headers = {"Authorization": f"token {api_token}"}

    layouts = []

    # Download each file (Memory might be an issue)
    try:
        for file in files:
            download_url = file.get("download_url")
            name = file.get("name")
            if not download_url:
                continue
            try:
                file_resp = requests.get(download_url, headers=request_headers)
                file_resp.raise_for_status()
                content = file_resp.text
                layouts.append({
                    "name": name,
                    "content": content
                })
            except Exception as file_error:
                layouts.append({
                    "name": name,
                    "error": str(file_error)
                })
    except Exception as e:
        raise e
    return layouts

def get_file_content(repo_owner: str, repo_name: str, file_path: str, headers: Optional[dict] = None) -> str:
    """Get the contents of a file through Gitea API.

    Args:
        repo_owner: Repository owner username
        repo_name: Repository name
        file_path: Path to file in repository
        headers: Optional HTTP headers for multi-tenant mode

    Returns:
        File content as string
    """
    # Test API token
    if not check_api_token(headers):
        raise Exception("Missing API token")

    api_token = get_gitea_token_with_fallback(headers)
    api_url = f"{GITEA_URL}/repos/{repo_owner}/{repo_name}/contents/{file_path}"

    # Send token as Authorization header (SECURE - not in URL!)
    request_headers = {"Authorization": f"token {api_token}"}

    try:
        resp = requests.get(api_url, headers=request_headers)
        resp.raise_for_status()
        file_content = resp.json()
        file_content = file_content.get("content", "")
        file_content = base64.b64decode(file_content).decode("utf-8")
        return file_content
    except Exception as e:
        raise e
