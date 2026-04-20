package apps_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/cmd/apps"
	"altinn.studio/studioctl/internal/osutil"
)

func TestFindMetadataByIDReturnsDecodeError(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "2026-04-20-1.json"), []byte("{"), osutil.FilePermOwnerOnly); err != nil {
		t.Fatalf("write metadata: %v", err)
	}

	_, _, err := apps.FindMetadataByID(dir, "123")
	if err == nil {
		t.Fatal("FindMetadataByID() error = nil, want decode error")
	}
	if !strings.Contains(err.Error(), "decode app log metadata") {
		t.Fatalf("FindMetadataByID() error = %v, want decode error", err)
	}
}
