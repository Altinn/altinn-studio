#!/bin/sh
# The browser playwright-cli launches on the desktop image, through PLAYWRIGHT_MCP_EXECUTABLE_PATH.
# Headed browsers go through the `chromium` launcher for its accessibility switch; headless ones
# use Playwright's headless shell, as by default. The switch cannot go in a playwright-cli config,
# since a project's own config replaces that file and its launch arguments replace a user's.
set -eu
for argument in "$@"; do
    case $argument in
        --headless | --headless=*)
            for shell in /opt/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell; do
                [ -x "$shell" ] && exec "$shell" "$@"
            done
            echo "agent-playwright-chromium: no Playwright headless shell under /opt/ms-playwright" >&2
            exit 1
            ;;
    esac
done
exec /usr/local/bin/chromium "$@"
