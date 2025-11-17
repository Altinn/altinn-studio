package checksum

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// matchRecursivePattern matches files using filepath.WalkDir for patterns containing "**"
// Pattern format: "prefix/**/*.ext" matches all .ext files recursively under prefix/
func matchRecursivePattern(baseDir, pattern string) ([]string, error) {
	// Split pattern on "**" to get base directory and suffix
	parts := strings.Split(pattern, "**")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid recursive pattern (expected exactly one '**'): %s", pattern)
	}

	basePath := strings.TrimSuffix(parts[0], "/")
	suffix := strings.TrimPrefix(parts[1], "/")

	// Determine matching function based on suffix pattern
	var matchFunc func(string) bool
	if suffix == "" {
		// Match all files
		matchFunc = func(name string) bool {
			return true
		}
	} else if strings.Contains(suffix, "*") || strings.Contains(suffix, "?") {
		// Use filepath.Match for glob patterns (*.go, *_test.go, etc.)
		matchFunc = func(name string) bool {
			matched, err := filepath.Match(suffix, name)
			return err == nil && matched
		}
	} else {
		// Exact filename match
		matchFunc = func(name string) bool {
			return name == suffix
		}
	}

	walkPath := filepath.Join(baseDir, basePath)

	// Check if base directory exists - skip gracefully if not
	if _, err := os.Stat(walkPath); os.IsNotExist(err) {
		return []string{}, nil
	}

	var matches []string
	err := filepath.WalkDir(walkPath, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Skip directories
		if d.IsDir() {
			return nil
		}

		// Check if filename matches the pattern
		if matchFunc(filepath.Base(path)) {
			matches = append(matches, path)
		}

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to walk directory %s: %w", walkPath, err)
	}

	return matches, nil
}

// ComputeFilesChecksum computes a SHA256 hash of the contents of files matching the given glob patterns.
// Patterns can include:
//   - Simple globs: "*.go", "go.mod"
//   - Recursive patterns: "cmd/**/*.go", "internal/**/*.go"
//
// The baseDir parameter specifies the root directory for pattern matching.
func ComputeFilesChecksum(baseDir string, patterns []string) (string, error) {
	var allFiles []string
	seen := make(map[string]bool) // Deduplicate files in case patterns overlap

	for _, pattern := range patterns {
		var matches []string
		var err error

		// Use WalkDir for recursive patterns (containing "**"), otherwise use Glob
		if strings.Contains(pattern, "**") {
			matches, err = matchRecursivePattern(baseDir, pattern)
			if err != nil {
				return "", fmt.Errorf("failed to match recursive pattern %s: %w", pattern, err)
			}
		} else {
			matches, err = filepath.Glob(filepath.Join(baseDir, pattern))
			if err != nil {
				return "", fmt.Errorf("failed to glob pattern %s: %w", pattern, err)
			}
		}

		// Add matches, deduplicating
		for _, file := range matches {
			if !seen[file] {
				seen[file] = true
				allFiles = append(allFiles, file)
			}
		}
	}

	// Sort files for consistent ordering
	sort.Strings(allFiles)

	// Compute combined hash
	hasher := sha256.New()
	for _, file := range allFiles {
		// Skip directories
		info, err := os.Stat(file)
		if err != nil {
			return "", fmt.Errorf("failed to stat file %s: %w", file, err)
		}
		if info.IsDir() {
			continue
		}

		data, err := os.ReadFile(file)
		if err != nil {
			return "", fmt.Errorf("failed to read file %s: %w", file, err)
		}
		hasher.Write(data)
	}

	return hex.EncodeToString(hasher.Sum(nil)), nil
}
