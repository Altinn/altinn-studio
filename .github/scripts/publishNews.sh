#!/usr/bin/env bash

set -e
set -u

COMMIT=no

while [[ $# -gt 0 ]]; do
  case $1 in
    --cdn)
      PATH_TO_CDN=$(realpath "$2")
      shift # pop option
      shift # pop value
      ;;
    --news)
      PATH_TO_NEWS=$(realpath "$2")
      shift # pop option
      shift # pop value
      ;;
    --news-schema)
      PATH_TO_NEWS_SCHEMA=$(realpath "$2")
      shift # pop option
      shift # pop value
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

TARGET_PATH=studio/designer/news
NEWS=news.nb.json
NEWS_SCHEMA=news.schema.json

<-- Need this? The vars comes from the workflow -->
if ! test -d "$PATH_TO_CDN" || ! test -d "$PATH_TO_CDN/$TARGET_PATH"; then
  echo "Unable to find $PATH_TO_CDN/$TARGET_PATH"
  echo "Make sure path to CDN has been passed with --cdn <path>"
  exit 1
fi
if ! test -d "$PATH_TO_NEWS" && ! test -d "$PATH_TO_NEWS_SCHEMA"; then
  echo "Unable to find $PATH_TO_NEWS or $PATH_TO_NEWS_SCHEMA"
  echo "Make sure path to news or news schema has been passed with --news <path> or --news-schema <path>"
  exit 1
fi

if test -d "$PATH_TO_NEWS" && test -d "$PATH_TO_NEWS_SCHEMA"; then
  echo "It is only possible to pass one of the arguments; --news or --news-schema"
  echo "Make sure path to news or news schema has been passed with --news <path> or --news-schema <path>, and not both"
  exit 1
fi
 
# Make two workflows? one for changes in news and another for changes in schema? 
SOURCE_TO_NEWS="$PATH_TO_NEWS"
SOURCE_TO_NEWS_SCHEMA="$PATH_TO_NEWS_SCHEMA"
TARGET="$PATH_TO_CDN/$TARGET_PATH"

echo "-------------------------------------"
echo "Source to news:        $SOURCE_TO_NEWS"
echo "Source to news schema:        $SOURCE_TO_NEWS_SCHEMA"
echo "Target:        $TARGET"
echo "Commit:        $COMMIT (toggle with --commit)"
echo "-------------------------------------"

AUTHOR_FULL=$(git log -1 | grep Author | sed 's/^Author: //')
AUTHOR_NAME="$(echo "$AUTHOR_FULL" | sed -r 's/<.*//')"
AUTHOR_EMAIL="$(echo "$AUTHOR_FULL" | sed -r 's/^.*?<//' | sed 's/>//')"
COMMIT_ID=$(git rev-parse HEAD~0)

echo "Latest author: $AUTHOR_FULL"
echo "Author name:   $AUTHOR_NAME"
echo "Author email:  $AUTHOR_EMAIL"
echo "Commit ID:     $COMMIT_ID"
echo "-------------------------------------"

COMMIT_FILE=$(mktemp --suffix=-cdn-commit)
{
  echo "$AUTHOR_FULL updated studio news"
  echo "based on commit https://github.com/Altinn/altinn-studio/commit/$COMMIT_ID"
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

# Adding both files even though news.nb.json is the only one being changed in most cases.
# This is because "git add ." will only add the changed files anyway.
echo " * Copying news"
test -e "$TARGET/$NEWS" && git rm -r "$TARGET/$NEWS"
mkdir -p "$TARGET"
cp -fr SOURCE_TO_NEWS "$TARGET/$NEWS"


echo " * Copying news schema"
test -e "$TARGET/$NEWS_SCHEMA" && git rm -r "$TARGET/$NEWS_SCHEMA"
mkdir -p "$TARGET"
cp -fr SOURCE_TO_NEWS_SCHEMA "$TARGET/$NEWS_SCHEMA"


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
