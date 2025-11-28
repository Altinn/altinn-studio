"""initiate_mcp.py
Cross-platform launcher for Altinity MCP server.

This script opens a terminal window/tab and starts the MCP server:
    uv run -m server.main

It supports macOS, Windows, and Linux (major desktop environments).

Usage:
    macOS / Linux:
        python3 initiate_mcp.py
    Windows:
        python initiate_mcp.py

If your system uses a non-standard terminal emulator on Linux, you can
set the ALTINITY_TERMINAL environment variable to point to it, e.g.:
    ALTINITY_TERMINAL=alacritty python initiate_mcp.py
"""
from __future__ import annotations

import os
import platform
import shlex
import subprocess
import sys
import shutil
from pathlib import Path
from typing import Callable

# Absolute path to the Altinity-MCP repository root directory (where this file lives)
REPO_ROOT: Path = Path(__file__).resolve().parent


# ---------------------------------------------------------------------------
# macOS implementation -------------------------------------------------------
# ---------------------------------------------------------------------------

def _launch_mac(command: str) -> None:
    """Launch *command* in a new macOS Terminal tab/window via osascript."""
    # Escape double-quotes & backslashes for AppleScript
    escaped = command.replace("\\", "\\\\").replace("\"", "\\\"")
    apple_script = (
        f'tell application "Terminal" to do script "{escaped}"\n'  # new tab
        "tell application \"Terminal\" to activate"  # ensure focus
    )
    subprocess.Popen(["osascript", "-e", apple_script])


# ---------------------------------------------------------------------------
# Windows implementation -----------------------------------------------------
# ---------------------------------------------------------------------------

def _launch_windows(command: str) -> None:
    """Launch *command* in a new Windows Command Prompt window."""
    # `start` opens a new window; /k keeps the window open after execution.
    subprocess.Popen(["cmd", "/c", "start", "cmd", "/k", command])


# ---------------------------------------------------------------------------
# Linux / generic Unix implementation ---------------------------------------
# ---------------------------------------------------------------------------

_LINUX_TERMINAL_CANDIDATES = [
    ("$ALTINITY_TERMINAL", "-e"),  # user override
    ("gnome-terminal", "--"),
    ("konsole", "-e"),
    ("x-terminal-emulator", "-e"),
    ("xterm", "-e"),
]

def _launch_linux(command: str) -> None:
    """Launch *command* in a new terminal window on Linux/Unix."""
    for exe, flag in _LINUX_TERMINAL_CANDIDATES:
        exe_resolved = os.path.expandvars(exe)
        if not exe_resolved:
            continue  # Environment variable not set
        if _is_command_available(exe_resolved):
            # Wrap the command so the shell stays open after exit
            wrapped_cmd = f"bash -c {shlex.quote(command + '; exec bash')}"
            try:
                subprocess.Popen([exe_resolved, flag, wrapped_cmd])
                return
            except Exception as exc:
                # Try next candidate if current fails
                print(f"Warning: failed to launch {exe_resolved}: {exc}", file=sys.stderr)
    print(
        "Error: Could not find a supported terminal emulator. "
        "Set ALTINITY_TERMINAL to your terminal binary.",
        file=sys.stderr,
    )


def _is_command_available(cmd: str) -> bool:
    """Return True if *cmd* is executable in PATH or as an absolute path."""
    return bool(shutil.which(cmd)) if not os.path.isabs(cmd) else os.access(cmd, os.X_OK)


# ---------------------------------------------------------------------------
# Main entry -----------------------------------------------------------------
# ---------------------------------------------------------------------------

def _get_launcher() -> Callable[[str], None]:
    system = platform.system()
    if system == "Darwin":
        return _launch_mac
    if system == "Windows":
        return _launch_windows
    return _launch_linux  # default to Linux/Unix


def _build_command(cmd: str) -> str:
    """Return a shell command that first *cd*s to the repo root then runs *cmd*."""
    root = str(REPO_ROOT)
    if platform.system() == "Windows":
        return f'cd /d "{root}" && {cmd}'
    # macOS / Linux
    return f'cd "{root}" && {cmd}'


def main() -> None:
    """
    Entry point for the launcher.
    
    Starts the MCP server using:
        uv run -m server.main
    """
    # Build the command
    command = "uv run -m server.main"

    launcher = _get_launcher()
    final_cmd = _build_command(command)
    print(f"Launching: {final_cmd}")
    launcher(final_cmd)

    # Notify user that service is starting up
    print("\nMCP server is starting up... It will be reachable via your MCP client (e.g., Windsurf) shortly!\n")


if __name__ == "__main__":
    main()
