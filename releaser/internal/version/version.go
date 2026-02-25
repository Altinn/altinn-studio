// Package version provides semantic version parsing per semver 2.0.
package version

import (
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// ErrInvalidFormat indicates the version string is not in the expected format.
var ErrInvalidFormat = errors.New("invalid version format: expected vX.Y.Z or vX.Y.Z-<prerelease>")

// pattern matches vX.Y.Z or vX.Y.Z-<prerelease> per semver 2.0.
// Prerelease identifiers are dot-separated alphanumeric strings.
var pattern = regexp.MustCompile(`^v(\d+)\.(\d+)\.(\d+)(-([0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*))?$`)

// Version represents a parsed semantic version per semver 2.0.
type Version struct {
	Full         string // v1.2.3 or v1.2.3-preview.1
	Num          string // 1.2.3 or 1.2.3-preview.1 (without v prefix)
	Prerelease   string // prerelease identifier (e.g., "preview.1", "alpha", "rc.1")
	Major        int
	Minor        int
	Patch        int
	IsPrerelease bool
}

// Parse parses and validates a version string per semver 2.0 (vX.Y.Z or vX.Y.Z-<prerelease>).
func Parse(ver string) (*Version, error) {
	ver = strings.TrimSpace(ver)
	matches := pattern.FindStringSubmatch(ver)
	if matches == nil {
		return nil, fmt.Errorf("%w: %s", ErrInvalidFormat, ver)
	}

	// Safe to ignore errors - regex ensures these are valid integers
	major, _ := strconv.Atoi(matches[1]) //nolint:errcheck // regex validated
	minor, _ := strconv.Atoi(matches[2]) //nolint:errcheck // regex validated
	patch, _ := strconv.Atoi(matches[3]) //nolint:errcheck // regex validated
	prerelease := matches[5]             // group 5 is the prerelease without the leading hyphen
	isPrerelease := prerelease != ""

	var num string
	if isPrerelease {
		num = fmt.Sprintf("%d.%d.%d-%s", major, minor, patch, prerelease)
	} else {
		num = fmt.Sprintf("%d.%d.%d", major, minor, patch)
	}

	return &Version{
		Full:         "v" + num,
		Num:          num,
		Major:        major,
		Minor:        minor,
		Patch:        patch,
		Prerelease:   prerelease,
		IsPrerelease: isPrerelease,
	}, nil
}

// String returns the full version string with v prefix.
func (v *Version) String() string {
	return v.Full
}

// IsPatchRelease returns true if this is a patch release (patch > 0 for stable releases).
// Prerelease versions are never considered patch releases regardless of patch number.
func (v *Version) IsPatchRelease() bool {
	return !v.IsPrerelease && v.Patch > 0
}
