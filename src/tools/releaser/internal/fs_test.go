package internal_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/releaser/internal"
)

func TestEnsureCleanDir_RejectsUnsafePaths(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name string
		path string
	}{
		{name: "empty", path: ""},
		{name: "dot", path: "."},
		{name: "dot-dot", path: ".."},
		{name: "root", path: string(filepath.Separator)},
		{name: "windows-drive-root-backslash", path: `C:\`},
		{name: "windows-drive-root-slash", path: "C:/"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			err := internal.EnsureCleanDir(tc.path)
			if err == nil {
				t.Fatalf("expected error for path %q, got nil", tc.path)
			}
			if !strings.Contains(err.Error(), "refusing to clean unsafe directory path") {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestEnsureCleanDir_RemovesContents(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	file := filepath.Join(dir, "stale.txt")
	if err := os.WriteFile(file, []byte("stale"), 0o644); err != nil {
		t.Fatalf("write file: %v", err)
	}

	if err := internal.EnsureCleanDir(dir); err != nil {
		t.Fatalf("EnsureCleanDir() error: %v", err)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("ReadDir() error: %v", err)
	}
	if len(entries) != 0 {
		t.Fatalf("expected empty directory, got %d entries", len(entries))
	}
}
