package config

import "strings"

const userAgentProduct = "studioctl"

// Version is the studioctl build version.
type Version struct {
	value string
}

// NewVersion creates a studioctl build version value.
func NewVersion(value string) Version {
	return Version{value: normalizeVersion(value)}
}

// String returns the build version string.
func (v Version) String() string {
	return v.value
}

// UserAgent returns the studioctl User-Agent value for this version.
func (v Version) UserAgent() string {
	return userAgentProduct + "/" + v.value
}

func normalizeVersion(value string) string {
	return strings.TrimPrefix(strings.TrimSpace(value), userAgentProduct+"/")
}
