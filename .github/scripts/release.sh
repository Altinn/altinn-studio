#!/usr/bin/env bash

set -e
set -u

while [[ $# -gt 0 ]]; do
  case $1 in
    --github-token)
      GITHUB_TOKEN="$2"
      shift # pop option
      shift # pop value
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

CURRENT_VERSION=$(git describe --abbrev=0 --tags 2>/dev/null)
CURRENT_VERSION_PARTS=(${CURRENT_VERSION//./ })
FIRST_PART=${CURRENT_VERSION_PARTS[0]:1}
SECOND_PART=${CURRENT_VERSION_PARTS[1]}
COMMIT_ID=$(git rev-parse HEAD~0)
YEAR="$(date +"%Y")"

echo "Git tag:       $CURRENT_VERSION"
echo "First part:    $FIRST_PART"
echo "Second part:   $SECOND_PART"
echo "Second part+1: $(($SECOND_PART+1))"
echo "Commit ID:     $COMMIT_ID"
echo "-------------------------------------"
echo "Year:          $YEAR"
echo "-------------------------------------"


# Ensure that the version starts from 0 when the year changes
if [[ "$YEAR" == "$FIRST_PART" ]]; then
  # Increment the second part of the version by 1
  NEW_VERSION="v${YEAR}.$(($SECOND_PART+1))"
else
  # New year - start from 0
  NEW_VERSION="v${YEAR}.0"
fi

echo "New version:   $NEW_VERSION"

echo "{\"tag_name\":\"$NEW_VERSION\",\"name\":\"${NEW_VERSION}\",\"draft\":true,\"prerelease\":false,\"generate_release_notes\":true}"


# TODO: Flip from draft to release when ready and tested.
curl -L \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/altinn/altinn-studio/releases \
  -d "{\"tag_name\":\"$NEW_VERSION\",\"name\":\"${NEW_VERSION}\",\"draft\":true,\"prerelease\":false,\"generate_release_notes\":true}"

