package osutil

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"testing"
)

// TestTreeWalk_SkipsEntriesRemovedMidWalk removes a file and a directory between the listing that
// names them and the walk reaching them, as log retention running alongside doctor would.
func TestTreeWalk_SkipsEntriesRemovedMidWalk(t *testing.T) {
	t.Parallel()

	root := t.TempDir()
	logs := filepath.Join(root, "logs")
	for name, size := range map[string]int{"kept.log": 4, "pruned.log": 50} {
		writeFile(t, filepath.Join(logs, name), size)
	}
	writeFile(t, filepath.Join(logs, "apps", "old.log"), 60)

	w := newTreeWalk([]string{"logs"})
	w.readDir = func(name string) ([]fs.DirEntry, error) {
		entries, err := os.ReadDir(name)
		if name == logs {
			for _, remove := range []string{"pruned.log", "apps"} {
				if removeErr := os.RemoveAll(filepath.Join(logs, remove)); removeErr != nil {
					t.Fatalf("RemoveAll() error = %v", removeErr)
				}
			}
		}
		if err != nil {
			return entries, fmt.Errorf("read test directory: %w", err)
		}
		return entries, nil
	}
	w.measure(root)

	if w.total.Err != nil || w.total.Bytes != 4 {
		t.Fatalf("total = %+v, want 4 bytes and no error", w.total)
	}
	if w.sizes[0].Err != nil || w.sizes[0].Bytes != 4 {
		t.Fatalf("logs = %+v, want 4 bytes and no error", w.sizes[0])
	}
}

func writeFile(t *testing.T, path string, size int) {
	t.Helper()

	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		t.Fatalf("MkdirAll() error = %v", err)
	}
	if err := os.WriteFile(path, make([]byte, size), 0o600); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}
}
