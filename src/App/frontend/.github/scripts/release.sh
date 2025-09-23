#!/usr/bin/env bash

set -e
set -u

PRE_RELEASE=no
SYNC_AZURE_CDN=no

while [[ $# -gt 0 ]]; do
  case $1 in
    --pre-release)
      PRE_RELEASE=yes
      shift # pop option
      ;;
    --azure-sa-name)
      AZURE_STORAGE_ACCOUNT_NAME="$2"
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

SOURCE=dist
TARGET="$RUNNER_TEMP/release-target"
AZURE_TARGET_URI="https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/app-frontend"

if ! test -d "$SOURCE"; then
  echo "Unable to find $SOURCE (did you run yarn build first?)"
  exit 1
fi

echo "-------------------------------------"
echo "Source:        $SOURCE"
echo "Target:        $TARGET"
echo "Pre-release:   $PRE_RELEASE (toggle with --pre-release)"
echo "-------------------------------------"

CURRENT_VERSION=$(git describe --abbrev=0 --tags 2>/dev/null)
CURRENT_VERSION_PARTS=(${CURRENT_VERSION//./ })
APP_FULL=${CURRENT_VERSION:1}
APP_MAJOR=${CURRENT_VERSION_PARTS[0]:1}
APP_MAJOR_MINOR=${CURRENT_VERSION_PARTS[0]:1}.${CURRENT_VERSION_PARTS[1]}

echo "Git tag:       '$CURRENT_VERSION'"
echo "Full version:  '$APP_FULL'"
echo "Major version: '$APP_MAJOR'"
echo "Major + minor: '$APP_MAJOR_MINOR'"
echo "-------------------------------------"

if ! [[ "$CURRENT_VERSION" =~ ^v ]]; then
  echo "Error: Expected git tag to start with v"
  exit 1
fi

VERSION_REGEX="^[\d\.]+((?:-|.)[a-z0-9.\-]+)?$"
if ! echo "$APP_FULL" | grep --quiet --perl-regexp "$VERSION_REGEX"; then
  echo "Error: Broken/unexpected version number: $APP_FULL"
  exit 1
fi

echo "Files to be copied:"
echo
ls -1 $SOURCE/*
echo "-------------------------------------"
echo "Log:"
echo

if [[ "$PRE_RELEASE" == "no" ]]; then
    echo " * Copying Major version"
    mkdir -p "$TARGET/$APP_MAJOR"
    cp -fr $SOURCE/* "$TARGET/$APP_MAJOR/"
    echo " * Copying Minor version"
    mkdir -p "$TARGET/$APP_MAJOR_MINOR"
    cp -fr $SOURCE/* "$TARGET/$APP_MAJOR_MINOR/"
else
    echo " * Copying Major version (skipped using --pre-release)"
    echo " * Copying Minor version (skipped using --pre-release)"
fi

echo " * Copying Patch version"
mkdir -p "$TARGET/$APP_FULL"
cp -fr $SOURCE/* "$TARGET/$APP_FULL/"

echo "-------------------------------------"
if [[ -z "$AZURE_STORAGE_ACCOUNT_NAME" ]]; then
  echo "Skipping publish to azure cdn. As --azure-sa-name flag not defined"
else
  if [[ -d "$AZURE_STORAGE_ACCOUNT_NAME" ]]; then
    echo
    echo "azure-sa-name seems to be a local directory. Simulating azcopy sync with rsync to folder"
    echo
    toolkits_rsync_opts=( -am --include='*/' --include="${APP_FULL}/*" )
    if [[ "$PRE_RELEASE" == "no" ]]; then
      toolkits_rsync_opts+=( --include="${APP_MAJOR}/*" --include="${APP_MAJOR_MINOR}/*" )
    fi
    toolkits_rsync_opts+=( --exclude='*' )
    set -x
    rsync "${toolkits_rsync_opts[@]}" $TARGET $AZURE_STORAGE_ACCOUNT_NAME
    set +x
    echo "-------------------------------------"
  else
    AZCOPY_INCLUDE_REGEX="^$APP_FULL/.*"
    if [[ "$PRE_RELEASE" == "no" ]]; then
      AZCOPY_INCLUDE_REGEX+="|^$APP_MAJOR/.*|^$APP_MAJOR_MINOR/.*"
    fi
    AZCOPY_TOOLKITS_OPTS=( --include-regex="${AZCOPY_INCLUDE_REGEX}" )
    AZCOPY_ADDITIONAL_OPTS=( --put-md5 --compare-hash=MD5 --delete-destination=true )
    if [[ "$SYNC_AZURE_CDN" == "no" ]]; then
      echo "Publish to azure cdn will run with --dry-run (toggle with --azure-sync-cdn). No files will actually be synced"
      AZCOPY_ADDITIONAL_OPTS+=( --dry-run )
    else
      echo "Publishing files to azure cdn"
    fi
    azcopy sync "$TARGET" "$AZURE_TARGET_URI/toolkits" "${AZCOPY_TOOLKITS_OPTS[@]}" "${AZCOPY_ADDITIONAL_OPTS[@]}"
    echo "-------------------------------------"
    if [[ "$SYNC_AZURE_CDN" == "yes" && "$PRE_RELEASE" == "no" ]]; then
      bash ".github/scripts/purge-frontdoor-cache.sh" --path "/toolkits/altinn-app-frontend/$APP_MAJOR/*" --path "/toolkits/altinn-app-frontend/$APP_MAJOR_MINOR/*"
      echo "-------------------------------------"
    fi
  fi
fi
