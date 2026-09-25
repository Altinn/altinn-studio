package osutil_test

import (
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/studioctl/internal/osutil"
)

func TestProcessRunsExecutable_MatchesCurrentProcess(t *testing.T) {
	executable, err := os.Executable()
	if err != nil {
		t.Fatalf("os.Executable() error = %v", err)
	}

	runs, err := osutil.ProcessRunsExecutable(os.Getpid(), executable)
	if err != nil {
		t.Fatalf("ProcessRunsExecutable() error = %v", err)
	}
	if !runs {
		t.Fatalf("ProcessRunsExecutable(%d, %q) = false, want true", os.Getpid(), executable)
	}
}

func TestProcessRunsExecutable_RejectsOtherExecutable(t *testing.T) {
	other := filepath.Join(t.TempDir(), "studioctl-server")
	if err := os.WriteFile(other, nil, 0o600); err != nil {
		t.Fatalf("write file: %v", err)
	}

	runs, err := osutil.ProcessRunsExecutable(os.Getpid(), other)
	if err != nil {
		t.Fatalf("ProcessRunsExecutable() error = %v", err)
	}
	if runs {
		t.Fatalf("ProcessRunsExecutable(%d, %q) = true, want false", os.Getpid(), other)
	}
}
