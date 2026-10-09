package harness

import (
	"context"
	"testing"
	"time"

	"altinn.studio/devenv/pkg/container"
)

// WithContainerClient calls run with the fixture's container client, or a detected one when no fixture is loaded.
func WithContainerClient(t *testing.T, run func(container.ContainerClient)) {
	t.Helper()

	if Runtime != nil {
		run(Runtime.ContainerClient)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	client, err := container.Detect(ctx)
	if err != nil {
		t.Fatalf("Failed to detect container runtime: %v", err)
	}
	defer func() {
		if closeErr := client.Close(); closeErr != nil {
			t.Logf("Failed to close container client: %v", closeErr)
		}
	}()

	run(client)
}
