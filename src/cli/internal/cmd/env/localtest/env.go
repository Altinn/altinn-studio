package localtest

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	"altinn.studio/devenv/pkg/container"
	containertypes "altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	"altinn.studio/studioctl/internal/config"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/install"
	"altinn.studio/studioctl/internal/networking"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

// Sentinel errors for the localtest package.
var (
	// ErrUnknownComponent is returned when an unknown component is specified for logs.
	ErrUnknownComponent = errors.New("unknown component")

	// ErrNotRunning is returned when localtest is not running.
	ErrNotRunning = errors.New("localtest not running")

	// ErrLegacyLocaltestRunning is returned when legacy localtest containers are detected.
	ErrLegacyLocaltestRunning = errors.New("legacy localtest is running (started outside this CLI)")
)

// teardownTimeout is the maximum time to wait for environment teardown.
const teardownTimeout = 30 * time.Second

// Env implements envtypes.Env for the localtest runtime.
type Env struct {
	cfg           *config.Config
	out           *ui.Output
	client        container.ContainerClient
	runtimeConfig *runtimeConfigResolver
	logs          *logStreamer
}

// NewEnv creates a new localtest environment manager.
func NewEnv(cfg *config.Config, out *ui.Output, client container.ContainerClient) *Env {
	return &Env{
		cfg:           cfg,
		out:           out,
		client:        client,
		runtimeConfig: newRuntimeConfigResolver(cfg, client, out.Verbosef),
		logs:          newLogStreamer(client, out),
	}
}

// Preflight validates prerequisites before startup.
func (e *Env) Preflight(ctx context.Context) error {
	return CheckForLegacyLocaltest(ctx, e.client)
}

// Up starts the localtest environment.
func (e *Env) Up(ctx context.Context, opts envtypes.UpOptions) error {
	e.out.Verbosef("Using container runtime: %s", e.client.Name())

	runtimeCfg, err := e.runtimeConfig.Build(ctx, opts.Port)
	if err != nil {
		return err
	}
	e.out.Verbosef("Host gateway IP: %s", runtimeCfg.HostGateway)

	buildOpts, err := e.buildResourceOptions(ctx, runtimeCfg, opts.Monitoring)
	if err != nil {
		return err
	}
	e.out.Verbosef("Image mode: %s", buildOpts.ImageMode)

	if err := e.ensureResources(ctx, buildOpts); err != nil {
		return err
	}

	if err := e.applyResources(ctx, buildOpts); err != nil {
		return err
	}

	localtestURL := FormatLocaltestURL(runtimeCfg.LoadBalancerPort)

	if opts.OpenBrowser {
		e.out.Verbosef("Opening browser to: %s\n", localtestURL)
		if err := osutil.OpenContext(ctx, localtestURL); err != nil {
			e.out.Warningf("Failed to open browser: %v", err)
		}
	}

	if !opts.Detach {
		return e.runForeground(ctx, localtestURL)
	}

	e.out.Println("\nLocaltest started in background.")
	e.out.Printf("Access the platform at: %s\n", localtestURL)
	e.out.Printf("Use '%s env logs' to view logs.\n", osutil.CurrentBin())
	e.out.Printf("Use '%s env down' to stop.\n", osutil.CurrentBin())

	return nil
}

// Down stops the localtest environment.
func (e *Env) Down(ctx context.Context) error {
	e.out.Verbosef("Using container runtime: %s", e.client.Name())

	hasResources, err := e.hasManagedResources(ctx)
	if err != nil {
		return err
	}
	if !hasResources {
		return envtypes.ErrAlreadyStopped
	}

	opts := e.buildDestroyOptions()

	spinner := ui.NewSpinner(e.out, "Stopping localtest environment...")
	if !e.cfg.Verbose {
		spinner.Start()
	}

	if err := e.destroyResources(ctx, opts); err != nil {
		spinner.StopWithError("Failed to stop environment")
		return fmt.Errorf("stop environment: %w", err)
	}

	spinner.StopWithSuccess("Environment stopped")
	return nil
}

// Status returns the localtest environment status.
func (e *Env) Status(ctx context.Context) (*Status, error) {
	// TODO: graph resource model package should handle this (retrieving the current state of a graph of resources).
	status := newStatus()

	containers := coreContainerNames()
	runningCoreContainers := 0
	for _, name := range containers {
		state, err := e.client.ContainerState(ctx, name)
		if err != nil {
			if errors.Is(err, containertypes.ErrContainerNotFound) {
				continue
			}
			return nil, fmt.Errorf("get state for container %q: %w", name, err)
		}

		info := newContainerStatus(name, state.Status)
		status.Containers = append(status.Containers, info)

		if state.Running {
			runningCoreContainers++
		}
	}
	status.Running = runningCoreContainers == len(containers)

	return &status, nil
}

// Logs streams localtest environment logs.
func (e *Env) Logs(ctx context.Context, opts envtypes.LogsOptions) error {
	return e.logs.Stream(ctx, opts.Component, opts.Follow)
}

func (e *Env) hasManagedResources(ctx context.Context) (bool, error) {
	graph, err := buildResourceGraph(BuildResourcesForDestroy(e.buildDestroyOptions()))
	if err != nil {
		return false, fmt.Errorf("build resource graph: %w", err)
	}

	executor := resource.NewExecutor(e.client)
	statuses, err := executor.Status(ctx, graph)
	if err != nil {
		return false, fmt.Errorf("get resource status: %w", err)
	}

	for _, res := range graph.All() {
		switch res.(type) {
		case *resource.Container, *resource.Network:
			status, ok := statuses[res.ID()]
			if !ok {
				return true, nil
			}
			if status != resource.StatusDestroyed {
				return true, nil
			}
		}
	}

	return false, nil
}

func (e *Env) runForeground(
	ctx context.Context,
	localtestURL string,
) error {
	e.out.Println("\nLocaltest is running. Press Ctrl+C to stop.")
	e.out.Printf("Access the platform at: %s\n", localtestURL)

	if err := e.logs.Stream(ctx, "", true); err != nil {
		e.out.Verbosef("log streaming ended: %v", err)
	}

	e.out.Println("\nStopping localtest environment...")

	teardownCtx, cancel := context.WithTimeout(context.Background(), teardownTimeout)
	defer cancel()

	destroyOpts := e.buildDestroyOptions()

	//nolint:contextcheck // intentionally using new context for cleanup after cancellation
	if err := e.destroyResources(teardownCtx, destroyOpts); err != nil {
		e.out.Warningf("Failed to stop environment cleanly: %v", err)
		return err
	}
	e.out.Println("Environment stopped.")
	return nil
}

func (e *Env) applyResources(ctx context.Context, opts ResourceBuildOptions) error {
	graph, err := buildResourceGraph(BuildResources(opts))
	if err != nil {
		return err
	}

	spinnerMsg := "Starting localtest environment..."
	if opts.ImageMode == DevMode {
		spinnerMsg = "Building and starting localtest environment (dev mode)..."
	}

	spinner := ui.NewSpinner(e.out, spinnerMsg)
	if !e.cfg.Verbose {
		spinner.Start()
	}

	executor := resource.NewExecutor(e.client)
	if err := executor.Apply(ctx, graph); err != nil {
		spinner.StopWithError("Failed to start environment")
		return fmt.Errorf("start environment: %w", err)
	}

	spinner.StopWithSuccess("Environment started")
	return nil
}

func (e *Env) destroyResources(ctx context.Context, opts ResourceDestroyOptions) error {
	// TODO: we should probably load resources as "current state" instead
	graph, err := buildResourceGraph(BuildResourcesForDestroy(opts))
	if err != nil {
		return err
	}

	executor := resource.NewExecutor(e.client)
	if err := executor.Destroy(ctx, graph); err != nil {
		return fmt.Errorf("destroy resources: %w", err)
	}
	return nil
}

func (e *Env) buildDestroyOptions() ResourceDestroyOptions {
	return ResourceDestroyOptions{
		DataDir:           e.cfg.DataDir,
		Images:            e.cfg.Images,
		IncludeMonitoring: true, // include all for cleanup
		Installation:      e.client.Installation(),
	}
}

func (e *Env) ensureResources(ctx context.Context, buildOpts ResourceBuildOptions) error {
	if !install.IsInstalled(e.cfg.DataDir, e.cfg.Version) {
		if err := e.installResources(ctx, false); err != nil {
			return err
		}
		if err := ValidateResourceHostPaths(buildOpts); err != nil {
			return fmt.Errorf("validate resources: %w", err)
		}
		return nil
	}

	if err := ValidateResourceHostPaths(buildOpts); err != nil {
		e.out.Verbosef("Resource layout invalid, forcing reinstall: %v", err)
		if installErr := e.installResources(ctx, true); installErr != nil {
			return installErr
		}
		if err := ValidateResourceHostPaths(buildOpts); err != nil {
			return fmt.Errorf("validate resources after reinstall: %w", err)
		}
	}

	return nil
}

func buildResourceGraph(resources []resource.Resource) (*resource.Graph, error) {
	graph := resource.NewGraph()
	for _, res := range resources {
		if err := graph.Add(res); err != nil {
			return nil, fmt.Errorf("add resource %q to graph: %w", res.ID(), err)
		}
	}
	if err := graph.Validate(); err != nil {
		return nil, fmt.Errorf("validate resource graph: %w", err)
	}
	return graph, nil
}

func (e *Env) installResources(ctx context.Context, force bool) error {
	e.out.Println("Installing localtest resources...")
	installOpts := install.Options{
		DataDir: e.cfg.DataDir,
		Version: e.cfg.Version,
		Force:   force,
	}
	if err := install.Install(ctx, installOpts); err != nil {
		return fmt.Errorf("install resources: %w", err)
	}
	e.out.Verbosef("Resources installed to: %s", e.cfg.DataDir)
	return nil
}

func (e *Env) buildResourceOptions(
	ctx context.Context,
	runtimeCfg RuntimeConfig,
	monitoring bool,
) (ResourceBuildOptions, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return ResourceBuildOptions{}, fmt.Errorf("get working directory: %w", err)
	}

	imageMode, devConfig := detectImageMode(ctx, cwd)

	return ResourceBuildOptions{
		DataDir:           e.cfg.DataDir,
		RuntimeConfig:     runtimeCfg,
		IncludeMonitoring: monitoring,
		ImageMode:         imageMode,
		Images:            e.cfg.Images,
		DevConfig:         devConfig,
	}, nil
}

func detectImageMode(ctx context.Context, cwd string) (ImageMode, *DevImageConfig) {
	devModeEnv := os.Getenv(config.EnvInternalDevMode)
	if devModeEnv != "true" && devModeEnv != "1" {
		return ReleaseMode, nil
	}

	detection, err := repocontext.Detect(ctx, cwd, "")
	if err != nil || !detection.InStudioRepo {
		return ReleaseMode, nil
	}

	devCfg := DevImageConfig{RepoRoot: detection.StudioRoot}
	if _, err := os.Stat(devCfg.LocaltestDockerfile()); err != nil {
		return ReleaseMode, nil
	}

	return DevMode, &devCfg
}

// FormatLocaltestURL returns the localtest URL, omitting port 80 since browsers default to it.
func FormatLocaltestURL(port string) string {
	if port == "80" {
		return "http://" + networking.LocalDomain
	}
	return "http://" + networking.LocalDomain + ":" + port
}
