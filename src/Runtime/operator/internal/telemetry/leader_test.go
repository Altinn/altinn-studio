package telemetry

import "testing"

//nolint:paralleltest // The leadership state is global.
func TestEndLeadershipStopsReportingAsLeader(t *testing.T) {
	elected.Store(true)
	t.Cleanup(func() {
		elected.Store(false)
		stopped.Store(false)
	})

	if !IsLeader() {
		t.Fatal("IsLeader() = false after election, want true")
	}
	EndLeadership()
	if IsLeader() {
		t.Error("IsLeader() = true after EndLeadership, want false")
	}
}
