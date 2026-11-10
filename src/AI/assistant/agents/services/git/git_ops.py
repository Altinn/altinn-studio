"""Git commit for the session branch."""

import subprocess
from datetime import datetime


def head_commit(repo_path: str) -> str | None:
    """The full hash of HEAD, or None when the repository has no commits."""
    result = subprocess.run(
        ["git", "rev-parse", "--verify", "--quiet", "HEAD^{commit}"],
        cwd=repo_path,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip() if result.returncode == 0 else None


def commit(message: str, repo_path: str | None = None, branch_name: str | None = None) -> str | None:
    """Create branch if missing and commit, return hash, or None when nothing changed"""
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


def uncommitted_files(repo_path: str) -> list[str]:
    """Return the paths that are different from the last commit, and the untracked paths.

    Raise `subprocess.CalledProcessError` if `repo_path` is not a git repository.
    """
    tracked = _paths(repo_path, "diff", "--name-only", "-z", "HEAD")
    untracked = _paths(repo_path, "ls-files", "--others", "--exclude-standard", "-z")
    return sorted(tracked | untracked)


def unpushed_files(repo_path: str) -> list[str]:
    """Return the paths in the local commits that no remote branch has.

    A successful `git push` moves the remote-tracking branch, thus git knows
    which commits are on the remote. Raise `subprocess.CalledProcessError` if
    `repo_path` is not a git repository.
    """
    return sorted(_paths(repo_path, "log", "--format=", "--name-only", "-z", "HEAD", "--not", "--remotes"))


def head_commit(repo_path: str) -> str:
    """Return the short hash of the last commit, in the format that `commit` returns."""
    return subprocess.check_output(["git", "rev-parse", "HEAD"], text=True, cwd=repo_path).strip()[:8]


def _paths(repo_path: str, *args: str) -> set[str]:
    """Run a git command that prints paths with `-z`, and return the paths.

    A file name is a sequence of bytes, and not always UTF-8. An invalid byte
    becomes U+FFFD, because a decode error must not stop the run.
    """
    output = subprocess.run(
        ["git", *args], cwd=repo_path, capture_output=True, encoding="utf-8", errors="replace", check=True
    ).stdout
    return {path for path in output.split("\0") if path}
