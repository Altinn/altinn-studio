//nolint:testpackage // Tests package-private install helpers.
package install

import (
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/studioctl/internal/config"
)

func TestObsoleteTestdataDirReportsPresence(t *testing.T) {
	t.Parallel()

	dataDir := t.TempDir()
	svc := NewService(&config.Config{DataDir: dataDir})

	dir, present := svc.ObsoleteTestdataDir()
	if present {
		t.Fatalf("ObsoleteTestdataDir() present = true for %q, want false", dir)
	}
	if dir != filepath.Join(dataDir, "testdata") {
		t.Fatalf("ObsoleteTestdataDir() dir = %q", dir)
	}

	writeTestFile(t, filepath.Join(dataDir, "testdata", "authorization", "roles.json"), "[]")
	if _, present = svc.ObsoleteTestdataDir(); !present {
		t.Fatal("ObsoleteTestdataDir() present = false after creating the directory, want true")
	}

	// A stray file at the same path is not the legacy directory.
	if err := os.RemoveAll(filepath.Join(dataDir, "testdata")); err != nil {
		t.Fatalf("RemoveAll() error = %v", err)
	}
	writeTestFile(t, filepath.Join(dataDir, "testdata"), "not a directory")
	if _, present = svc.ObsoleteTestdataDir(); present {
		t.Fatal("ObsoleteTestdataDir() present = true for a plain file, want false")
	}
}
