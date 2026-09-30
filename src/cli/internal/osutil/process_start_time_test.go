package osutil_test

import (
	"os"
	"testing"

	"altinn.studio/studioctl/internal/osutil"
)

func TestProcessStartTime_IsStableForCurrentProcess(t *testing.T) {
	first, err := osutil.ProcessStartTime(os.Getpid())
	if err != nil {
		t.Fatalf("ProcessStartTime() error = %v", err)
	}
	second, err := osutil.ProcessStartTime(os.Getpid())
	if err != nil {
		t.Fatalf("ProcessStartTime() error = %v", err)
	}
	if first == 0 || first != second {
		t.Fatalf("ProcessStartTime() = %d, then %d, want the same value that is not 0", first, second)
	}
}

func TestProcessStartTime_RejectsInvalidPID(t *testing.T) {
	if _, err := osutil.ProcessStartTime(0); err == nil {
		t.Fatal("ProcessStartTime(0) error = nil, want error")
	}
}
