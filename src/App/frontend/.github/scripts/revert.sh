#!/usr/bin/env bash

set -e
set -u

SYNC_AZURE_CDN=no

while [[ $# -gt 0 ]]; do
  case $1 in
    --tag)
      REVERT_TAG="$2"
      shift #pop option
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

AZURE_TARGET_URI="https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/app-frontend"

REVERT_TAG_PARTS=(${REVERT_TAG//./ })
APP_FULL=${REVERT_TAG:1}
APP_MAJOR=${REVERT_TAG_PARTS[0]:1}
APP_MAJOR_MINOR=${REVERT_TAG_PARTS[0]:1}.${REVERT_TAG_PARTS[1]}

echo "-------------------------------------"
echo "Version tag:   $REVERT_TAG"
echo "Full version:  $APP_FULL"
echo "Major version: $APP_MAJOR"
echo "Major + minor: $APP_MAJOR_MINOR"
echo "-------------------------------------"

if ! [[ "$REVERT_TAG" =~ ^v ]]; then
  echo "Error: Expected git tag to start with v"
  exit 1
fi

VERSION_REGEX="^[\d\.]+((?:-|.)[a-z0-9.\-]+)?$"
if ! echo "$APP_FULL" | grep --quiet --perl-regexp "$VERSION_REGEX"; then
  echo "Error: Broken/unexpected version number: $APP_FULL"
  exit 1
fi

echo "-------------------------------------"
if [[ -z "$AZURE_STORAGE_ACCOUNT_NAME" ]]; then
  echo "Skipping publish to azure cdn. As --azure-sa-name flag not defined"
else
  AZCOPY_OPTS=( --put-md5 --compare-hash=MD5 --recursive=true --delete-destination=true )
  if [[ "$SYNC_AZURE_CDN" == "no" ]]; then
    echo "Publish to azure cdn will run with --dry-run (toggle with --azure-sync-cdn). No files will actually be synced"
    AZCOPY_OPTS+=( --dry-run )
  else
    echo "Publishing files to azure cdn"
  fi
  azcopy sync "$AZURE_TARGET_URI/toolkits/$APP_FULL/" "$AZURE_TARGET_URI/toolkits/$APP_MAJOR/" "${AZCOPY_OPTS[@]}"
  azcopy sync "$AZURE_TARGET_URI/toolkits/$APP_FULL/" "$AZURE_TARGET_URI/toolkits/$APP_MAJOR_MINOR/" "${AZCOPY_OPTS[@]}"
  echo "-------------------------------------"
  if [[ "$SYNC_AZURE_CDN" != "no" ]]; then
    bash ".github/scripts/purge-frontdoor-cache.sh" --path "/toolkits/altinn-app-frontend/$APP_MAJOR/*" --path "/toolkits/altinn-app-frontend/$APP_MAJOR_MINOR/*"
    echo "-------------------------------------"
  fi
fi
