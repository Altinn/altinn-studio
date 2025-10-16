"""
Repository management service for cloning and managing Altinn app repos.
Handles cloning from gitea, temporary storage, and cleanup.
"""

import os
import tempfile
import shutil
from pathlib import Path
from typing import Optional, Dict, Any
import subprocess
import hashlib
from urllib.parse import urlparse, urlunparse

from shared.utils.logging_utils import get_logger
from shared.config import get_config

log = get_logger(__name__)
config = get_config()


class RepoManager:
    """Manages cloning and cleanup of Altinn app repositories"""

    def __init__(self):
        self.temp_dir = Path(tempfile.gettempdir()) / "altinity_repos"
        self.temp_dir.mkdir(exist_ok=True)
        self.active_repos: Dict[str, Path] = {}  # session_id -> repo_path

    def _get_auth_url(self, repo_url: str) -> str:
        """
        Convert a repo URL to include authentication token if available.

        Args:
            repo_url: Original repository URL

        Returns:
            URL with authentication token if available
        """
        token = config.GITEA_LOCAL_TOKEN
        if not token:
            log.warning("No GITEA_LOCAL_TOKEN configured - git operations may fail if authentication is required")
            return repo_url

        try:
            parsed = urlparse(repo_url)
            # Insert token as username (common git auth pattern)
            # Format: https://token@host/path or https://username:token@host/path
            if parsed.username:
                # Already has username, replace with token as password
                netloc = f"{parsed.username}:{token}@{parsed.hostname}"
                if parsed.port:
                    netloc += f":{parsed.port}"
            else:
                # No username, use token as username
                netloc = f"{token}@{parsed.hostname}"
                if parsed.port:
                    netloc += f":{parsed.port}"

            auth_url = urlunparse(parsed._replace(netloc=netloc))
            log.debug(f"Converted {repo_url} to authenticated URL")
            return auth_url

        except Exception as e:
            log.warning(f"Failed to add authentication to URL {repo_url}: {e}")
            return repo_url

    def clone_repo_for_session(self, repo_url: str, session_id: str, branch: Optional[str] = None) -> Path:
        """
        Clone a repository for a specific session.

        Args:
            repo_url: Git repository URL (e.g., http://localhost:3000/user/repo.git)
            session_id: Unique session identifier
            branch: Optional branch name to checkout after cloning

        Returns:
            Path to the cloned repository

        Raises:
            Exception: If cloning fails
        """
        # Create a unique directory name based on repo URL and session
        repo_hash = hashlib.md5(repo_url.encode()).hexdigest()[:8]
        repo_name = f"{session_id}_{repo_hash}"

        repo_path = self.temp_dir / repo_name

        # Check if already cloned for this session
        if session_id in self.active_repos:
            existing_path = self.active_repos[session_id]
            if existing_path.exists():
                log.info(f"Using existing cloned repo for session {session_id}: {existing_path}")
                # If a branch was specified and we're reusing an existing repo, checkout that branch
                if branch:
                    try:
                        checkout_cmd = ["git", "checkout", branch]
                        result = subprocess.run(checkout_cmd, cwd=existing_path, capture_output=True, text=True, check=True)
                        log.info(f"Checked out branch {branch} for existing session {session_id}")
                    except subprocess.CalledProcessError as e:
                        log.warning(f"Failed to checkout branch {branch} for existing session: {e.stderr}")
                        # Try to create and checkout the branch
                        try:
                            create_branch_cmd = ["git", "checkout", "-b", branch]
                            result = subprocess.run(create_branch_cmd, cwd=existing_path, capture_output=True, text=True, check=True)
                            log.info(f"Created and checked out new branch {branch} for existing session {session_id}")
                        except subprocess.CalledProcessError as e2:
                            log.error(f"Failed to create branch {branch}: {e2.stderr}")
                return existing_path

        # Remove any existing directory with this name
        if repo_path.exists():
            log.info(f"Removing existing repo directory: {repo_path}")
            shutil.rmtree(repo_path)

        log.info(f"Cloning repository {repo_url} to {repo_path}")

        try:
            # Use authenticated URL for cloning
            auth_url = self._get_auth_url(repo_url)
            cmd = ["git", "clone", auth_url, str(repo_path)]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)

            log.info(f"Successfully cloned {repo_url} for session {session_id}")

            # If a branch was specified, checkout that branch
            if branch:
                try:
                    # First try to checkout existing branch
                    checkout_cmd = ["git", "checkout", branch]
                    result = subprocess.run(checkout_cmd, cwd=repo_path, capture_output=True, text=True, check=True)
                    log.info(f"Checked out existing branch {branch} for session {session_id}")
                except subprocess.CalledProcessError:
                    # Branch doesn't exist, create it
                    try:
                        create_branch_cmd = ["git", "checkout", "-b", branch]
                        result = subprocess.run(create_branch_cmd, cwd=repo_path, capture_output=True, text=True, check=True)
                        log.info(f"Created and checked out new branch {branch} for session {session_id}")
                    except subprocess.CalledProcessError as e:
                        log.error(f"Failed to create branch {branch}: {e.stderr}")
                        # Continue anyway - we'll work on default branch

            # Store the active repo mapping
            self.active_repos[session_id] = repo_path

            return repo_path

        except subprocess.CalledProcessError as e:
            error_msg = f"Failed to clone repository {repo_url}: {e.stderr}"
            log.error(error_msg)
            raise Exception(error_msg)

    def push_branch(self, session_id: str, branch_name: str) -> bool:
        """
        Push a branch to the remote repository.

        Args:
            session_id: Session identifier
            branch_name: Branch name to push

        Returns:
            True if push succeeded

        Raises:
            Exception: If push fails
        """
        if session_id not in self.active_repos:
            raise Exception(f"No active repository found for session {session_id}")

        repo_path = self.active_repos[session_id]

        log.info(f"Pushing branch {branch_name} for session {session_id}")

        try:
            # Get the current remote URL and ensure it has authentication
            get_url_cmd = ["git", "remote", "get-url", "origin"]
            url_result = subprocess.run(get_url_cmd, cwd=repo_path, capture_output=True, text=True, check=True)
            current_url = url_result.stdout.strip()

            # Add authentication to the URL if needed
            auth_url = self._get_auth_url(current_url)
            if auth_url != current_url:
                # Update remote URL with authentication
                update_cmd = ["git", "remote", "set-url", "origin", auth_url]
                subprocess.run(update_cmd, cwd=repo_path, check=True, capture_output=True)

            # Push the branch
            cmd = ["git", "push", "origin", branch_name]
            result = subprocess.run(cmd, cwd=repo_path, capture_output=True, text=True, check=True)

            log.info(f"Successfully pushed branch {branch_name} for session {session_id}")
            return True

        except subprocess.CalledProcessError as e:
            error_msg = f"Failed to push branch {branch_name}: {e.stderr}"
            log.error(error_msg)
            raise Exception(error_msg)

    def cleanup_session(self, session_id: str):
        """
        Clean up repository for a completed session.

        Args:
            session_id: Session identifier
        """
        if session_id not in self.active_repos:
            log.warning(f"No active repository to cleanup for session {session_id}")
            return

        repo_path = self.active_repos[session_id]

        try:
            if repo_path.exists():
                log.info(f"Cleaning up repository for session {session_id}: {repo_path}")
                shutil.rmtree(repo_path)

            # Remove from active repos
            del self.active_repos[session_id]
            log.info(f"Successfully cleaned up session {session_id}")

        except Exception as e:
            log.error(f"Failed to cleanup repository for session {session_id}: {e}")

    def get_session_repo_path(self, session_id: str) -> Optional[Path]:
        """
        Get the repository path for a session.

        Args:
            session_id: Session identifier

        Returns:
            Repository path or None if not found
        """
        return self.active_repos.get(session_id)


# Global instance
_repo_manager: Optional[RepoManager] = None

def get_repo_manager() -> RepoManager:
    """Get the global repository manager instance"""
    global _repo_manager
    if _repo_manager is None:
        _repo_manager = RepoManager()
    return _repo_manager
