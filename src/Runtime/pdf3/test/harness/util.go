package harness

import (
	"bytes"
	"errors"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"strings"
	"testing"
)

// IsPDF checks if the given bytes represent a valid PDF file
func IsPDF(data []byte) bool {
	// PDF files start with %PDF-
	if len(data) < 5 {
		return false
	}
	return bytes.HasPrefix(data, []byte("%PDF-"))
}

func Snapshot(t *testing.T, data []byte, name string, ext string) {
	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("Couldn't get working directory: %v", err)
	}

	testName := strings.ReplaceAll(t.Name(), "/", "_")
	if name != "" {
		testName = fmt.Sprintf("%s_%s", testName, name)
	}

	var directoryMode os.FileMode
	wdStat, err := os.Stat(wd)
	if err != nil {
		directoryMode = 0755
		t.Logf("Failed to get working directory mode, defaulting to %d: %v", directoryMode, err)
	} else {
		directoryMode = wdStat.Mode()
	}
	directory := path.Join(wd, "_snapshots")
	err = os.MkdirAll(directory, directoryMode)
	if err != nil {
		t.Fatalf("Couldnt create snapshot directory: %v", err)
	}

	if ext == "" {
		ext = "txt"
	}
	fileName := path.Join(wd, "_snapshots", testName) + "." + ext

	err = os.WriteFile(fileName, data, 0644)
	if err != nil {
		t.Fatalf("Error writing snapshot: %v", err)
	}
}

// FindProjectRoot searches upward for a directory containing go.mod
// It starts from the current working directory and checks up to maxIterations parent directories
func FindProjectRoot() (string, error) {
	const maxIterations = 10

	// Get current working directory
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	// Track the previous directory to detect when we've reached the filesystem root
	prevDir := ""

	for i := 0; i < maxIterations; i++ {
		// Check if go.mod exists in current directory
		goModPath := filepath.Join(dir, "go.mod")
		if _, err := os.Stat(goModPath); err == nil {
			return dir, nil
		}

		// Move to parent directory
		parentDir := filepath.Dir(dir)

		// Check if we've reached the filesystem root (dir == parentDir on Unix, or checking against previous)
		if parentDir == dir || parentDir == prevDir {
			return "", errors.New("reached filesystem root without finding go.mod")
		}

		prevDir = dir
		dir = parentDir
	}

	return "", errors.New("exceeded maximum iterations searching for go.mod")
}
