"""
App fetching utilities for the Altinn Studio Code Generator.
This module handles fetching example apps from Gitea based on the user prompt.
"""

import os
import re
import time
import requests
import json
import urllib.parse
import shutil
from pathlib import Path
from typing import List, Optional

from server.config import STUDIO_APPS_DIR, APP_FETCHER_CONFIG, GITEA_API_KEY

# Get constants from config
GITEA_URL = APP_FETCHER_CONFIG["GITEA_URL"]
API_TOKEN = GITEA_API_KEY  # Get Gitea token from config
EMBEDDING_API_URL = APP_FETCHER_CONFIG["EMBEDDING_API_URL"]
DEFAULT_APP_LIST = APP_FETCHER_CONFIG["DEFAULT_APP_LIST"]
API_TIMEOUT = APP_FETCHER_CONFIG["API_TIMEOUT"]
RETRY_DELAY = APP_FETCHER_CONFIG["RETRY_DELAY"]
NUM_APPS_TO_FETCH = APP_FETCHER_CONFIG["NUM_APPS_TO_FETCH"]

def check_api_token() -> bool:
    """
    Check if the API token is set and warn the user if it's not.
    
    Returns:
        bool: True if the token is set, False otherwise
    """
    if not API_TOKEN:
        print("WARNING: GITEA_API_TOKEN is not set. Please add your Gitea API token to the .env file.")
        print("You can get a token from https://altinn.studio/user/settings/applications")
        return False
    return True

def get_recommended_apps(prompt: str) -> List[str]:
    """
    Get a list of recommended apps for a given prompt from the embedding API.
    
    Args:
        prompt (str): The user prompt
        
    Returns:
        List[str]: List of recommended app names
    """
    try:
        # URL encode the prompt
        encoded_prompt = urllib.parse.quote(prompt)
        print(f"Fetching app recommendations for prompt: {prompt}")
        
        # Using params automatically handles URL encoding, but we can also build the URL manually
        url = f"{EMBEDDING_API_URL}?query={encoded_prompt}"
        response = requests.get(url, timeout=API_TIMEOUT)
        response.raise_for_status()
        
        app_list = response.json()
        print(f"Successfully fetched {len(app_list)} app recommendations")
        return app_list
    except requests.exceptions.RequestException as e:
        print(f"Error fetching app recommendations: {e}")
        print("Falling back to default app list")
        # Fallback to default list if API call fails
        return DEFAULT_APP_LIST

def fetch_app_files(repo_owner: str, repo_name: str, app_dir: str) -> None:
    """
    Fetch all files from an Altinn Studio app repository and save them to a local directory.
    
    Args:
        repo_owner (str): The owner of the repository
        repo_name (str): The name of the repository
        app_dir (str): The directory to save the files to
    """
    # Create base directory for the app if it doesn't exist
    if not os.path.exists(app_dir):
        os.makedirs(app_dir)
    
    # Fetch the entire repository contents by starting from the root
    fetch_directory_contents(repo_owner, repo_name, "", app_dir)
    
    print(f"All files saved to directory: {app_dir}")

def fetch_directory_contents(repo_owner: str, repo_name: str, directory_path: str, base_dir: str) -> None:
    """
    Recursively fetch all files from a directory in a Gitea repository.
    
    Args:
        repo_owner (str): The owner of the repository
        repo_name (str): The name of the repository
        directory_path (str): The path to the directory in the repository
        base_dir (str): The base directory to save files to
    """
    url = f"{GITEA_URL}/repos/{repo_owner}/{repo_name}/contents/{directory_path}?token={API_TOKEN}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raise an exception for 4XX/5XX responses
        
        contents = response.json()
        
        for item in contents:
            item_path = item['path']
            item_name = item['name']
            item_type = item['type']
            
            # Create local path
            local_path = os.path.join(base_dir, item_path)
            
            if item_type == 'dir':
                # Create directory if it doesn't exist
                if not os.path.exists(local_path):
                    os.makedirs(local_path)
                
                # Recursively fetch contents of the directory
                fetch_directory_contents(repo_owner, repo_name, item_path, base_dir)
            else:
                # Download and save file
                download_file(repo_owner, repo_name, item_path, local_path)
    except requests.exceptions.RequestException as e:
        print(f"Error fetching directory contents: {e}")
        if hasattr(e, 'response') and e.response is not None:
            if e.response.status_code == 403:
                print("Access forbidden. Check your API token permissions.")
            elif e.response.status_code == 404:
                print(f"Directory not found: {directory_path}")
            elif e.response.status_code == 429:
                print("Rate limit exceeded. Waiting before retrying...")
                time.sleep(RETRY_DELAY)  # Wait before retrying
                fetch_directory_contents(repo_owner, repo_name, directory_path, base_dir)
    except ValueError as e:
        print(f"Error parsing JSON response: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")

def download_file(repo_owner: str, repo_name: str, file_path: str, local_path: str) -> None:
    """
    Download a file from a Gitea repository and save it locally.
    
    Args:
        repo_owner (str): The owner of the repository
        repo_name (str): The name of the repository
        file_path (str): The path to the file in the repository
        local_path (str): The local path to save the file to
    """
    url = f"{GITEA_URL}/repos/{repo_owner}/{repo_name}/raw/{file_path}?token={API_TOKEN}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raise an exception for 4XX/5XX responses
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        # Save file content
        with open(local_path, 'wb') as file:
            file.write(response.content)
        
        print(f"File saved: {local_path}")
    except requests.exceptions.RequestException as e:
        print(f"Error downloading file: {e}")
        if hasattr(e, 'response') and e.response is not None:
            if e.response.status_code == 403:
                print("Access forbidden. Check your API token permissions.")
            elif e.response.status_code == 404:
                print(f"File not found: {file_path}")
            elif e.response.status_code == 429:
                print("Rate limit exceeded. Waiting before retrying...")
                time.sleep(RETRY_DELAY)  # Wait before retrying
                download_file(repo_owner, repo_name, file_path, local_path)
    except Exception as e:
        print(f"Unexpected error: {e}")

def get_available_apps() -> List[str]:
    """
    Get a list of all available app directories in the studio-apps directory.
    
    Returns:
        List[str]: List of absolute paths to app directories
    """
    # Create the studio-apps directory if it doesn't exist
    if not os.path.exists(STUDIO_APPS_DIR):
        os.makedirs(STUDIO_APPS_DIR)
    
    # Get all app directories in studio-apps
    available_apps = []
    if os.path.exists(STUDIO_APPS_DIR):
        for app_dir_name in os.listdir(STUDIO_APPS_DIR):
            app_dir = os.path.join(STUDIO_APPS_DIR, app_dir_name)
            if os.path.isdir(app_dir):
                available_apps.append(app_dir)
    
    print(f"Found {len(available_apps)} existing app directories")
    return available_apps

def get_recommended_app_dirs(prompt: str) -> List[str]:
    """
    Get recommended app directories based on the user prompt.
    This function only returns directories that already exist locally.
    
    Args:
        prompt (str): The user prompt
        
    Returns:
        List[str]: List of recommended app directories that exist locally
    """
    # Get recommended apps from the embedding API
    app_list = get_recommended_apps(prompt)
    
    # Create the studio-apps directory if it doesn't exist
    if not os.path.exists(STUDIO_APPS_DIR):
        os.makedirs(STUDIO_APPS_DIR)
    
    # List of app directories that are available for use
    recommended_apps = []
    
    for app_name in app_list:
        # Split the app name to get repo_owner and repo_name
        parts = app_name.split("-", 1)
        if len(parts) != 2:
            print(f"Invalid app name format: {app_name}. Expected format: 'owner-reponame'")
            continue
        
        repo_owner = parts[0]
        repo_name = parts[1]
        
        # Create directory path for this specific app
        app_dir = os.path.join(STUDIO_APPS_DIR, f"{repo_owner}-{repo_name}")
        
        # Check if the app directory exists locally
        if os.path.exists(app_dir):
            recommended_apps.append(app_dir)
    
    print(f"Found {len(recommended_apps)} recommended apps that exist locally")
    return recommended_apps

def clone_gitea_repository(repo_owner: str, repo_name: str, app_dir: str) -> bool:
    """
    Clone a repository from Gitea with full Git history.
    
    Args:
        repo_owner (str): The owner of the repository
        repo_name (str): The name of the repository
        app_dir (str): The directory to clone the repository to
        
    Returns:
        bool: True if clone was successful, False otherwise
    """
    import subprocess
    
    # Construct Gitea clone URL
    gitea_url = GITEA_URL.rstrip('/')
    if gitea_url.endswith('/api/v1'):
        gitea_url = gitea_url[:-7]  # Remove /api/v1 suffix
    
    clone_url = f"{gitea_url}/{repo_owner}/{repo_name}.git"
    
    # Add authentication if token is available
    if API_TOKEN:
        from urllib.parse import urlparse, urlunparse
        parsed = urlparse(clone_url)
        authenticated_url = urlunparse((
            parsed.scheme,
            f"oauth2:{API_TOKEN}@{parsed.netloc}",
            parsed.path,
            parsed.params,
            parsed.query,
            parsed.fragment
        ))
        clone_url = authenticated_url
    
    try:
        print(f"Cloning repository with Git history: {repo_owner}/{repo_name}")
        result = subprocess.run(
            ["git", "clone", clone_url, app_dir],
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode == 0:
            print(f"Successfully cloned repository with full Git history: {app_dir}")
            return True
        else:
            print(f"Git clone failed: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print(f"Git clone timed out for {repo_owner}/{repo_name}")
        return False
    except Exception as e:
        print(f"Error cloning repository: {e}")
        return False

def download_recommended_apps(prompt: str, use_git_clone: bool = True) -> List[str]:
    """
    Download recommended apps based on the user prompt.
    
    Args:
        prompt (str): The user prompt
        use_git_clone (bool): If True, clone with Git history. If False, download files only.
        
    Returns:
        List[str]: List of app directories that were downloaded or already exist
    """
    # Get recommended apps from the embedding API
    app_list = get_recommended_apps(prompt)
    
    # Create the studio-apps directory if it doesn't exist
    if not os.path.exists(STUDIO_APPS_DIR):
        os.makedirs(STUDIO_APPS_DIR)
    
    # List of app directories that are available for use
    available_apps = []
    
    # Check if API token is set before fetching
    if not check_api_token():
        print("Skipping app downloads due to missing API token.")
        return available_apps
    
    for app_name in app_list:
        # Split the app name to get repo_owner and repo_name
        parts = app_name.split("-", 1)
        if len(parts) != 2:
            print(f"Invalid app name format: {app_name}. Expected format: 'owner-reponame'")
            continue
        
        repo_owner = parts[0]
        repo_name = parts[1]
        
        # Create directory path for this specific app
        app_dir = os.path.join(STUDIO_APPS_DIR, f"{repo_owner}-{repo_name}")
        
        # Skip if already exists
        if os.path.exists(app_dir):
            print(f"Repository already exists: {app_dir}")
            available_apps.append(app_dir)
            continue
        
        print(f"\nFetching repository: {repo_owner}/{repo_name}")
        
        success = False
        if use_git_clone:
            # Try to clone with Git history first
            success = clone_gitea_repository(repo_owner, repo_name, app_dir)
        
        if not success:
            # Fallback to file download method
            print(f"Falling back to file download for {repo_owner}/{repo_name}")
            fetch_app_files(repo_owner, repo_name, app_dir)
            success = os.path.exists(app_dir)
        
        # Check if the app directory exists locally after fetching
        if success and os.path.exists(app_dir):
            available_apps.append(app_dir)
        else:
            print(f"App directory not found after download attempt: {app_dir}")
    
    print(f"Downloaded {len(available_apps)} apps for processing")
    return available_apps