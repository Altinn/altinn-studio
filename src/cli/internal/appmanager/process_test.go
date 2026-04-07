package appmanager

import (
	"os"
	"testing"
)

func TestIsProcessRunningCurrentProcess(t *testing.T) {
	t.Parallel()

	running, err := isProcessRunning(os.Getpid())
	if err != nil {
		t.Fatalf("isProcessRunning(current pid) unexpected error: %v", err)
	}
	if !running {
		t.Fatal("isProcessRunning(current pid) = false, want true")
	}
}

func TestIsProcessRunningInvalidPID(t *testing.T) {
	t.Parallel()

	running, err := isProcessRunning(-1)
	if err != nil {
		t.Fatalf("isProcessRunning(-1) unexpected error: %v", err)
	}
	if running {
		t.Fatal("isProcessRunning(-1) = true, want false")
	}
}
