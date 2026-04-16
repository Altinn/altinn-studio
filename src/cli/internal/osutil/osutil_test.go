package osutil_test

import (
	"os"
	"testing"

	"altinn.studio/studioctl/internal/osutil"
)

func TestCurrentBin(t *testing.T) {
	originalArgs := os.Args
	t.Cleanup(func() {
		os.Args = originalArgs
	})

	t.Run("empty args", func(t *testing.T) {
		os.Args = nil
		assertCurrentBin(t)
	})

	t.Run("empty binary", func(t *testing.T) {
		os.Args = []string{""}
		assertCurrentBin(t)
	})

	t.Run("plain binary", func(t *testing.T) {
		os.Args = []string{"/tmp/studioctl"}
		assertCurrentBin(t)
	})

	t.Run("exe suffix stripped", func(t *testing.T) {
		os.Args = []string{"/tmp/studioctl.exe"}
		assertCurrentBin(t)
	})
}

func assertCurrentBin(t *testing.T) {
	t.Helper()

	const want = "studioctl"
	if got := osutil.CurrentBin(); got != want {
		t.Fatalf("CurrentBin() = %q, want %q", got, want)
	}
}
