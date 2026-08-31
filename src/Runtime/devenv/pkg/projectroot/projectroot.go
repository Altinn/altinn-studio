// Package projectroot locates project roots by walking up to marker files.
package projectroot

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

// Marker is the standard marker file for an Altinn Studio project root.
const Marker = ".altinn-studio-project-root"

var (
	// ErrEmptyMarker is returned when searching with an empty marker name.
	ErrEmptyMarker = errors.New("project root marker is empty")

	errNotFound = errors.New("project root not found")
)

// Find searches upward from the current working directory for marker.
func Find(marker string) (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("get working directory: %w", err)
	}
	return FindFrom(dir, marker)
}

// FindFrom searches upward from startDir for marker.
func FindFrom(startDir, marker string) (string, error) {
	if marker == "" {
		return "", ErrEmptyMarker
	}

	dir, err := filepath.Abs(startDir)
	if err != nil {
		return "", fmt.Errorf("resolve start directory: %w", err)
	}

	for {
		markerPath := filepath.Join(dir, marker)
		if _, statErr := os.Stat(markerPath); statErr == nil {
			return dir, nil
		} else if !errors.Is(statErr, os.ErrNotExist) {
			return "", fmt.Errorf("stat project root marker %q: %w", markerPath, statErr)
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("%w: marker %q not found from %q", errNotFound, marker, startDir)
		}
		dir = parent
	}
}
