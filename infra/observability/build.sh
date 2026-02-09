#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "usage: $0 <runtime|studio> [output-dir] [--validate]" >&2
  echo "       $0 <runtime|studio> --output-dir <dir> [--validate]" >&2
}

overlay=${1:-}
if [[ -z "$overlay" ]]; then
  usage
  exit 2
fi
shift

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
output_dir=""
validate=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --validate)
      validate=true
      ;;
    -o|--output-dir)
      if [[ $# -lt 2 ]]; then
        echo "missing value for $1" >&2
        usage
        exit 2
      fi
      output_dir="$2"
      shift
      ;;
    *)
      if [[ -z "$output_dir" ]]; then
        output_dir="$1"
      else
        echo "unexpected argument: $1" >&2
        usage
        exit 2
      fi
      ;;
  esac
  shift
done

if [[ ! -d "$base_dir" ]]; then
  echo "base directory not found: $base_dir" >&2
  exit 1
fi

if [[ ! -d "$overlay_dir" ]]; then
  echo "overlay directory not found: $overlay_dir" >&2
  exit 1
fi

if [[ -z "$output_dir" ]]; then
  output_dir="$root_dir/dist/$overlay"
fi

if [[ "$validate" == "true" ]]; then
  if ! command -v kubectl >/dev/null 2>&1; then
    echo "kubectl not found; cannot validate kustomize output" >&2
    exit 1
  fi
  kubectl kustomize "$overlay_dir" >/dev/null
fi

if [[ -z "$output_dir" ]]; then
  echo "output directory is empty" >&2
  exit 1
fi

if [[ "$output_dir" != /* ]]; then
  echo "output directory must be an absolute path: $output_dir" >&2
  exit 1
fi

if [[ "$output_dir" == "/" ]]; then
  echo "refusing to use root as output directory" >&2
  exit 1
fi

if [[ "$output_dir" == "$root_dir" ]]; then
  echo "refusing to use repository root as output directory: $output_dir" >&2
  exit 1
fi

if [[ "$output_dir" != "$root_dir"/* ]]; then
  echo "output directory must be inside repository root: $output_dir" >&2
  exit 1
fi

if [[ "$output_dir" == *"/../"* || "$output_dir" == */.. || "$output_dir" == *"/./"* || "$output_dir" == */. ]]; then
  echo "output directory must not contain dot segments: $output_dir" >&2
  exit 1
fi

rm -rf "$output_dir"
mkdir -p "$output_dir"

cp -a "$base_dir" "$output_dir/base"
cp -a "$overlay_dir" "$output_dir/$overlay"
