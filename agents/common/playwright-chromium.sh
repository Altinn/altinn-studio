#!/bin/sh
# The browser playwright-cli launches on the desktop image, set through PLAYWRIGHT_MCP_EXECUTABLE_PATH.
#
# A headed browser is on the screen a person watches and `desktop tree` reads, so it is started
# through the desktop's `chromium` launcher, which adds --force-renderer-accessibility. That switch
# cannot travel in a playwright-cli configuration file: a project's own .playwright/cli.config.json
# takes that file's place, and its launch arguments replace rather than extend a user's global ones.
# An executable path set in the environment is applied after every configuration file.
#
# A headless browser is started exactly as Playwright starts it by default, with the headless shell
# and no accessibility switch, because nothing can read its tree.
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
