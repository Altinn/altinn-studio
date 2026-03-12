package config

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"sync"
	"time"
)

var projectRoot string
var errProjectRoot error
var once sync.Once

var (
	errProjectRootAtFilesystemRoot = errors.New("error getting project root: reached root of file system")
	errProjectRootTraversalLimit   = errors.New("error getting project root, reached max directory traversal")
	errInvalidDurationDaysValue    = errors.New("invalid days value")
)

func TryFindProjectRootByGoMod() (string, error) {
	tryFindProjectRoot := func() (string, error) {
		basePath, err := os.Getwd()
		if err != nil {
			return "", fmt.Errorf("error getting project root: %w", err)
		}

		for range 100 {
			goModPath := filepath.Join(basePath, "go.mod")
			_, err := os.Stat(goModPath)
			if err == nil {
				return basePath, nil
			} else if !os.IsNotExist(err) {
				return "", fmt.Errorf("error getting project root: %w", err)
			}

			parentPath := filepath.Dir(basePath)
			if parentPath == basePath {
				return "", errProjectRootAtFilesystemRoot
			}
			basePath = parentPath
		}

		return "", errProjectRootTraversalLimit
	}

	once.Do(func() {
		projectRoot, errProjectRoot = tryFindProjectRoot()
	})
	return projectRoot, errProjectRoot
}

// daysRegex matches a days component at the start of a duration string.
var daysRegex = regexp.MustCompile(`^(\d+)d(.*)$`)

// ParseDuration extends Go's time.ParseDuration to support days (d suffix).
// Examples: "23d" -> 23 days, "1d12h" -> 1 day and 12 hours, "24h" -> 24 hours.
func ParseDuration(s string) (time.Duration, error) {
	matches := daysRegex.FindStringSubmatch(s)
	if matches == nil {
		duration, err := time.ParseDuration(s)
		if err != nil {
			return 0, fmt.Errorf("parse duration %q: %w", s, err)
		}
		return duration, nil
	}

	days, err := strconv.Atoi(matches[1])
	if err != nil {
		return 0, fmt.Errorf("%w: %s", errInvalidDurationDaysValue, matches[1])
	}
	total := time.Duration(days) * 24 * time.Hour

	remainder := matches[2]
	if remainder != "" {
		rest, err := time.ParseDuration(remainder)
		if err != nil {
			return 0, fmt.Errorf("parse duration remainder %q: %w", remainder, err)
		}
		total += rest
	}

	return total, nil
}
