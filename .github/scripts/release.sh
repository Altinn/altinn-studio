#!/usr/bin/env bash

set -e
set -u

PRE_RELEASE=no
COMMIT=no

while [[ $# -gt 0 ]]; do
  case $1 in
    --cdn)
      PATH_TO_CDN=$(realpath "$2")
      shift # pop option
      shift # pop value
      ;;
    --frontend)
      PATH_TO_FRONTEND=$(realpath "$2")
      shift # pop option
      shift # pop value
      ;;
    --pre-release)
      PRE_RELEASE=yes
      shift # pop option
      ;;
    --commit)
      COMMIT=yes
      shift # pop option
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

SOURCE=src/altinn-app-frontend/dist
TARGET=toolkits/altinn-app-frontend

if ! test -d "$PATH_TO_CDN" || ! test -d "$PATH_TO_CDN/$TARGET"; then
  echo "Unable to find $PATH_TO_CDN/$TARGET"
  echo "Make sure path to CDN has been passed with --cdn <path>"
  exit 1
fi
if ! test -d "$PATH_TO_FRONTEND" || ! test -d "$PATH_TO_FRONTEND/$SOURCE"; then
  echo "Unable to find $PATH_TO_FRONTEND/$SOURCE (did you run yarn build first?)"
  echo "Make sure path to CDN has been passed with --frontend <path>"
  exit 1
fi

SOURCE_SCHEMAS="$PATH_TO_FRONTEND/schemas"
TARGET_SCHEMAS="$PATH_TO_CDN/schemas"

SOURCE="$PATH_TO_FRONTEND/$SOURCE"
TARGET="$PATH_TO_CDN/$TARGET"

echo "-------------------------------------"
echo "Source:        $SOURCE"
echo "Target:        $TARGET"
echo "Pre-release:   $PRE_RELEASE (toggle with --pre-release)"
echo "Commit:        $COMMIT (toggle with --commit)"
echo "-------------------------------------"

CURRENT_VERSION=$(git describe --abbrev=0 --tags 2>/dev/null)
CURRENT_VERSION_PARTS=(${CURRENT_VERSION//./ })
APP_FULL=${CURRENT_VERSION:1}
APP_MAJOR=${CURRENT_VERSION_PARTS[0]:1}
APP_MAJOR_MINOR=${CURRENT_VERSION_PARTS[0]:1}.${CURRENT_VERSION_PARTS[1]}
AUTHOR_FULL=$(git log -1 | grep Author | sed 's/^Author: //')
AUTHOR_NAME="$(echo "$AUTHOR_FULL" | sed -r 's/<.*//')"
AUTHOR_EMAIL="$(echo "$AUTHOR_FULL" | sed -r 's/^.*?<//' | sed 's/>//')"
COMMIT_ID=$(git rev-parse HEAD~0)

echo "Full version:  $APP_FULL"
echo "Major version: $APP_MAJOR"
echo "Major + minor: $APP_MAJOR_MINOR"
echo "Latest author: $AUTHOR_FULL"
echo "Author name:   $AUTHOR_NAME"
echo "Author email:  $AUTHOR_EMAIL"
echo "Commit ID:     $COMMIT_ID"
echo "-------------------------------------"

COMMIT_FILE=$(mktemp --suffix=-cdn-commit)
{
  echo "$AUTHOR_FULL updated altinn-app-frontend to $APP_FULL"
  echo "based on commit https://github.com/Altinn/app-frontend-react/commit/$COMMIT_ID"
  git log -1 | grep -Ev "commit|Author|Date"
} >> "$COMMIT_FILE"

echo "CDN commit message:"
echo
cat "$COMMIT_FILE"
echo "-------------------------------------"
echo "Files to be copied:"
echo
ls -1 $SOURCE/*
echo "-------------------------------------"
echo "Log:"
echo

# Needed in order for git commands to work
cd "$TARGET"

if [[ "$PRE_RELEASE" == "no" ]]; then
    echo " * Copying Major version"
    test -e "$TARGET/$APP_MAJOR" && git rm -r "$TARGET/$APP_MAJOR"
    mkdir -p "$TARGET/$APP_MAJOR"
    cp -fr $SOURCE/* "$TARGET/$APP_MAJOR/"
    echo " * Copying Minor version"
    test -e "$TARGET/$APP_MAJOR_MINOR" && git rm -r "$TARGET/$APP_MAJOR_MINOR"
    mkdir -p "$TARGET/$APP_MAJOR_MINOR"
    cp -fr $SOURCE/* "$TARGET/$APP_MAJOR_MINOR/"

    echo " * Copying schemas"
    cp -prv $SOURCE_SCHEMAS/* "$TARGET_SCHEMAS/"
else
    echo " * Copying Major version (skipped using --pre-release)"
    echo " * Copying Minor version (skipped using --pre-release)"
    echo " * Copying schemas (skipped using --pre-release)"
fi

echo " * Copying Patch version"
test -e "$TARGET/$APP_FULL" && git rm -r "$TARGET/$APP_FULL"
mkdir -p "$TARGET/$APP_FULL"
cp -fr $SOURCE/* "$TARGET/$APP_FULL/"

echo " * Updating index.json"
ls -1 | \
  grep --perl-regexp '^[\d\.]+(-[a-z0-9.]+)?$' | \
  sort --version-sort | \
  jq --raw-input --slurp 'split("\n") | map(select(. != ""))' > index.json

cd ../..

echo " * Staged for commit:"
git add .
git status --short

if [[ "$COMMIT" == "yes" ]]; then
  echo " * Committing changes"
  git -c user.email="$AUTHOR_EMAIL" -c user.name="$AUTHOR_NAME" commit -F "$COMMIT_FILE"
else
    echo " * Skipping commit (toggle with --commit)"
fi

echo "-------------------------------------"
