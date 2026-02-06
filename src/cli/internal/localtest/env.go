package localtest

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"runtime"
	"strconv"
	"sync"
	"time"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/browser"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/docker"
	"altinn.studio/studioctl/internal/install"
	"altinn.studio/studioctl/internal/interfaces"
	"altinn.studio/studioctl/internal/networking"
	"altinn.studio/studioctl/internal/ui"
)

// Sentinel errors for the localtest package.
var (
	// ErrUnknownComponent is returned when an unknown component is specified for logs.
	ErrUnknownComponent = errors.New("unknown component")

	// ErrNotRunning is returned when localtest is not running.
	ErrNotRunning = errors.New("localtest not running")

	// ErrLegacyLocaltestRunning is returned when legacy localtest containers are detected.
	ErrLegacyLocaltestRunning = errors.New("legacy localtest is running (started outside studioctl)")
)

// teardownTimeout is the maximum time to wait for environment teardown.
const teardownTimeout = 30 * time.Second

// Buffer size constants for log scanner.
const (
	logScannerBufSize    = 64 * 1024
	logScannerMaxBufSize = 1024 * 1024
)

// Env implements interfaces.Env for the localtest runtime.
type Env struct {
	cfg    *config.Config
	out    *ui.Output
	client container.ContainerClient
}

// NewEnv creates a new localtest environment manager.
func NewEnv(cfg *config.Config, out *ui.Output, client container.ContainerClient) *Env {
	return &Env{cfg: cfg, out: out, client: client}
}

// Up starts the localtest environment.
func (e *Env) Up(ctx context.Context, opts interfaces.EnvUpOptions) error {
	e.out.Verbosef("Using container runtime: %s", e.client.Name())

	runtimeCfg, err := e.buildRuntimeConfig(ctx, opts.Port)
	if err != nil {
		return err
	}
	e.out.Verbosef("Host gateway IP: %s", runtimeCfg.HostGateway)

	// Detect image mode and build options
	buildOpts, err := e.buildResourceOptions(runtimeCfg, opts.Monitoring)
	if err != nil {
		return err
	}
	e.out.Verbosef("Image mode: %s", buildOpts.ImageMode)

	// Auto-install resources if not already installed
	if !install.IsInstalled(e.cfg.DataDir, e.cfg.Version) {
		e.out.Println("Installing localtest resources...")

		installOpts := install.Options{
			DataDir: e.cfg.DataDir,
			Version: e.cfg.Version,
			Force:   false,
		}

		if err := install.Install(ctx, installOpts); err != nil {
			return fmt.Errorf("install resources: %w", err)
		}
		e.out.Verbosef("Resources installed to: %s", e.cfg.DataDir)
	}

	if err := e.applyResources(ctx, buildOpts); err != nil {
		return err
	}

	localtestURL := FormatLocaltestURL(runtimeCfg.LoadBalancerPort)

	// Open browser if requested
	if opts.OpenBrowser {
		e.out.Verbosef("Opening browser to: %s\n", localtestURL)
		if err := browser.OpenContext(ctx, localtestURL); err != nil {
			e.out.Warningf("Failed to open browser: %v", err)
		}
	}

	if !opts.Detach {
		return e.runForeground(ctx, localtestURL)
	}

	e.out.Println("\nLocaltest started in background.")
	e.out.Printf("Access the platform at: %s\n", localtestURL)
	e.out.Println("Use 'studioctl env logs' to view logs.")
	e.out.Println("Use 'studioctl env down' to stop.")

	return nil
}

// Down stops the localtest environment.
func (e *Env) Down(ctx context.Context) error {
	e.out.Verbosef("Using container runtime: %s", e.client.Name())

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
func (e *Env) Status(ctx context.Context) (interfaces.LocaltestStatus, error) {
	return GetStatus(ctx, e.client)
}

// Logs streams localtest environment logs.
func (e *Env) Logs(ctx context.Context, opts interfaces.EnvLogsOptions) error {
	return e.streamLogs(ctx, opts.Component, opts.Follow)
}

// runForeground runs localtest in foreground mode, streaming logs until interrupted,
// then tears down the environment.
func (e *Env) runForeground(
	ctx context.Context,
	localtestURL string,
) error {
	e.out.Println("\nLocaltest is running. Press Ctrl+C to stop.")
	e.out.Printf("Access the platform at: %s\n", localtestURL)

	// Stream logs until interrupted - error is expected on Ctrl+C
	if err := e.streamLogs(ctx, "", true); err != nil {
		e.out.Debugf("log streaming ended: %v", err)
	}

	// Teardown on exit - use fresh context since original may be cancelled
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

// applyResources starts the localtest environment by applying the resource graph.
func (e *Env) applyResources(ctx context.Context, opts ResourceBuildOptions) error {
	graph := resource.NewGraph()
	resources := BuildResources(opts)
	for _, res := range resources {
		if err := graph.Add(res); err != nil {
			return fmt.Errorf("add resource %q to graph: %w", res.ID(), err)
		}
	}

	if err := graph.Validate(); err != nil {
		return fmt.Errorf("validate resource graph: %w", err)
	}

	// Determine spinner message based on image mode
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

// destroyResources tears down localtest containers and networks.
func (e *Env) destroyResources(ctx context.Context, opts ResourceDestroyOptions) error {
	graph := resource.NewGraph()
	// TODO: we should probably load resources as "current state" instead
	resources := BuildResourcesForDestroy(opts)
	for _, res := range resources {
		if err := graph.Add(res); err != nil {
			return fmt.Errorf("add resource %q to graph: %w", res.ID(), err)
		}
	}

	if err := graph.Validate(); err != nil {
		return fmt.Errorf("validate resource graph: %w", err)
	}

	executor := resource.NewExecutor(e.client)
	if err := executor.Destroy(ctx, graph); err != nil {
		return fmt.Errorf("destroy resources: %w", err)
	}
	return nil
}

// buildDestroyOptions returns ResourceDestroyOptions for destroying resources.
func (e *Env) buildDestroyOptions() ResourceDestroyOptions {
	return ResourceDestroyOptions{
		DataDir:           e.cfg.DataDir,
		Images:            e.cfg.Images,
		IncludeMonitoring: true, // include all for cleanup
		Installation:      e.client.Installation(),
	}
}

// buildRuntimeConfig detects the container runtime and builds the runtime configuration.
func (e *Env) buildRuntimeConfig(ctx context.Context, portFlag int) (RuntimeConfig, error) {
	// Get runtime installation
	installation := e.client.Installation()

	// Resolve network metadata (cache stored in home directory)
	n := networking.NewNetworking(e.client, e.cfg, e.out)
	metadata, cached, err := n.ResolveNetworkMetadata(ctx)
	if err != nil {
		return RuntimeConfig{}, fmt.Errorf("resolve network metadata: %w", err)
	}
	if cached {
		e.out.Debugf("using cached network metadata")
	}

	// Determine port: user flag > default (8000)
	port := portFlag
	if port == 0 {
		port = 8000
	}

	// Get current user to run containers as (prevents root-owned bind mount files)
	// On Windows, leave empty as os.Getuid() returns -1
	// TODO: we should probably handle this better, what about the WSL mode for Docker Desktop?
	var user string
	if runtime.GOOS != "windows" {
		user = fmt.Sprintf("%d:%d", os.Getuid(), os.Getgid())
	}

	return RuntimeConfig{
		HostGateway:      metadata.HostGateway,
		LoadBalancerPort: strconv.Itoa(port),
		User:             user,
		Installation:     installation,
	}, nil
}

// buildResourceOptions detects image mode and builds resource options.
func (e *Env) buildResourceOptions(runtimeCfg RuntimeConfig, monitoring bool) (ResourceBuildOptions, error) {
	// Get current working directory for dev mode detection
	cwd, err := os.Getwd()
	if err != nil {
		return ResourceBuildOptions{}, fmt.Errorf("get working directory: %w", err)
	}

	// Detect image mode based on STUDIOCTL_INTERNAL_DEVMODE env var
	imageMode, devConfig := DetectImageMode(cwd)

	return ResourceBuildOptions{
		DataDir:           e.cfg.DataDir,
		RuntimeConfig:     runtimeCfg,
		IncludeMonitoring: monitoring,
		ImageMode:         imageMode,
		Images:            e.cfg.Images,
		DevConfig:         devConfig,
	}, nil
}

// streamLogs streams logs from localtest containers with color-coded prefixes.
func (e *Env) streamLogs(ctx context.Context, component string, follow bool) error {
	// Container names to stream (order determines color assignment)
	allContainers := AllContainerNames(true)

	// Filter by component if specified
	var containers []string
	if component != "" {
		for _, name := range allContainers {
			if name == component {
				containers = []string{name}
				break
			}
		}
		if len(containers) == 0 {
			return fmt.Errorf(
				"%w: %s (available: %s, %s, monitoring_*)",
				ErrUnknownComponent,
				component,
				ContainerLocaltest,
				ContainerPDF3,
			)
		}
	} else {
		containers = allContainers
	}

	// Check which containers are running
	var runningContainers []string
	for _, name := range containers {
		state, err := e.client.ContainerState(ctx, name)
		if err != nil {
			continue // container doesn't exist
		}
		if state.Running {
			runningContainers = append(runningContainers, name)
		}
	}

	if len(runningContainers) == 0 {
		return fmt.Errorf("%w: no containers are running", ErrNotRunning)
	}

	e.out.Verbosef("Streaming logs from: %v", runningContainers)

	// Start log streaming for each container
	var wg sync.WaitGroup
	for i, name := range runningContainers {
		logs, err := e.client.ContainerLogs(ctx, name, follow, "100")
		if err != nil {
			e.out.Warningf("Failed to get logs for %s: %v", name, err)
			continue
		}

		wg.Add(1)
		go e.streamContainerLogs(ctx, &wg, logs, name, i)
	}

	// Wait for all log streams to complete (or context cancellation)
	wg.Wait()
	return nil
}

// streamContainerLogs reads logs from a container and prints with color-coded prefix.
func (e *Env) streamContainerLogs(
	ctx context.Context,
	wg *sync.WaitGroup,
	logs io.ReadCloser,
	name string,
	colorIdx int,
) {
	defer wg.Done()
	defer func() {
		if err := logs.Close(); err != nil {
			e.out.Debugf("failed to close log stream for %s: %v", name, err)
		}
	}()

	prefix := e.out.ContainerPrefix(name, colorIdx)

	scanner := bufio.NewScanner(logs)
	buf := make([]byte, logScannerBufSize)
	scanner.Buffer(buf, logScannerMaxBufSize)

	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return
		default:
			line := docker.StripMultiplexedHeader(scanner.Text())
			if _, err := fmt.Fprintln(os.Stdout, prefix+line); err != nil {
				e.out.Debugf("failed to write log line for %s: %v", name, err)
				return
			}
		}
	}
}

// FormatLocaltestURL returns the localtest URL, omitting port 80 since browsers default to it.
func FormatLocaltestURL(port string) string {
	if port == "80" {
		return "http://" + networking.LocalDomain
	}
	return "http://" + networking.LocalDomain + ":" + port
}
