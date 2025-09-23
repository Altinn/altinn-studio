#!/usr/bin/env bash

set -e
set -u

SYNC_AZURE_CDN=no

while [[ $# -gt 0 ]]; do
  case $1 in
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

TARGET="$RUNNER_TEMP/sync-index-target"
AZURE_TARGET_URI="https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/app-frontend"
VERSION_REGEX="^[\d\.]+((?:-|.)[a-z0-9.\-]+)?$"

mkdir -p "$TARGET"

echo "Updating index.json"
azcopy ls "$AZURE_TARGET_URI/toolkits/" | \
  cut -d/ -f 1 | \
  grep --perl-regexp "$VERSION_REGEX" | \
  sort --version-sort | \
  uniq | \
  jq --raw-input --slurp 'split("\n") | map(select(. != ""))' > "$TARGET/index.json"

AZCOPY_OPTS=( --put-md5 --compare-hash=MD5 )
if [[ "$SYNC_AZURE_CDN" == "no" ]]; then
  echo "Publish to azure cdn will run with --dry-run (toggle with --azure-sync-cdn). No files will actually be synced"
  AZCOPY_OPTS+=( --dry-run )
else
  echo "Publishing index to azure cdn"
fi
azcopy sync "$TARGET/index.json" "$AZURE_TARGET_URI/toolkits/index.json" "${AZCOPY_OPTS[@]}"
if [[ "$SYNC_AZURE_CDN" == "yes" ]]; then
  bash ".github/scripts/purge-frontdoor-cache.sh" --path "/toolkits/altinn-app-frontend/index.json"
fi
