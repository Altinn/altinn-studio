package resource

import "testing"

func TestStatus_String(t *testing.T) {
	tests := []struct {
		status Status
		want   string
	}{
		{StatusUnknown, "unknown"},
		{StatusPending, "pending"},
		{StatusCreating, "creating"},
		{StatusReady, "ready"},
		{StatusFailed, "failed"},
		{StatusDestroying, "destroying"},
		{StatusDestroyed, "destroyed"},
		{Status(99), "Status(99)"},
	}

	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			if got := tt.status.String(); got != tt.want {
				t.Errorf("String() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestStatus_IsTerminal(t *testing.T) {
	tests := []struct {
		status Status
		want   bool
	}{
		{StatusUnknown, false},
		{StatusPending, false},
		{StatusCreating, false},
		{StatusReady, true},
		{StatusFailed, true},
		{StatusDestroying, false},
		{StatusDestroyed, true},
	}

	for _, tt := range tests {
		t.Run(tt.status.String(), func(t *testing.T) {
			if got := tt.status.IsTerminal(); got != tt.want {
				t.Errorf("IsTerminal() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestStatus_IsHealthy(t *testing.T) {
	tests := []struct {
		status Status
		want   bool
	}{
		{StatusUnknown, false},
		{StatusPending, false},
		{StatusCreating, false},
		{StatusReady, true},
		{StatusFailed, false},
		{StatusDestroying, false},
		{StatusDestroyed, false},
	}

	for _, tt := range tests {
		t.Run(tt.status.String(), func(t *testing.T) {
			if got := tt.status.IsHealthy(); got != tt.want {
				t.Errorf("IsHealthy() = %v, want %v", got, tt.want)
			}
		})
	}
}
