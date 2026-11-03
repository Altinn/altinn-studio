package telemetry

import "testing"

//nolint:paralleltest // The leadership state is global.
func TestEndLeadershipStopsReportingAsLeader(t *testing.T) {
	elected.Store(true)
	t.Cleanup(func() {
		elected.Store(false)
		stopped.Store(false)
	})

	if !leading() {
		t.Fatal("leading() = false after election, want true")
	}
	EndLeadership()
	if leading() {
		t.Error("leading() = true after EndLeadership, want false")
	}
}
