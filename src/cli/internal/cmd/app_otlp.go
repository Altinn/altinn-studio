package cmd

import (
	"context"
	"time"

	containerruntime "altinn.studio/devenv/pkg/container"
	envlocaltest "altinn.studio/studioctl/internal/cmd/env/localtest"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/ui"
)

// otlpCollectorCheckTimeout bounds the check for a running collector. `app env` runs whenever an app starts from
// an IDE, and the app waits a few seconds for it at most.
const otlpCollectorCheckTimeout = time.Second

// runningOTLPCollector returns the environment's collector while it runs, and nil when it does not or the container
// runtime cannot tell: an app without a collector simply exports nothing.
func runningOTLPCollector(
	ctx context.Context,
	out *ui.Output,
	topology envtopology.Local,
) *envtopology.OTLPCollector {
	ctx, cancel := context.WithTimeout(ctx, otlpCollectorCheckTimeout)
	defer cancel()

	client, err := containerruntime.Detect(ctx)
	if err != nil {
		out.Verbosef("no OpenTelemetry collector: connect to container runtime: %v", err)
		return nil
	}
	defer func() {
		if cerr := client.Close(); cerr != nil {
			out.Verbosef("failed to close container client: %v", cerr)
		}
	}()

	collector, running, err := envlocaltest.RunningCollector(ctx, client, topology)
	if err != nil {
		out.Verbosef("no OpenTelemetry collector: %v", err)
		return nil
	}
	if !running {
		return nil
	}
	return &collector
}
