//go:build linux

package osutil_test

import (
	"os"
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
