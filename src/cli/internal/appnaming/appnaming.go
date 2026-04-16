// Package appnaming contains shared Docker-safe naming helpers for app artifacts.
package appnaming

import (
	"path/filepath"
	"strings"
)

// AppNameFromPath returns a Docker-compatible app name based on an app path.
func AppNameFromPath(appPath string) string {
	name := DockerNameFragment(filepath.Base(appPath))
	if name == "" {
		name = "app"
	}
	return name
}

// DockerNameFragment returns a Docker-compatible name fragment.
func DockerNameFragment(value string) string {
	value = strings.ToLower(value)
	var b strings.Builder
	b.Grow(len(value))
	for _, r := range value {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case b.Len() > 0:
			b.WriteByte('-')
		}
	}
	return strings.Trim(b.String(), "-")
}
