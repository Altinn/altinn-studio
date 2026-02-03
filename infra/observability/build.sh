#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "usage: $0 <runtime|studio> [output-dir]" >&2
}

overlay=${1:-}
if [[ -z "$overlay" ]]; then
  usage
  exit 2
fi

case "$overlay" in
  runtime|studio)
    ;;
  *)
    echo "unknown overlay: $overlay" >&2
    usage
    exit 2
    ;;
esac

root_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
base_dir="$root_dir/base"
overlay_dir="$root_dir/$overlay"

if [[ ! -d "$base_dir" ]]; then
  echo "base directory not found: $base_dir" >&2
  exit 1
fi

if [[ ! -d "$overlay_dir" ]]; then
  echo "overlay directory not found: $overlay_dir" >&2
  exit 1
fi

output_dir=${2:-"$root_dir/dist/$overlay"}
rm -rf "$output_dir"
mkdir -p "$output_dir"

cp -a "$base_dir" "$output_dir/base"
cp -a "$overlay_dir" "$output_dir/$overlay"
