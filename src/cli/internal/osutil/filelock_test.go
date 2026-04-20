package osutil

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
)

func TestAcquireFileLock_BlocksSecondLock(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "test.lock")
	lock, err := AcquireFileLock(context.Background(), path)
	if err != nil {
		t.Fatalf("AcquireFileLock() error = %v", err)
	}
	defer func() {
		if err := lock.Close(); err != nil {
			t.Fatalf("Close() error = %v", err)
		}
	}()

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err = AcquireFileLock(ctx, path)
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("AcquireFileLock() error = %v, want context canceled", err)
	}
}
