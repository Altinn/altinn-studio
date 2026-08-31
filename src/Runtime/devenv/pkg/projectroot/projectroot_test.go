package projectroot

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func TestFindFrom(t *testing.T) {
	root := t.TempDir()
	nested := filepath.Join(root, "a", "b", "c")
	if err := os.MkdirAll(nested, 0o755); err != nil {
		t.Fatalf("MkdirAll() error = %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, Marker), []byte("\n"), 0o644); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}

	got, err := FindFrom(nested, Marker)
	if err != nil {
		t.Fatalf("FindFrom() error = %v", err)
	}
	if got != root {
		t.Fatalf("FindFrom() = %q, want %q", got, root)
	}
}

func TestFindFromReturnsNotFound(t *testing.T) {
	_, err := FindFrom(t.TempDir(), Marker)
	if err == nil {
		t.Fatalf("FindFrom() error = nil, want error")
	}
}

func TestFindFromRejectsEmptyMarker(t *testing.T) {
	_, err := FindFrom(t.TempDir(), "")
	if !errors.Is(err, ErrEmptyMarker) {
		t.Fatalf("FindFrom() error = %v, want ErrEmptyMarker", err)
	}
}
