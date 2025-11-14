import requests
import os

#import access token from .env
from dotenv import load_dotenv
load_dotenv()

GITHUB_API_TOKEN = os.getenv("GITHUB_ACCESS_TOKEN")

def get_file(repo_owner: str, repo_name: str, file_path: str, branch: str = "master") -> str:
    """
    Get a file from a GitHub repository.
    
    Args:
        repo_name (str): The name of the repository
        file_path (str): The path to the file in the repository local path
        branch (str): The branch of the repository
    
    Returns:
        str: The content of the file
    """
    # Try raw GitHub URL first (no auth needed for public repos)
    raw_url = f"https://raw.githubusercontent.com/{repo_owner}/{repo_name}/{branch}/{file_path}"
    try:
        response = requests.get(raw_url)
        response.raise_for_status()
        return response.text
    except requests.exceptions.RequestException:
        # Fallback to API with token if raw fails
        url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contents/{file_path}?ref={branch}"
        try:
            headers = {
                "Authorization": f"token {GITHUB_API_TOKEN}",
                "Accept": "application/vnd.github.v3+json"
            }
            response = requests.get(url, headers=headers)
            response.raise_for_status()

            #Parse content from base64
            import base64
            content = base64.b64decode(response.json()["content"]).decode("utf-8")
            return content
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"Error fetching file: {e}")
