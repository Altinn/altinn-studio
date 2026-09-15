#!/bin/sh
# Changelog tooling for the experimental Agent platform.
#
# One changelog, src/experimental/CHANGELOG.md, covers the whole stack: the `agentctl` and `agentd`
# binaries published by the `experimental-agent/v*` tag, and the Agent images they work with. It
# follows Keep a Changelog 1.1.0 and Semantic Versioning 2.0.0. The script has no dependencies
# beyond a POSIX shell, coreutils, awk and git.
#
# Usage:
#   changelog.sh validate [path]
#       Check the changelog's structure. Fails unless the file starts with the Keep a Changelog
#       header, has exactly one `## [Unreleased]` section as its first version heading, writes
#       every released section as `## [X.Y.Z] - YYYY-MM-DD` in descending Semantic Versioning
#       order, uses only the sections Added, Changed, Fixed, Removed, Security and Deprecated in
#       that order within a version, leaves no `###` section empty, and writes every entry as a
#       `- ` bullet (continuation lines are indented by at least two spaces).
#
#   changelog.sh extract <version> [path]
#       Print the body of one released version's section, without its heading, to standard output.
#       The version may be written with or without a leading `v`. Exits non-zero when the section
#       is missing, has no release date, or has no content. Used by the release workflow to build
#       the GitHub release notes.
#
#   changelog.sh check-unreleased <base-ref> <head-ref> [path]
#       Compare the `## [Unreleased]` section between two Git references and exit non-zero when it
#       is unchanged. A file that does not exist at the base reference counts as changed. Used by
#       the pull request workflow; a pull request with no user-visible change carries the
#       `skip-changelog` label instead.
#
# `path` defaults to CHANGELOG.md beside this script.

set -eu

SCRIPT_NAME="$(basename "$0")"
SCRIPT_DIRECTORY="$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)"
DEFAULT_CHANGELOG="${SCRIPT_DIRECTORY}/CHANGELOG.md"

# Semantic Versioning 2.0.0, without build metadata: the core numbers carry no leading zeroes, and a
# prerelease is a dot-separated list of identifiers that are alphanumeric or numeric without leading
# zeroes. Written out because a version that cannot be compared must not be accepted as a heading.
SEMVER_NUMBER='(0|[1-9][0-9]*)'
SEMVER_IDENTIFIER='([0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*|0|[1-9][0-9]*)'
SEMVER_PATTERN="${SEMVER_NUMBER}[.]${SEMVER_NUMBER}[.]${SEMVER_NUMBER}(-${SEMVER_IDENTIFIER}([.]${SEMVER_IDENTIFIER})*)?"

fail() {
  printf '%s: %s\n' "${SCRIPT_NAME}" "$1" >&2
  exit 1
}

usage() {
  cat >&2 <<USAGE
Usage:
  ${SCRIPT_NAME} validate [path]
  ${SCRIPT_NAME} extract <version> [path]
  ${SCRIPT_NAME} check-unreleased <base-ref> <head-ref> [path]
USAGE
  exit 2
}

require_file() {
  [ -f "$1" ] || fail "changelog not found: $1"
}

# Print the path of a file as Git records it, so `git show <ref>:<path>` can resolve it from
# anywhere inside the working tree.
repository_path() {
  directory="$(CDPATH='' cd -- "$(dirname -- "$1")" && pwd)"
  prefix="$(git -C "${directory}" rev-parse --show-prefix)" ||
    fail "not inside a Git repository: $1"
  printf '%s%s\n' "${prefix}" "$(basename -- "$1")"
}

# Compare two dot-separated prerelease strings. Prints -1, 0 or 1.
compare_prerelease() {
  left_rest="$1"
  right_rest="$2"
  while :; do
    # Prerelease identifiers are never empty, so an empty remainder means the string ended.
    if [ -z "${left_rest}" ] && [ -z "${right_rest}" ]; then
      printf '%s\n' 0
      return 0
    fi
    if [ -z "${left_rest}" ]; then
      printf '%s\n' -1
      return 0
    fi
    if [ -z "${right_rest}" ]; then
      printf '%s\n' 1
      return 0
    fi
    left="${left_rest%%.*}"
    right="${right_rest%%.*}"
    case "${left_rest}" in *.*) left_rest="${left_rest#*.}" ;; *) left_rest='' ;; esac
    case "${right_rest}" in *.*) right_rest="${right_rest#*.}" ;; *) right_rest='' ;; esac
    left_numeric=no
    right_numeric=no
    case "${left}" in '' | *[!0-9]*) ;; *) left_numeric=yes ;; esac
    case "${right}" in '' | *[!0-9]*) ;; *) right_numeric=yes ;; esac
    if [ "${left_numeric}" = yes ] && [ "${right_numeric}" = yes ]; then
      if [ "${left}" -gt "${right}" ]; then
        printf '%s\n' 1
        return 0
      fi
      if [ "${left}" -lt "${right}" ]; then
        printf '%s\n' -1
        return 0
      fi
    elif [ "${left_numeric}" = yes ]; then
      # Numeric identifiers always have lower precedence than alphanumeric ones.
      printf '%s\n' -1
      return 0
    elif [ "${right_numeric}" = yes ]; then
      printf '%s\n' 1
      return 0
    elif [ "${left}" != "${right}" ]; then
      lower="$(printf '%s\n%s\n' "${left}" "${right}" | LC_ALL=C sort | head -n 1)"
      if [ "${lower}" = "${left}" ]; then
        printf '%s\n' -1
      else
        printf '%s\n' 1
      fi
      return 0
    fi
  done
}

# Compare two Semantic Versioning 2.0.0 versions. Prints -1, 0 or 1.
compare_versions() {
  left_core="${1%%-*}"
  right_core="${2%%-*}"
  case "$1" in *-*) left_prerelease="${1#*-}" ;; *) left_prerelease='' ;; esac
  case "$2" in *-*) right_prerelease="${2#*-}" ;; *) right_prerelease='' ;; esac
  field=1
  while [ "${field}" -le 3 ]; do
    left="$(printf '%s' "${left_core}" | cut -d. -f"${field}")"
    right="$(printf '%s' "${right_core}" | cut -d. -f"${field}")"
    if [ "${left}" -gt "${right}" ]; then
      printf '%s\n' 1
      return 0
    fi
    if [ "${left}" -lt "${right}" ]; then
      printf '%s\n' -1
      return 0
    fi
    field=$((field + 1))
  done
  if [ -z "${left_prerelease}" ] && [ -z "${right_prerelease}" ]; then
    printf '%s\n' 0
    return 0
  fi
  # A version with a prerelease has lower precedence than the same version without one.
  if [ -z "${left_prerelease}" ]; then
    printf '%s\n' 1
    return 0
  fi
  if [ -z "${right_prerelease}" ]; then
    printf '%s\n' -1
    return 0
  fi
  compare_prerelease "${left_prerelease}" "${right_prerelease}"
}

# Check everything that can be checked one line at a time, and print the released versions in the
# order they appear so the caller can check their ordering.
validate_structure() {
  awk -v label="$2" -v semver="${SEMVER_PATTERN}" '
    BEGIN {
      count = split("Added Changed Fixed Removed Security Deprecated", allowed, " ")
      for (index_ = 1; index_ <= count; index_++) rank[allowed[index_]] = index_
      order = "Added, Changed, Fixed, Removed, Security, Deprecated"
      version_heading = "^## \\[" semver "\\] - [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]$"
    }

    function problem(message) {
      printf "%s:%d: %s\n", label, NR, message > "/dev/stderr"
      failures++
    }

    function close_section() {
      if (section != "" && entries == 0) {
        printf "%s:%d: section \"### %s\" is empty\n", label, section_line, section > "/dev/stderr"
        failures++
      }
      section = ""
      entries = 0
    }

    NR == 1 {
      if ($0 != "# Changelog") problem("the first line must be \"# Changelog\"")
    }

    /keepachangelog\.com\/en\/1\.1\.0/ { keep_a_changelog = 1 }
    /semver\.org\/spec\/v2\.0\.0\.html/ { semantic_versioning = 1 }

    /^# / && NR > 1 { problem("only the first line may be a level 1 heading"); next }

    /^## / {
      close_section()
      if ($0 == "## [Unreleased]") {
        unreleased++
        if (unreleased > 1) problem("there must be exactly one \"## [Unreleased]\" section")
        if (headings > 0) problem("\"## [Unreleased]\" must be the first version section")
      } else if ($0 ~ version_heading) {
        if (unreleased == 0) problem("\"## [Unreleased]\" must be the first version section")
        version = $0
        sub(/^## \[/, "", version)
        sub(/\].*$/, "", version)
        if (version in seen) problem("duplicate section for version " version)
        seen[version] = 1
        print version
      } else {
        problem("expected \"## [Unreleased]\" or \"## [X.Y.Z] - YYYY-MM-DD\", found: " $0)
      }
      headings++
      highest = 0
      next
    }

    /^### / {
      close_section()
      if (headings == 0) { problem("\"" $0 "\" appears before any version section"); next }
      name = substr($0, 5)
      if (!(name in rank)) {
        problem("unknown section \"### " name "\"; allowed sections are " order)
        next
      }
      if (rank[name] <= highest) problem("\"### " name "\" is out of order; sections must appear as " order)
      highest = rank[name]
      section = name
      section_line = NR
      next
    }

    /^#### / { problem("headings deeper than \"###\" are not used in this changelog"); next }

    {
      if ($0 ~ /^[ \t]*$/) next
      if (headings == 0) next      # introduction above the first version section
      if (section == "") { problem("content must sit under a \"###\" section: " $0); next }
      if ($0 ~ /^- ./) { entries++; next }
      if ($0 ~ /^  +[^ ]/ && entries > 0) next   # continuation of the preceding bullet
      problem("every entry must be a \"- \" bullet: " $0)
    }

    END {
      close_section()
      if (!keep_a_changelog) {
        printf "%s: the header must link to Keep a Changelog 1.1.0\n", label > "/dev/stderr"
        failures++
      }
      if (!semantic_versioning) {
        printf "%s: the header must link to Semantic Versioning 2.0.0\n", label > "/dev/stderr"
        failures++
      }
      if (unreleased == 0) {
        printf "%s: an \"## [Unreleased]\" section is required\n", label > "/dev/stderr"
        failures++
      }
      if (failures > 0) exit 1
    }
  ' "$1"
}

command_validate() {
  path="${1:-${DEFAULT_CHANGELOG}}"
  require_file "${path}"
  label="$(basename -- "${path}")"
  versions="$(validate_structure "${path}" "${label}")" ||
    fail "${path} is not a valid changelog"
  previous=''
  while IFS= read -r version; do
    [ -n "${version}" ] || continue
    if [ -n "${previous}" ] && [ "$(compare_versions "${previous}" "${version}")" != 1 ]; then
      fail "${path}: released sections must be in descending order, but ${previous} is listed above ${version}"
    fi
    previous="${version}"
  done <<VERSIONS
${versions}
VERSIONS
  printf '%s is a valid changelog\n' "${path}"
}

# Print one section's body. Exits 3 when the section is missing, 4 when a released section has no
# date, and 5 when the section has no content.
section_body() {
  awk -v version="$2" -v dated="$3" '
    $0 ~ /^## / {
      capture = 0
      if (index($0, "## [" version "]") == 1) {
        found = 1
        if (dated == "no") { capture = 1 }
        else if ($0 ~ /^## \[[^]]+\] - [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]$/) { capture = 1; has_date = 1 }
      }
      next
    }
    capture { body[++count] = $0 }
    END {
      if (!found) exit 3
      if (dated == "yes" && !has_date) exit 4
      first = 1
      while (first <= count && body[first] ~ /^[ \t]*$/) first++
      last = count
      while (last >= first && body[last] ~ /^[ \t]*$/) last--
      if (first > last) exit 5
      for (index_ = first; index_ <= last; index_++) print body[index_]
    }
  ' "$1"
}

command_extract() {
  [ $# -ge 1 ] || usage
  version="${1#v}"
  path="${2:-${DEFAULT_CHANGELOG}}"
  require_file "${path}"
  status=0
  section_body "${path}" "${version}" yes || status=$?
  case "${status}" in
  0) ;;
  3) fail "${path} has no section for version ${version}" ;;
  4) fail "${path}: the section for version ${version} has no release date; write it as \"## [${version}] - YYYY-MM-DD\"" ;;
  5) fail "${path}: the section for version ${version} is empty" ;;
  *) fail "${path}: could not read the section for version ${version}" ;;
  esac
}

unreleased_at_reference() {
  directory="$1"
  reference="$2"
  tracked="$3"
  content="$(mktemp)"
  if ! git -C "${directory}" show "${reference}:${tracked}" >"${content}" 2>/dev/null; then
    rm -f "${content}"
    return 1
  fi
  status=0
  section_body "${content}" Unreleased no || status=$?
  rm -f "${content}"
  # Exit 3 (missing) and 5 (empty) both mean "nothing recorded", which compares as empty.
  case "${status}" in
  0 | 3 | 5) return 0 ;;
  *) return 1 ;;
  esac
}

command_check_unreleased() {
  [ $# -ge 2 ] || usage
  base="$1"
  head="$2"
  path="${3:-${DEFAULT_CHANGELOG}}"
  # Every Git call runs inside the checkout that holds the changelog, so the subcommand works
  # from any working directory.
  directory="$(CDPATH='' cd -- "$(dirname -- "${path}")" && pwd)" ||
    fail "changelog directory not found: $(dirname -- "${path}")"
  tracked="$(repository_path "${path}")"
  if ! base_body="$(unreleased_at_reference "${directory}" "${base}" "${tracked}")"; then
    printf 'No %s at %s; treating the Unreleased section as changed.\n' "${tracked}" "${base}"
    return 0
  fi
  head_body="$(unreleased_at_reference "${directory}" "${head}" "${tracked}")" ||
    fail "could not read ${tracked} at ${head}"
  if [ "${base_body}" = "${head_body}" ]; then
    cat >&2 <<MESSAGE
${SCRIPT_NAME}: the "## [Unreleased]" section of ${tracked} is unchanged between ${base} and ${head}.

Add an entry describing what a user of the Agent will notice, under Added, Changed, Fixed,
Removed, Security or Deprecated. If this change is a refactor, or is test-only or CI-only, apply
the "skip-changelog" label to the pull request instead.
MESSAGE
    exit 1
  fi
  printf 'The "## [Unreleased]" section of %s changed between %s and %s.\n' "${tracked}" "${base}" "${head}"
}

[ $# -ge 1 ] || usage
subcommand="$1"
shift
case "${subcommand}" in
validate) command_validate "$@" ;;
extract) command_extract "$@" ;;
check-unreleased) command_check_unreleased "$@" ;;
-h | --help | help) usage ;;
*) fail "unknown subcommand: ${subcommand}" ;;
esac
