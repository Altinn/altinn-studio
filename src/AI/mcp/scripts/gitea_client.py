"""Client for interacting with Gitea API."""

from typing import List, Dict, Any
import requests
import base64
import os
from server.config import GITEA_API_KEY as API_TOKEN
from server.config import APP_FETCHER_CONFIG

# Configuration
GITEA_URL = APP_FETCHER_CONFIG["GITEA_URL"]

def check_api_token() -> bool:
    """Check if the API token is set."""
    return bool(API_TOKEN)

def get_directory_metadata(repo_owner: str, repo_name: str, directory_path: str) -> List[Dict[str, Any]]:
    """Get a list of all files from a directory through Gitea API."""
    # Test API token
    if not check_api_token():
        raise Exception("Missing API token")

    api_url = f"{GITEA_URL}/repos/{repo_owner}/{repo_name}/contents/{directory_path}?token={API_TOKEN}"
    try:
        resp = requests.get(api_url)
        resp.raise_for_status()
        files = resp.json()
        return files
    except Exception as e:
        raise e

def get_directory_files(repo_owner: str, repo_name: str, directory_path: str) -> List[Dict[str, Any]]:
    """Get all files from a directory through Gitea API."""
    files = get_directory_metadata(repo_owner, repo_name, directory_path)

    layouts = []

    # Download each file (Memory might be an issue)
    try:
        for file in files:
            download_url = file.get("download_url") + f"?token={API_TOKEN}"
            name = file.get("name")
            if not download_url:
                continue
            try:
                file_resp = requests.get(download_url)
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

def get_file_content(repo_owner: str, repo_name: str, file_path: str) -> str:
    """Get the contents of a file through Gitea API."""
    # Test API token
    if not check_api_token():
        raise Exception("Missing API token")

    api_url = f"{GITEA_URL}/repos/{repo_owner}/{repo_name}/contents/{file_path}?token={API_TOKEN}"
    try:
        resp = requests.get(api_url)
        resp.raise_for_status()
        file_content = resp.json()
        file_content = file_content.get("content", "")
        file_content = base64.b64decode(file_content).decode("utf-8")
        return file_content
    except Exception as e:
        raise e
