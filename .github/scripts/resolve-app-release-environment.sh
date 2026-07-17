#!/usr/bin/env bash

set -euo pipefail

version="${1#v}"

if [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+-preview\.[0-9]+$ ]]; then
  echo dev
elif [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+-rc\.[0-9]+$ ]]; then
  echo staging
elif [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo prod
else
  echo "Unsupported app release version: $1" >&2
  exit 1
fi
