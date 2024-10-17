#!/usr/bin/env bash

set -e
set -u

COMMIT=no
SYNC_AZURE_CDN=no

while [[ $# -gt 0 ]]; do
  case $1 in
    --tag)
      REVERT_TAG="$2"
      shift #pop option
      shift # pop option
      ;;
    --actor)
      GITHUB_ACTOR="$2"
      shift #pop option
      shift # pop option
      ;;
    --actor_id)
      GITHUB_ACTOR_ID="$2"
      shift #pop option
      shift # pop option
      ;;
    --frontend)
      PATH_TO_FRONTEND=$(realpath "$2")
      shift # pop option
      shift # pop value
      ;;
    --cdn)
      PATH_TO_CDN=$(realpath "$2")
      shift # pop option
      shift # pop value
      ;;
    --commit)
      COMMIT=yes
      shift # pop option
      ;;
    --azure-sa-name)
      AZURE_STORAGE_ACCOUNT_NAME="$2"
      shift # pop option
      shift # pop option
      ;;
    --azure-sa-token)
      AZURE_STORAGE_ACCOUNT_TOKEN="$2"
      shift # pop option
      shift # pop option
      ;;
    --azure-sync-cdn )
      SYNC_AZURE_CDN=yes
      shift #pop option
      ;;
    -*|--*)
      echo "Unknown option $1"
      exit 1
      ;;
    *)
      echo "Unknown argument $1"
      exit 1
      ;;
  esac
done

TARGET=toolkits/altinn-app-frontend
AZURE_TARGET_URI="https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/app-frontend"

if ! test -d "$PATH_TO_CDN" || ! test -d "$PATH_TO_CDN/$TARGET"; then
  echo "Unable to find $PATH_TO_CDN/$TARGET"
  echo "Make sure path to CDN has been passed with --cdn <path>"
  exit 1
fi

TARGET="$PATH_TO_CDN/$TARGET"

echo "-------------------------------------"
echo "Commit:        $COMMIT (toggle with --commit)"
echo "Version tag:   $REVERT_TAG"
echo "Actor:         $GITHUB_ACTOR ($GITHUB_ACTOR_ID)"

REVERT_TAG_PARTS=(${REVERT_TAG//./ })
APP_FULL=${REVERT_TAG:1}
APP_MAJOR=${REVERT_TAG_PARTS[0]:1}
APP_MAJOR_MINOR=${REVERT_TAG_PARTS[0]:1}.${REVERT_TAG_PARTS[1]}

echo "-------------------------------------"
echo "Full version:  $APP_FULL"
echo "Major version: $APP_MAJOR"
echo "Major + minor: $APP_MAJOR_MINOR"
echo "-------------------------------------"

if ! [[ "$REVERT_TAG" =~ ^v ]]; then
  echo "Error: Expected git tag to start with v"
  exit 1
fi

VERSION_REGEX="^[\d\.]+(-[a-z0-9.]+)?$"
if ! echo "$APP_FULL" | grep --quiet --perl-regexp "$VERSION_REGEX"; then
  echo "Error: Broken/unexpected version number: $APP_FULL"
  exit 1
fi

COMMIT_MESSAGE="Revert altinn-app-frontend to $REVERT_TAG"

echo "CDN commit message:"
echo
echo "$COMMIT_MESSAGE"
echo "-------------------------------------"
echo "Files to be copied:"
echo
ls -1 "$TARGET/$APP_FULL"
echo "-------------------------------------"
echo "Log:"
echo

# Needed in order for git commands to work
cd "$TARGET"

echo " * Copying Major version"
test -e "$TARGET/$APP_MAJOR" && git rm -r "$TARGET/$APP_MAJOR"
mkdir -p "$TARGET/$APP_MAJOR"
cp -fr "$TARGET/$APP_FULL/." "$TARGET/$APP_MAJOR"
echo " * Copying Minor version"
test -e "$TARGET/$APP_MAJOR_MINOR" && git rm -r "$TARGET/$APP_MAJOR_MINOR"
mkdir -p "$TARGET/$APP_MAJOR_MINOR"
cp -fr "$TARGET/$APP_FULL/." "$TARGET/$APP_MAJOR_MINOR"

cd ../..

echo " * Staged for commit:"
git add .
git status --short

if [[ "$COMMIT" == "yes" ]]; then
  echo " * Committing changes"
  git -c user.email="$GITHUB_ACTOR_ID+$GITHUB_ACTOR@users.noreply.github.com" -c user.name="$GITHUB_ACTOR" commit -m "$COMMIT_MESSAGE"
else
    echo " * Skipping commit (toggle with --commit)"
fi

echo "-------------------------------------"
if [[ -z "$AZURE_STORAGE_ACCOUNT_NAME" ]]; then
  echo "Skipping publish to azure cdn. As --azure-sa-name flag not defined"
else
  if [[ -d "$AZURE_STORAGE_ACCOUNT_NAME" ]]; then
    echo
    echo "azure-sa-name seems to be a local directory. Simulating azcopy sync with rsync to folder"
    echo
    toolkits_rsync_opts=( -am --include='*/' --include="${APP_MAJOR}/*" --include="${APP_MAJOR_MINOR}/*" --exclude='*' )
    set -x
    rsync "${toolkits_rsync_opts[@]}" $TARGET $AZURE_STORAGE_ACCOUNT_NAME
    set +x
    echo "-------------------------------------"
  else
    AZCOPY_INCLUDE_REGEX="^$APP_MAJOR/.*|^$APP_MAJOR_MINOR/.*"
    AZCOPY_TOOLKITS_OPTS=( --include-regex="${AZCOPY_INCLUDE_REGEX}" )
    AZCOPY_ADDITIONAL_OPTS=( --put-md5 --compare-hash=MD5 --delete-destination=true )
    if [[ "$SYNC_AZURE_CDN" == "no" ]]; then
      echo "Publish to azure cdn will run with --dry-run (toggle with --azure-sync-cdn). No files will actually be synced"
      AZCOPY_ADDITIONAL_OPTS+=( --dry-run )
    else
      echo "Publishing files to azure cdn"
    fi
    azcopy sync "$TARGET" "$AZURE_TARGET_URI/toolkits${AZURE_STORAGE_ACCOUNT_TOKEN}" "${AZCOPY_TOOLKITS_OPTS[@]}" "${AZCOPY_ADDITIONAL_OPTS[@]}"
    echo "-------------------------------------"
    if [[ "$SYNC_AZURE_CDN" != "no" ]]; then
      AFD_PATH_PREFIX="/toolkits/altinn-app-frontend"
      AFD_PATHS=( --path "$AFD_PATH_PREFIX/$APP_MAJOR/*" --path "$AFD_PATH_PREFIX/$APP_MAJOR_MINOR/*" )
      bash "$PATH_TO_FRONTEND/.github/scripts/purge-frontdoor-cache.sh" "${AFD_PATHS[@]}"
      echo "-------------------------------------"
    fi
  fi
fi
