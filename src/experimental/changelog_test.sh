#!/bin/sh
# Tests for changelog.sh. Every case writes a fixture into a temporary directory and asserts the
# subcommand's exit status, and its output where the output is the point.
#
# Usage: changelog_test.sh   (or `make changelog-test`)

set -eu

SCRIPT_DIRECTORY="$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)"
CHANGELOG="${SCRIPT_DIRECTORY}/changelog.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "${WORK}"' EXIT HUP INT TERM

failures=0
checks=0

report_pass() {
  checks=$((checks + 1))
  printf 'ok   %s\n' "$1"
}

report_failure() {
  checks=$((checks + 1))
  failures=$((failures + 1))
  printf 'FAIL %s: %s\n' "$1" "$2"
}

# assert_status <name> <expected status> <command…>
assert_status() {
  name="$1"
  expected="$2"
  shift 2
  status=0
  "$@" >"${WORK}/stdout" 2>"${WORK}/stderr" || status=$?
  if [ "${status}" -eq "${expected}" ]; then
    report_pass "${name}"
  else
    report_failure "${name}" "expected status ${expected}, got ${status}"
    sed 's/^/     /' "${WORK}/stderr"
  fi
}

# assert_output <name> <expected output> <command…>
assert_output() {
  name="$1"
  expected="$2"
  shift 2
  status=0
  "$@" >"${WORK}/stdout" 2>"${WORK}/stderr" || status=$?
  actual="$(cat "${WORK}/stdout")"
  if [ "${status}" -ne 0 ]; then
    report_failure "${name}" "command failed with status ${status}"
    sed 's/^/     /' "${WORK}/stderr"
  elif [ "${actual}" != "${expected}" ]; then
    report_failure "${name}" "unexpected output"
    printf '     expected: %s\n     actual:   %s\n' "${expected}" "${actual}"
  else
    report_pass "${name}"
  fi
}

header() {
  cat <<'HEADER'
# Changelog

All notable changes to the experimental Agent platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
HEADER
}

# fixture <name> — reads the body from standard input and prints the fixture's path.
fixture() {
  path="${WORK}/$1.md"
  {
    header
    cat
  } >"${path}"
  printf '%s\n' "${path}"
}

# ---------------------------------------------------------------- validate ---

good="$(fixture good <<'BODY'

## [Unreleased]

### Added

- `agentctl port-forward` forwards a local port into a running Agent.

### Fixed

- Installing on Windows no longer fails while verifying the archive.

## [1.0.0] - 2026-09-01

### Changed

- The hostname inside a Sandbox is the Agent name.

## [1.0.0-rc.2] - 2026-08-20

### Added

- Second release candidate.

## [1.0.0-rc.1] - 2026-08-10

### Added

- First release candidate.

## [0.9.0] - 2026-08-01

### Added

- First public preview.
BODY
)"

assert_status 'validate accepts a well formed changelog' 0 "${CHANGELOG}" validate "${good}"

empty_unreleased="$(fixture empty-unreleased <<'BODY'

## [Unreleased]

## [1.0.0] - 2026-09-01

### Added

- First release.
BODY
)"
assert_status 'validate accepts an Unreleased section with no entries yet' 0 \
  "${CHANGELOG}" validate "${empty_unreleased}"

no_header="${WORK}/no-header.md"
cat >"${no_header}" <<'BODY'
# Release notes

## [Unreleased]

### Added

- Something.
BODY
assert_status 'validate rejects a missing header' 1 "${CHANGELOG}" validate "${no_header}"

two_unreleased="$(fixture two-unreleased <<'BODY'

## [Unreleased]

### Added

- Something.

## [Unreleased]

### Added

- Something else.
BODY
)"
assert_status 'validate rejects two Unreleased sections' 1 "${CHANGELOG}" validate "${two_unreleased}"

unreleased_late="$(fixture unreleased-late <<'BODY'

## [1.0.0] - 2026-09-01

### Added

- First release.

## [Unreleased]

### Added

- Something.
BODY
)"
assert_status 'validate rejects an Unreleased section that is not first' 1 \
  "${CHANGELOG}" validate "${unreleased_late}"

undated="$(fixture undated <<'BODY'

## [Unreleased]

## [1.0.0]

### Added

- First release.
BODY
)"
assert_status 'validate rejects a released section with no date' 1 "${CHANGELOG}" validate "${undated}"

bad_date="$(fixture bad-date <<'BODY'

## [Unreleased]

## [1.0.0] - 01.09.2026

### Added

- First release.
BODY
)"
assert_status 'validate rejects a date that is not YYYY-MM-DD' 1 "${CHANGELOG}" validate "${bad_date}"

out_of_order="$(fixture out-of-order <<'BODY'

## [Unreleased]

## [1.0.0] - 2026-08-01

### Added

- First release.

## [1.1.0] - 2026-09-01

### Added

- Second release.
BODY
)"
assert_status 'validate rejects released sections in ascending order' 1 \
  "${CHANGELOG}" validate "${out_of_order}"

prerelease_order="$(fixture prerelease-order <<'BODY'

## [Unreleased]

## [1.0.0-rc.1] - 2026-08-10

### Added

- Release candidate.

## [1.0.0] - 2026-09-01

### Added

- First release.
BODY
)"
assert_status 'validate rejects a prerelease listed above its own release' 1 \
  "${CHANGELOG}" validate "${prerelease_order}"

prerelease_numbers="$(fixture prerelease-numbers <<'BODY'

## [Unreleased]

## [1.0.0-preview.2] - 2026-09-01

### Added

- Second preview.

## [1.0.0-preview.10] - 2026-08-01

### Added

- Tenth preview, released earlier by mistake.
BODY
)"
assert_status 'validate compares numeric prerelease identifiers numerically' 1 \
  "${CHANGELOG}" validate "${prerelease_numbers}"

prerelease_lengths="$(fixture prerelease-lengths <<'BODY'

## [Unreleased]

## [1.0.0-alpha.1] - 2026-09-01

### Added

- Second alpha.

## [1.0.0-alpha] - 2026-08-01

### Added

- First alpha.
BODY
)"
assert_status 'validate ranks a longer prerelease above a shorter prefix of it' 0 \
  "${CHANGELOG}" validate "${prerelease_lengths}"

section_order="$(fixture section-order <<'BODY'

## [Unreleased]

### Fixed

- Something.

### Added

- Something else.
BODY
)"
assert_status 'validate rejects sections in the wrong order' 1 "${CHANGELOG}" validate "${section_order}"

unknown_section="$(fixture unknown-section <<'BODY'

## [Unreleased]

### Improved

- Something.
BODY
)"
assert_status 'validate rejects an unknown section' 1 "${CHANGELOG}" validate "${unknown_section}"

empty_section="$(fixture empty-section <<'BODY'

## [Unreleased]

### Added

### Fixed

- Something.
BODY
)"
assert_status 'validate rejects an empty section' 1 "${CHANGELOG}" validate "${empty_section}"

loose_text="$(fixture loose-text <<'BODY'

## [Unreleased]

### Added

Something happened.
BODY
)"
assert_status 'validate rejects an entry that is not a bullet' 1 "${CHANGELOG}" validate "${loose_text}"

continuation="$(fixture continuation <<'BODY'

## [Unreleased]

### Added

- Something happened, and the explanation
  continues on the next line.
BODY
)"
assert_status 'validate accepts an indented continuation line' 0 "${CHANGELOG}" validate "${continuation}"

assert_status 'validate reports a missing file' 1 "${CHANGELOG}" validate "${WORK}/absent.md"

# ----------------------------------------------------------------- extract ---

assert_output 'extract prints a released section without its heading' \
  '### Changed

- The hostname inside a Sandbox is the Agent name.' \
  "${CHANGELOG}" extract 1.0.0 "${good}"

assert_output 'extract accepts a leading v' \
  '### Added

- First release candidate.' \
  "${CHANGELOG}" extract v1.0.0-rc.1 "${good}"

assert_status 'extract fails for a missing version' 1 "${CHANGELOG}" extract 2.0.0 "${good}"
assert_status 'extract fails for an undated version' 1 "${CHANGELOG}" extract 1.0.0 "${undated}"
assert_status 'extract fails for an empty section' 1 "${CHANGELOG}" extract Unreleased "${good}"

# -------------------------------------------------------- check-unreleased ---

REPOSITORY="${WORK}/repository"
mkdir -p "${REPOSITORY}/src/experimental"
git -C "${REPOSITORY}" init --quiet
git -C "${REPOSITORY}" config user.email changelog-test@example.com
git -C "${REPOSITORY}" config user.name 'Changelog Test'
tracked="${REPOSITORY}/src/experimental/CHANGELOG.md"

git -C "${REPOSITORY}" commit --quiet --allow-empty -m 'empty'
empty_base="$(git -C "${REPOSITORY}" rev-parse HEAD)"

cp "${good}" "${tracked}"
git -C "${REPOSITORY}" add -A
git -C "${REPOSITORY}" commit --quiet -m 'add changelog'
base="$(git -C "${REPOSITORY}" rev-parse HEAD)"

assert_status 'check-unreleased treats a missing base file as changed' 0 \
  "${CHANGELOG}" check-unreleased "${empty_base}" "${base}" "${tracked}"

# A change that leaves the Unreleased section alone.
printf '\n' >>"${tracked}"
git -C "${REPOSITORY}" commit --quiet -a -m 'unrelated change'
unchanged="$(git -C "${REPOSITORY}" rev-parse HEAD)"
assert_status 'check-unreleased fails when the Unreleased section is untouched' 1 \
  "${CHANGELOG}" check-unreleased "${base}" "${unchanged}" "${tracked}"

# A change that adds an entry.
awk '{ print } /^## \[Unreleased\]$/ { print ""; print "### Changed"; print ""; print "- Another entry." }' \
  "${tracked}" >"${tracked}.next"
mv "${tracked}.next" "${tracked}"
git -C "${REPOSITORY}" commit --quiet -a -m 'add an entry'
changed="$(git -C "${REPOSITORY}" rev-parse HEAD)"
assert_status 'check-unreleased passes when an entry is added' 0 \
  "${CHANGELOG}" check-unreleased "${base}" "${changed}" "${tracked}"

# -------------------------------------------------------------------------- #

printf '\n%d checks, %d failures\n' "${checks}" "${failures}"
[ "${failures}" -eq 0 ]
