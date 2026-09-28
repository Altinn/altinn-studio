#!/bin/bash

set -e
set -u

if [[ ! -d "$1" ]]; then
  echo "Please provide a target folder path as the first parameter"
  exit 1
fi

TARGET=$(realpath "$1")
ENVIRONMENTS=("tt02" "prod")

mkdir -p "$1/.cache"

function get_deployments {
  local ORG="$1"
  local ENV_KEY="$2"
  local DEPLOYMENTS_FILE="$TARGET/.cache/deployments-$ORG-$ENV_KEY.json"
  local URL

  if [[ "$ENV_KEY" == "prod" ]]; then
    URL="https://$ORG.apps.altinn.no/kuberneteswrapper/api/v1/deployments"
  else
    URL="https://$ORG.apps.$ENV_KEY.altinn.no/kuberneteswrapper/api/v1/deployments"
  fi

  download_file_if_old "$DEPLOYMENTS_FILE" "$URL" "deployments for $ORG (in $ENV_KEY)" || return 0
  jq -r '.[] | .release + " " + .version' "$DEPLOYMENTS_FILE" | grep -v kuberneteswrapper
}

function get_release() {
  local ORG="$1"
  local APP="$2"
  local VERSION="$3"
  local URL_PROD="https://altinn.studio/designer/api/$ORG/$APP/releases"
  local URL_DEV="https://dev.altinn.studio/designer/api/$ORG/$APP/releases"
  local CACHE_PROD="$TARGET/.cache/releases-prod-$ORG-$APP.json"
  local CACHE_DEV="$TARGET/.cache/releases-dev-$ORG-$APP.json"
  local FOUND=""
  local REPO

  if download_file_if_old "$CACHE_PROD" "$URL_PROD" "releases for $ORG/$APP"; then
    FOUND=$(jq -r '.results[] | (.tagName + " " + .targetCommitish)' "$CACHE_PROD" | grep "^$VERSION " | head -n 1 | awk '{print $2}')
  fi
  REPO="https://altinn.studio/repos/$ORG/$APP.git"
  if test -z "$FOUND"; then
    if download_file_if_old "$CACHE_DEV" "$URL_DEV" "releases for $ORG/$APP (in dev)"; then
      FOUND=$(jq -r '.results[] | (.tagName + " " + .targetCommitish)' "$CACHE_DEV" | grep "^$VERSION " | head -n 1 | awk '{print $2}')
    fi
    REPO="https://dev.altinn.studio/repos/$ORG/$APP.git"
  fi

  echo "$REPO" "$FOUND"
}

# Returns non-zero when neither a fresh download nor an older cached copy is available
function download_file_if_old {
  local FILE_PATH="$1"
  local URL="$2"
  local DESCRIPTION="$3"

  if test -e "$FILE_PATH"; then
    if [[ "$(uname)" == "Darwin" ]]; then
      FILE_AGE=$(($(date +%s) - $(stat -t %s -f %m "$FILE_PATH")))
    else
      FILE_AGE=$(($(date +%s) - $(stat -c '%Y' "$FILE_PATH")))
    fi
    if test "$FILE_AGE" -gt "3600"; then
      download_file "$FILE_PATH" "$URL" "$DESCRIPTION"
    fi
  else
    download_file "$FILE_PATH" "$URL" "$DESCRIPTION"
  fi
  test -e "$FILE_PATH"
}

# Downloads to a temporary file first, so a failed request never replaces a usable cache
function download_file {
  local FILE_PATH="$1"
  local URL="$2"
  local DESCRIPTION="$3"

  >&2 echo " * Loading $DESCRIPTION"
  if curl -fs "$URL" -o "$FILE_PATH.tmp"; then
    mv "$FILE_PATH.tmp" "$FILE_PATH"
  else
    rm -f "$FILE_PATH.tmp"
    >&2 echo " * Failed to load $DESCRIPTION"
  fi
}

ORGS_JSON=$(curl -fsS https://altinncdn.no/orgs/altinn-orgs.json)
ORGS=$(jq -r '.orgs | keys[]' <<< "$ORGS_JSON")

for ORG in $ORGS; do
  for ENV_KEY in "${ENVIRONMENTS[@]}"; do
    get_deployments "$ORG" "$ENV_KEY" | while read -r line; do
      APP=$(echo "$line" | awk '{print $1}' | sed "s/^$ORG-//")
      VERSION=$(echo "$line" | awk '{print $2}')
      RELEASE=$(get_release "$ORG" "$APP" "$VERSION")
      REPO=$(echo "$RELEASE" | awk '{print $1}')
      COMMIT=$(echo "$RELEASE" | awk '{print $2}')

      FULL_KEY="$ORG-$ENV_KEY-$APP"
      TARGET_FOLDER="$TARGET/$FULL_KEY"

      if test -e "$TARGET_FOLDER/fetch-failed.txt"; then
        echo " * Unavailable: $ORG-$ENV_KEY-$APP"
      elif test -e "$TARGET_FOLDER"; then
        CURRENT_HEAD=$(cat "$TARGET_FOLDER/.git/HEAD")
        if [[ "$CURRENT_HEAD" == "$COMMIT" ]]; then
          echo " * Up-to-date: $ORG-$ENV_KEY-$APP = $VERSION ($COMMIT)"
        else
          echo " * Updating $ORG-$ENV_KEY-$APP = $VERSION ($COMMIT)"
          cd "$TARGET_FOLDER"
          git fetch -q origin
          set +e
          GIT_OUTPUT=$(git checkout -q "$COMMIT" 2>&1)
          GIT_STATUS=$?
          set -e
          if echo "$GIT_OUTPUT" | grep -q "fatal: unable to read tree"; then
            echo " * Unable to read tree for $COMMIT in $ORG-$ENV_KEY-$APP, falling back to latest default branch"
            FALLBACK_BRANCH=$(git remote show origin | grep 'HEAD branch' | awk '{print $NF}')
            git fetch -q origin
            git checkout -q "$FALLBACK_BRANCH"
            git reset -q --hard "origin/$FALLBACK_BRANCH"
          elif [[ $GIT_STATUS -ne 0 ]]; then
            echo "$GIT_OUTPUT" >&2
            exit $GIT_STATUS
          fi
        fi
      else
        echo " * Cloning $ORG-$ENV_KEY-$APP = $VERSION ($COMMIT)"
        set +e
        git clone -q "$REPO" "$TARGET_FOLDER"
        set -e
        if test -e "$TARGET_FOLDER"; then
          cd "$TARGET_FOLDER"
          set +e
          GIT_OUTPUT=$(git checkout -q "$COMMIT" 2>&1)
          GIT_STATUS=$?
          set -e
          if echo "$GIT_OUTPUT" | grep -q "fatal: unable to read tree"; then
            echo " * Unable to read tree for $COMMIT in $ORG-$ENV_KEY-$APP, falling back to latest default branch"
            FALLBACK_BRANCH=$(git remote show origin | grep 'HEAD branch' | awk '{print $NF}')
            git fetch -q origin
            git checkout -q "$FALLBACK_BRANCH"
            git reset -q --hard "origin/$FALLBACK_BRANCH"
          elif [[ $GIT_STATUS -ne 0 ]]; then
            echo "$GIT_OUTPUT" >&2
            exit $GIT_STATUS
          fi
        else
          mkdir -p "$TARGET_FOLDER"
          echo "Fetching this repo from $REPO failed. This file was placed here to prevent the script from trying again and again" > "$TARGET_FOLDER/fetch-failed.txt"
        fi
      fi
    done
  done
done
