package localtestv2

import (
	"context"
	"errors"
	"fmt"
	"maps"
	"slices"
	"strings"

	containertypes "altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/osutil"
)

// A start that fails after it began creating resources does not leave a half-started environment behind, except to
// show why a container never became healthy.

// startContainers applies the containers and waits for the front door. A start that fails is cleaned up
// (failedStart).
func (e *Env) startContainers(ctx context.Context, opts *Options) error {
	probes := newProber(e.client, e.out.Verbosef).probes
	if err := e.applyResources(ctx, resources(opts, probes), len(opts.Dev) > 0); err != nil {
		return e.failedStart(ctx, opts, err)
	}
	e.out.Println("Waiting for the front door to answer...")
	if err := waitFrontDoor(ctx, e.out, frontDoorHealthURL(opts)); err != nil {
		return e.failedStart(ctx, opts, fmt.Errorf("localtest-v2 did not become healthy: %w", err))
	}
	return nil
}

// failedStart handles a start that failed after it began creating resources. A container that never became healthy
// is left running, with the rest and the state file, so its logs can be read. env down removes them. Any other
// failure (a create or start error, the public port taken, a cancelled start) removes what the start created, as
// Down does, and the state file, so nothing is left half up. The original error is returned, joined with the
// cleanup's when that fails too.
func (e *Env) failedStart(ctx context.Context, opts *Options, err error) error {
	if ctx.Err() == nil && (errors.Is(err, errUnhealthy) || errors.Is(err, errProbeTimeout)) {
		return fmt.Errorf(
			"%w; the containers are left running for inspection: '%s env logs -r %s' shows their logs, "+
				"'%s env down -r %s' removes them",
			err, osutil.CurrentBin(), Name, osutil.CurrentBin(), Name,
		)
	}
	if portTaken(err) {
		err = fmt.Errorf(
			"%w: port %d is in use by another process; '%s env up -r %s --port 0' picks a free one, or give "+
				"another --port: %w",
			errPortTaken, opts.Origin.Port, osutil.CurrentBin(), Name, err,
		)
	}
	if teardownErr := e.removeFailedStart(ctx); teardownErr != nil {
		return errors.Join(err, fmt.Errorf("remove what the failed start created: %w", teardownErr))
	}
	return err
}

// removeFailedStart removes the containers, the probe containers and the network of a failed start, and the state
// file: the recorded port may never have bound, so a later --port 0 picks again. Named volumes are kept, as by Down.
// It runs on a context of its own, so a start cancelled with Ctrl+C is cleaned up too.
func (e *Env) removeFailedStart(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), teardownTimeout)
	defer cancel()
	created, err := e.managedResources(ctx)
	if err == nil && len(created) > 0 {
		err = e.teardown(ctx, "Removing what the failed start created...")
	}
	probes, probeErr := e.removeProbes(ctx)
	removed := slices.Concat(created, probes)
	if err == nil && len(removed) > 0 {
		e.out.Printlnf("Removed after the failed start: %s", strings.Join(removed, ", "))
	}
	return errors.Join(err, probeErr, e.forgetState(ctx, nil))
}

// removeProbes removes the probe containers a failed start left. Normally each probe removes its own when it ends.
func (e *Env) removeProbes(ctx context.Context) ([]string, error) {
	var removed []string
	var errs []error
	for _, name := range slices.Sorted(maps.Keys(stack().Containers)) {
		probe := probeContainerOf(name)
		err := e.client.ContainerRemove(ctx, probe, true)
		switch {
		case err == nil:
			removed = append(removed, probe)
		case !errors.Is(err, containertypes.ErrContainerNotFound):
			errs = append(errs, fmt.Errorf("remove probe container %s: %w", probe, err))
		}
	}
	return removed, errors.Join(errs...)
}
