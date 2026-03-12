package simple

import (
	"fmt"
	"os"
	"testing"

	"altinn.studio/pdf3/test/harness"
)

func TestMain(m *testing.M) {
	harness.Init()

	collector := harness.NewLogsCollector(harness.Runtime)
	if err := collector.Start(); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "Failed to start log streaming: %v\n", err)
		os.Exit(1)
	}

	code := m.Run()

	collector.Stop()
	if err := collector.CheckForCrashes(); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "\nCRASHES DETECTED:\n%v\n", err)
		os.Exit(1)
	}

	os.Exit(code)
}
