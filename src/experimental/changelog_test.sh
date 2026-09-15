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

# assert_message <name> <expected status> <stderr substring> <command…>
# Asserting on the message as well as the status keeps two different rules from covering for
# each other when one of them is removed.
assert_message() {
  name="$1"
  expected="$2"
  needle="$3"
  shift 3
  status=0
  "$@" >"${WORK}/stdout" 2>"${WORK}/stderr" || status=$?
  if [ "${status}" -ne "${expected}" ]; then
    report_failure "${name}" "expected status ${expected}, got ${status}"
    sed 's/^/     /' "${WORK}/stderr"
  elif ! grep -qF "${needle}" "${WORK}/stderr"; then
    report_failure "${name}" "stderr did not mention \"${needle}\""
    sed 's/^/     /' "${WORK}/stderr"
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

malformed_versions="$(fixture malformed-versions <<'BODY'

## [Unreleased]

## [01.0.0] - 2026-09-01

### Added

- A core number with a leading zero.
BODY
)"
assert_status 'validate rejects a leading zero in a core version number' 1 \
  "${CHANGELOG}" validate "${malformed_versions}"

empty_identifier="$(fixture empty-identifier <<'BODY'

## [Unreleased]

## [1.0.0-alpha..1] - 2026-09-01

### Added

- An empty prerelease identifier.
BODY
)"
assert_status 'validate rejects an empty prerelease identifier' 1 \
  "${CHANGELOG}" validate "${empty_identifier}"

numeric_leading_zero="$(fixture numeric-leading-zero <<'BODY'

## [Unreleased]

## [1.0.0-preview.01] - 2026-09-01

### Added

- A numeric prerelease identifier with a leading zero.
BODY
)"
assert_status 'validate rejects a leading zero in a numeric prerelease identifier' 1 \
  "${CHANGELOG}" validate "${numeric_leading_zero}"

hyphenated_prerelease="$(fixture hyphenated-prerelease <<'BODY'

## [Unreleased]

## [1.0.0-rc-1.2] - 2026-09-01

### Added

- A hyphenated alphanumeric prerelease identifier.
BODY
)"
assert_status 'validate accepts hyphens inside a prerelease identifier' 0 \
  "${CHANGELOG}" validate "${hyphenated_prerelease}"

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

duplicate_version="$(fixture duplicate-version <<'BODY'

## [Unreleased]

## [1.0.0] - 2026-09-01

### Added

- First release.

## [1.0.0] - 2026-08-01

### Added

- The same version again.
BODY
)"
assert_message 'validate rejects a duplicate released version' 1 'duplicate section for version 1.0.0' \
  "${CHANGELOG}" validate "${duplicate_version}"

deep_heading="$(fixture deep-heading <<'BODY'

## [Unreleased]

### Added

- Something.

#### Details

- More.
BODY
)"
assert_message 'validate rejects a heading deeper than "###"' 1 'deeper than' \
  "${CHANGELOG}" validate "${deep_heading}"

outside_section="$(fixture outside-section <<'BODY'

## [Unreleased]

Some prose before any category.

### Added

- Something.
BODY
)"
assert_message 'validate rejects content outside a "###" section' 1 'must sit under' \
  "${CHANGELOG}" validate "${outside_section}"

bad_month="$(fixture bad-month <<'BODY'

## [Unreleased]

## [1.0.0] - 2026-13-45

### Added

- An impossible date.
BODY
)"
assert_status 'validate rejects an impossible month and day' 1 "${CHANGELOG}" validate "${bad_month}"

impossible_dates="$(fixture impossible-dates <<'BODY'

## [Unreleased]

## [1.0.2] - 2026-02-31

### Added

- The 31st of February.
BODY
)"
assert_message 'validate rejects a day past the end of the month' 1 '2026-02-31 is not a date' \
  "${CHANGELOG}" validate "${impossible_dates}"

short_month="$(fixture short-month <<'BODY'

## [Unreleased]

## [1.0.1] - 2026-04-31

### Added

- The 31st of April.
BODY
)"
assert_message 'validate rejects the 31st of a 30-day month' 1 '2026-04-31 is not a date' \
  "${CHANGELOG}" validate "${short_month}"

common_year="$(fixture common-year <<'BODY'

## [Unreleased]

## [1.0.0] - 2025-02-29

### Added

- The 29th of February in a common year.
BODY
)"
assert_message 'validate rejects 29 February outside a leap year' 1 '2025-02-29 is not a date' \
  "${CHANGELOG}" validate "${common_year}"

leap_years="$(fixture leap-years <<'BODY'

## [Unreleased]

## [2.0.0] - 2024-02-29

### Added

- A leap year divisible by four.

## [1.0.0] - 2000-02-29

### Added

- A leap year divisible by four hundred.
BODY
)"
assert_status 'validate accepts 29 February in a leap year' 0 "${CHANGELOG}" validate "${leap_years}"

century="$(fixture century <<'BODY'

## [Unreleased]

## [1.0.0] - 1900-02-29

### Added

- A century that is not a leap year.
BODY
)"
assert_message 'validate rejects 29 February in a non-leap century' 1 '1900-02-29 is not a date' \
  "${CHANGELOG}" validate "${century}"

header_in_entry="${WORK}/header-in-entry.md"
cat >"${header_in_entry}" <<'BODY'
# Changelog

## [Unreleased]

### Added

- A link to https://keepachangelog.com/en/1.1.0/ and https://semver.org/spec/v2.0.0.html in an entry.
BODY
assert_message 'validate does not accept header links found inside an entry' 1 'Keep a Changelog' \
  "${CHANGELOG}" validate "${header_in_entry}"

link_references="$(fixture link-references <<'BODY'

## [Unreleased]

### Added

- Something.

## [1.0.0] - 2026-09-01

### Added

- First release.

[Unreleased]: https://example.com/compare/1.0.0...HEAD
[1.0.0]: https://example.com/releases/1.0.0
BODY
)"
assert_status 'validate accepts Keep a Changelog link reference definitions' 0 \
  "${CHANGELOG}" validate "${link_references}"
assert_output 'extract leaves link reference definitions out of the body' \
  '### Added

- First release.' \
  "${CHANGELOG}" extract 1.0.0 "${link_references}"

# A link reference between categories must not truncate the section.
interleaved="$(fixture interleaved-link <<'BODY'

## [Unreleased]

## [1.0.0] - 2026-09-01

### Added

- Something.

[1.0.0]: https://example.com/releases/1.0.0

### Fixed

- Something else.
BODY
)"
assert_output 'extract keeps categories that follow a link reference' \
  '### Added

- Something.

### Fixed

- Something else.' \
  "${CHANGELOG}" extract 1.0.0 "${interleaved}"

crlf="${WORK}/crlf.md"
sed 's/$/\r/' "${good}" >"${crlf}"
assert_message 'validate reports CRLF line endings' 1 'CRLF' "${CHANGELOG}" validate "${crlf}"

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

assert_message 'extract fails for a missing version' 1 'no section for version 2.0.0' \
  "${CHANGELOG}" extract 2.0.0 "${good}"
assert_message 'extract fails for an undated version' 1 'has no release date' \
  "${CHANGELOG}" extract 1.0.0 "${undated}"
assert_message 'extract rejects an undated section by name' 1 'has no release date' \
  "${CHANGELOG}" extract Unreleased "${good}"

dated_but_empty="$(fixture dated-but-empty <<'BODY'

## [Unreleased]

## [1.0.0] - 2026-09-01

## [0.9.0] - 2026-08-01

### Added

- First release.
BODY
)"
assert_message 'extract rejects a dated section with no content' 1 'is empty' \
  "${CHANGELOG}" extract 1.0.0 "${dated_but_empty}"

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

# An entry another pull request added to the base branch after this branch forked must not
# satisfy the check.
git -C "${REPOSITORY}" checkout --quiet -b feature "${base}"
printf 'code\n' >"${REPOSITORY}/code.txt"
git -C "${REPOSITORY}" add -A
git -C "${REPOSITORY}" commit --quiet -m 'change code only'
feature="$(git -C "${REPOSITORY}" rev-parse HEAD)"
git -C "${REPOSITORY}" checkout --quiet main 2>/dev/null || git -C "${REPOSITORY}" checkout --quiet master
moved_on="$(git -C "${REPOSITORY}" rev-parse HEAD)"
assert_status 'check-unreleased ignores entries the base branch gained after the fork' 1 \
  "${CHANGELOG}" check-unreleased "${moved_on}" "${feature}" "${tracked}"

assert_message 'check-unreleased rejects an unresolvable base reference' 1 'cannot resolve base' \
  "${CHANGELOG}" check-unreleased no-such-ref "${feature}" "${tracked}"
assert_message 'check-unreleased rejects an unresolvable head reference' 1 'cannot resolve head' \
  "${CHANGELOG}" check-unreleased "${base}" no-such-ref "${tracked}"

# -------------------------------------------------------------------------- #

printf '\n%d checks, %d failures\n' "${checks}" "${failures}"
[ "${failures}" -eq 0 ]
