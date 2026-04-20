package osutil_test

import (
	"context"
	"errors"
	"path/filepath"
	"testing"

	"altinn.studio/studioctl/internal/osutil"
)

func TestAcquireFileLock_BlocksSecondLock(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "test.lock")
	lock, err := osutil.AcquireFileLock(context.Background(), path)
	if err != nil {
		t.Fatalf("AcquireFileLock() error = %v", err)
	}
	defer func() {
		if closeErr := lock.Close(); closeErr != nil {
			t.Fatalf("Close() error = %v", closeErr)
		}
	}()

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err = osutil.AcquireFileLock(ctx, path)
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("AcquireFileLock() error = %v, want context canceled", err)
	}
}
