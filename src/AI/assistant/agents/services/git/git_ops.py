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


def exists_in_head(repo_path: str, file_path: str) -> bool:
    """Whether the last commit has the file."""
    result = subprocess.run(["git", "cat-file", "-e", f"HEAD:{file_path}"], cwd=repo_path, capture_output=True)
    return result.returncode == 0


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

    The untracked paths include the files that git ignores. A commit leaves out
    such a file, and `discard_unsaved` deletes it, so it is never saved.
    Raise `subprocess.CalledProcessError` if `repo_path` is not a git repository.
    """
    tracked = _paths(repo_path, "diff", "--name-only", "-z", "HEAD")
    untracked = _paths(repo_path, "ls-files", "--others", "-z")
    return sorted(tracked | untracked)


def unpushed_files(repo_path: str) -> list[str]:
    """Return the paths in the local commits that no remote branch has.

    A `git push` that succeeds moves the remote-tracking branch. Thus git has a
    record of the commits on the remote. Raise `subprocess.CalledProcessError`
    if `repo_path` is not a git repository.
    """
    return sorted(_paths(repo_path, "log", "--format=", "--name-only", "-z", "HEAD", "--not", "--remotes"))


def discard_unsaved(repo_path: str) -> None:
    """Make the clone equal to the commits that a remote branch has.

    Remove the local commits that no remote branch has, the changes that are
    not committed, and the untracked files, also the ignored files. Only the
    tools of the model write files in the clone, so an ignored file is an edit
    that the app does not have. Raise `subprocess.CalledProcessError` if
    `repo_path` is not a git repository.
    """
    unpushed = _git(repo_path, "rev-list", "HEAD", "--not", "--remotes").stdout.split()
    # The commits of a session are in a line, thus the parent of the oldest
    # unpushed commit is on the remote.
    saved = f"{unpushed[-1]}^" if unpushed else "HEAD"
    _git(repo_path, "reset", "--hard", "--quiet", saved)
    _git(repo_path, "clean", "-fdx", "--quiet")


def _git(repo_path: str, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["git", *args], cwd=repo_path, capture_output=True, text=True, check=True)


def _paths(repo_path: str, *args: str) -> set[str]:
    """Run a git command that prints paths with `-z`, and return the paths.

    A file name is a sequence of bytes, and is not always UTF-8. An invalid byte
    becomes U+FFFD, so that a decode error does not stop the run. In text mode,
    `subprocess` changes a carriage return to a line feed. Thus the function
    decodes the bytes itself.
    """
    output = subprocess.run(["git", *args], cwd=repo_path, capture_output=True, check=True).stdout
    return {path for path in output.decode("utf-8", errors="replace").split("\0") if path}
