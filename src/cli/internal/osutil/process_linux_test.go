//go:build linux

package osutil_test

import (
	"errors"
	"os"
	"syscall"
	"testing"

	"altinn.studio/studioctl/internal/osutil"
)

func TestProcessRunning_CurrentProcessIsRunning(t *testing.T) {
	running, err := osutil.ProcessRunning(os.Getpid())
	if err != nil {
		t.Fatalf("ProcessRunning() error = %v", err)
	}
	if !running {
		t.Fatal("ProcessRunning() = false, want true")
	}
}

func TestProcessRunning_ProcessOfAnotherUserIsNotRunning(t *testing.T) {
	if err := syscall.Kill(1, 0); !errors.Is(err, syscall.EPERM) {
		t.Skipf("this user may signal pid 1 (err = %v)", err)
	}

	running, err := osutil.ProcessRunning(1)
	if err != nil {
		t.Fatalf("ProcessRunning() error = %v", err)
	}
	if running {
		t.Fatal("ProcessRunning() = true, want false")
	}
}
