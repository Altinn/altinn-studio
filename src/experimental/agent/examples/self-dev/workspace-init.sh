#!/bin/sh
set -eu

repository=${AGENT_WORKSPACE_REPOSITORY:-https://x-access-token:agent-github-token-placeholder@github.com/Altinn/altinn-studio.git}
destination=${AGENT_WORKSPACE_DESTINATION:-/home/agent/code/altinn-studio}

if [ -d "$destination/.git" ]; then
    exit 0
fi

parent=${destination%/*}
mkdir -p "$parent"
/usr/bin/git clone --origin origin -- "$repository" "$destination"
