"""App fetching from Gitea/Altinn Studio"""
import logging
import os
from pathlib import Path
from typing import List, Dict, Any
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


def list_local_apps(studio_apps_dir: str) -> List[Dict[str, Any]]:
    """
    Get a list of all available apps in the studio apps directory.
    
    Args:
        studio_apps_dir: Path to the studio apps directory
        
    Returns:
        List of app information dictionaries
    """
    try:
        apps_path = Path(studio_apps_dir)
        if not apps_path.exists():
            logger.warning(f"Studio apps directory does not exist: {studio_apps_dir}")
            return []
        
        apps = []
        for app_dir in apps_path.iterdir():
            if app_dir.is_dir() and not app_dir.name.startswith('.'):
                # Parse org and repo name from directory name (format: org-reponame)
                if not (app_dir / "App/config/applicationmetadata.json").exists():
                    continue
                with open(app_dir / "App/config/applicationmetadata.json", "r") as f:
                    app_json = json.load(f)
                    org = app_json.get("org")
                    # repo_name = app_json.get("repo_name")
                
                apps.append({
                    "name": app_dir.name,
                    "display_name": app_dir.name,
                    "org": org,
                    # "repo_name": repo_name,
                    "path": str(app_dir),
                    "description": f"Altinn app: {app_dir.name}"
                })
        
        return apps
    except Exception as e:
        logger.error(f"Error listing apps: {e}")
        return []


async def fetch_app_from_gitea(org: str, repo_name: str, studio_apps_dir: str, gitea_token: str = None, gitea_url: str = "https://altinn.studio/repos/api/v1") -> Dict[str, Any]:
    """
    Fetch an app from Gitea and save it to the local studio apps directory.

    Args:
        org: Organization name
        repo_name: Repository name
        studio_apps_dir: Path to save the app
        gitea_token: Optional Gitea API token
        gitea_url: Gitea API base URL

    Returns:
        Dict with success status and app information
    """
    import httpx

    try:
        from git import Repo, GitCommandError
    except ImportError:
        logger.error("GitPython not available - install with: pip install GitPython")
        return {
            "success": False,
            "error": "GitPython not installed. Run: pip install GitPython"
        }

    try:
        app_identifier = f"{org}-{repo_name}"
        app_dir = Path(studio_apps_dir) / app_identifier

        # Check if app already exists locally
        if app_dir.exists():
            logger.info(f"App {org}/{repo_name} already exists locally")
            return {
                "success": True,
                "message": f"App {org}/{repo_name} already exists locally",
                "app": {
                    "name": app_identifier,
                    "display_name": f"{repo_name}",
                    "org": org,
                    "repo_name": repo_name,
                    "path": str(app_dir)
                }
            }

        # Get token from environment if not provided
        if not gitea_token:
            gitea_token = os.getenv("GITEA_API_TOKEN")

        # Set up API headers
        headers = {}
        if gitea_token:
            headers["Authorization"] = f"token {gitea_token}"

        # Check if repository exists using Gitea API
        async with httpx.AsyncClient(headers=headers, timeout=30.0) as client:
            repo_api_url = f"{gitea_url}/repos/{org}/{repo_name}"
            logger.info(f"Checking if repository exists: {org}/{repo_name}")

            try:
                response = await client.get(repo_api_url)
                if response.status_code == 404:
                    return {
                        "success": False,
                        "error": f"Repository {org}/{repo_name} not found"
                    }
                elif response.status_code != 200:
                    return {
                        "success": False,
                        "error": f"Failed to access repository: HTTP {response.status_code}"
                    }

                response.json()  # Validate JSON response
                logger.info(f"Repository {org}/{repo_name} found, proceeding with clone")

            except httpx.RequestError as e:
                logger.warning(f"API check failed, proceeding with clone anyway: {e}")

        # Create studio apps directory if needed
        Path(studio_apps_dir).mkdir(parents=True, exist_ok=True)

        # Prepare clone URL (convert API URL to git URL)
        git_base_url = gitea_url.replace("/api/v1", "")
        clone_url = f"{git_base_url}/{org}/{repo_name}.git"

        if gitea_token:
            clone_url = clone_url.replace("https://", f"https://oauth2:{gitea_token}@")

        logger.info(f"Cloning {org}/{repo_name} from {git_base_url}...")

        # Clone the repository
        Repo.clone_from(clone_url, app_dir)

        # Verify clone was successful
        if not app_dir.exists() or not any(app_dir.iterdir()):
            return {
                "success": False,
                "error": f"Clone appears to have failed - directory is empty: {app_dir}"
            }

        logger.info(f"Successfully cloned {org}/{repo_name}")
        return {
            "success": True,
            "message": f"Successfully fetched app {org}/{repo_name} with Git history",
            "app": {
                "name": app_identifier,
                "display_name": f"{repo_name}",
                "org": org,
                "repo_name": repo_name,
                "path": str(app_dir)
            }
        }

    except GitCommandError as e:
        logger.error(f"Git clone failed for {org}/{repo_name}: {e}")
        # Cleanup on failure
        if 'app_dir' in locals() and app_dir.exists():
            import shutil
            shutil.rmtree(app_dir, ignore_errors=True)

        return {
            "success": False,
            "error": f"Git clone failed: {str(e)}"
        }
    except Exception as e:
        logger.error(f"Error fetching app from Gitea: {e}")
        # Cleanup on failure
        if 'app_dir' in locals() and app_dir.exists():
            import shutil
            shutil.rmtree(app_dir, ignore_errors=True)

        return {
            "success": False,
            "error": str(e)
        }
