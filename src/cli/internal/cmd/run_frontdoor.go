package cmd

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"

	envlocaltestv2 "altinn.studio/studioctl/internal/cmd/env/localtestv2"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/localtestv2"
	"altinn.studio/studioctl/internal/localtestv2/frontdoor"
	"altinn.studio/studioctl/internal/osutil"
)

// Against localtest-v2, the front door (the localtest container) routes /{org}/{app}/ to an app once studioctl-server
// has registered it, and provisions the app from its API on registration; a run waits for that. With --dev-frontend,
// the run also routes app-frontend.<public host>, where the app's assets then point, to the frontend dev server on
// the host's port 8080, where the localtest runtime's host bridge sent that host too (`yarn docker` in the app frontend
// builds and serves dist there with CORS, `yarn start --port 8080` runs Vite there), and removes the route when the run
// stops. Without localtest-v2 both do nothing.
const frontendDevServerPort = 8080

var errFrontDoorRegistration = errors.New("the localtest-v2 front door has not registered the app")

// publicTopology is the public URLs an app run and its environment use: the running localtest-v2 environment's origin
// (env up --host, --port), else the default.
func publicTopology(cfg *config.Config) (envtopology.Local, error) {
	if cfg == nil {
		return envtopology.NewLocal(envtopology.DefaultIngressPortString()), nil
	}
	topology, err := localtestv2.CurrentTopology(cfg)
	if err != nil {
		return topology, fmt.Errorf("read localtest-v2 state: %w", err)
	}
	return topology, nil
}

// hostAppURL is the address the front door reaches an app on the host at: baseURL's port through the host gateway.
func hostAppURL(baseURL string) (string, error) {
	parsed, err := url.Parse(baseURL)
	if err != nil {
		return "", fmt.Errorf("parse app URL %q: %w", baseURL, err)
	}
	port, err := strconv.Atoi(parsed.Port())
	if err != nil {
		return "", fmt.Errorf("app URL %q has no port: %w", baseURL, err)
	}
	return frontdoor.AppURL(port), nil
}

// waitForFrontDoorRegistration waits, while the localtest-v2 runtime is up, until the front door lists the app at want
// (hostAppURL for an app on the host, the alias on the localtest-v2 network for an app container) with a provisioning that
// succeeded at or after since.
func waitForFrontDoorRegistration(
	ctx context.Context,
	cfg *config.Config,
	topology envtopology.Local,
	appID string,
	want string,
	since time.Time,
	timeout time.Duration,
) error {
	if _, up, err := localtestv2.ReadState(cfg); err != nil || !up {
		return err //nolint:wrapcheck // ReadState's error names the state file.
	}
	org, app, _ := strings.Cut(appID, "/")

	waitCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	err := frontdoor.NewClient(topology.LocaltestURL()).WaitForApp(waitCtx, org, app, want, since)
	switch {
	case err == nil:
		return nil
	case ctx.Err() != nil:
		return fmt.Errorf("wait for the front door: %w", ctx.Err())
	case errors.Is(err, frontdoor.ErrUnreachable):
		return fmt.Errorf(
			"%w %s within %s: the front door at %s does not answer; check '%s env status -r %s'",
			errFrontDoorRegistration, appID, timeout, topology.LocaltestURL(), osutil.CurrentBin(), envlocaltestv2.Name,
		)
	default:
		return fmt.Errorf("%w %s at %s within %s: %w", errFrontDoorRegistration, appID, want, timeout, err)
	}
}

// registerDevFrontend routes the frontend dev server host to the dev server for a `--dev-frontend` run against
// localtest-v2, and returns what removes the route again; without the flag or the runtime it does nothing.
func (c *RunCommand) registerDevFrontend(
	ctx context.Context,
	topology envtopology.Local,
	flags runFlags,
) (func(), error) {
	noop := func() {}
	if !flags.devFrontend || c.cfg == nil {
		return noop, nil
	}
	if _, up, err := localtestv2.ReadState(c.cfg); err != nil || !up {
		return noop, err //nolint:wrapcheck // ReadState's error names the state file.
	}
	client := frontdoor.NewClient(topology.LocaltestURL())
	if err := client.PutFrontendDevServer(ctx, frontdoor.AppURL(frontendDevServerPort)); err != nil {
		return noop, fmt.Errorf("route the frontend dev server: %w", err)
	}
	c.out.Verbosef(
		"Routed %s to the frontend dev server on port %d",
		topology.FrontendDevServerHostName(),
		frontendDevServerPort,
	)
	return func() {
		cleanupCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), studioctlServerCleanupTimeout)
		defer cancel()
		if err := client.DeleteFrontendDevServer(cleanupCtx); err != nil {
			c.out.Verbosef("failed to remove the frontend dev server route: %v", err)
		}
	}, nil
}
