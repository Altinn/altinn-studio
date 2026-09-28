"""Git commit for the session branch."""

import subprocess
from datetime import datetime


def commit(message: str, repo_path: str | None = None, branch_name: str | None = None) -> str:
    """Create branch if missing and commit, return hash"""
    try:
        # Use provided branch name or create feature branch with timestamp
        if branch_name:
            target_branch = branch_name
        else:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M")
            target_branch = f"altinity_feature_{timestamp}"

        # Work in the target repository directory
        cwd = repo_path if repo_path else None

        # Check if we're on the branch already
        try:
            current_branch = subprocess.check_output(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"], text=True, cwd=cwd
            ).strip()

            if current_branch != target_branch:
                # Create and switch to feature branch if it doesn't exist
                try:
                    subprocess.run(["git", "checkout", target_branch], check=True, cwd=cwd)
                except subprocess.CalledProcessError:
                    # Branch doesn't exist, create it
                    subprocess.run(["git", "checkout", "-b", target_branch], check=True, cwd=cwd)
        except subprocess.CalledProcessError:
            # Create branch
            subprocess.run(["git", "checkout", "-b", target_branch], check=True, cwd=cwd)

        # Stage all changes
        subprocess.run(["git", "add", "."], check=True, cwd=cwd)

        # Check if there are changes to commit
        status_result = subprocess.run(["git", "status", "--porcelain"], cwd=cwd, capture_output=True, text=True)
        if not status_result.stdout.strip():
            print("No changes to commit")
            return None  # Return None instead of failing

        # Commit
        subprocess.run(["git", "commit", "-m", message], capture_output=True, text=True, check=True, cwd=cwd)

        # Get commit hash
        commit_hash = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True, cwd=cwd).strip()[:8]

        return commit_hash

    except subprocess.CalledProcessError as e:
        raise Exception(f"Git commit failed: {e}") from e
