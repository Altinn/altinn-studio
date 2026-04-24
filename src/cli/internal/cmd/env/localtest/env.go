package localtest

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"altinn.studio/devenv/pkg/container"
	containertypes "altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/appmanager"
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	localtestrenderer "altinn.studio/studioctl/internal/cmd/env/localtest/renderer"
	"altinn.studio/studioctl/internal/config"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/install"
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

	errResetTargetOutsideDataDir = errors.New("reset target outside data directory")
	errResetCleanupFailed        = errors.New("workflow-engine data cleanup helper failed")
	errResetTargetSymlink        = errors.New("reset target must not be a symlink")
)

// teardownTimeout is the maximum time to wait for environment teardown.
const teardownTimeout = 30 * time.Second

const cleanupHelperLogTail = "100"

const stoppingEnvironmentMessage = "Stopping localtest environment..."

// Env implements envtypes.Env for the localtest runtime.
type Env struct {
	cfg    *config.Config
	out    *ui.Output
	client container.ContainerClient
	logs   *logStreamer
}

// NewEnv creates a new localtest environment manager.
func NewEnv(cfg *config.Config, out *ui.Output, client container.ContainerClient) *Env {
	return &Env{
		cfg:    cfg,
		out:    out,
		client: client,
		logs:   newLogStreamer(client, out),
	}
}

// Preflight validates prerequisites before startup.
func (e *Env) Preflight(ctx context.Context, opts envtypes.UpOptions) error {
	return CheckForLegacyLocaltest(ctx, e.client, opts.PgAdmin)
}

// Up starts the localtest environment.
func (e *Env) Up(ctx context.Context, opts envtypes.UpOptions) error {
	toolchain := e.client.Toolchain()
	e.out.Verbosef("Using container toolchain: %s via %s", toolchain.Platform, toolchain.AccessMode)

	runtimeCfg := newRuntimeConfig()
	topology := envtopology.NewLocal(envtopology.DefaultIngressPortString())

	if ensureErr := e.ensureAppManager(ctx, topology); ensureErr != nil {
		return ensureErr
	}

	buildOpts, err := e.buildResourceOptions(ctx, runtimeCfg, topology, opts.Monitoring, opts.PgAdmin)
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

	localtestURL := topology.LocaltestURL()

	if opts.OpenBrowser {
		e.out.Verbosef("Opening browser to: %s", localtestURL)
		if err := osutil.OpenContext(ctx, localtestURL); err != nil {
			e.out.Warningf("Failed to open browser: %v", err)
		}
	}

	if !opts.Detach {
		return e.runForeground(ctx, localtestURL)
	}

	e.out.Println("")
	e.out.Println("Localtest started in background.")
	e.out.Printlnf("Access the platform at: %s", localtestURL)
	e.out.Printlnf("Use '%s env logs' to view logs.", osutil.CurrentBin())
	e.out.Printlnf("Use '%s env down' to stop.", osutil.CurrentBin())

	return nil
}

// Down stops the localtest environment.
func (e *Env) Down(ctx context.Context) error {
	toolchain := e.client.Toolchain()
	e.out.Verbosef("Using container toolchain: %s via %s", toolchain.Platform, toolchain.AccessMode)

	hasResources, err := e.hasManagedResources(ctx)
	if err != nil {
		return err
	}
	if !hasResources {
		return envtypes.ErrAlreadyStopped
	}

	if err := e.destroyResources(ctx, e.buildDestroyOptions(), stoppingEnvironmentMessage); err != nil {
		return fmt.Errorf("stop environment: %w", err)
	}

	e.out.Success("Environment stopped")
	return nil
}

// Reset stops localtest if needed and deletes persisted data.
func (e *Env) Reset(ctx context.Context) error {
	toolchain := e.client.Toolchain()
	e.out.Verbosef("Using container toolchain: %s via %s", toolchain.Platform, toolchain.AccessMode)

	if err := CheckForLegacyLocaltest(ctx, e.client, true); err != nil {
		return err
	}

	hasResources, err := e.hasManagedResources(ctx)
	if err != nil {
		return err
	}
	if hasResources {
		if err := e.destroyResources(ctx, e.buildDestroyOptions(), stoppingEnvironmentMessage); err != nil {
			return fmt.Errorf("stop environment: %w", err)
		}
	}

	e.out.Println("Deleting persisted localtest data...")
	if err := e.deletePersistedData(ctx); err != nil {
		return err
	}

	e.out.Success("Environment data reset")
	return nil
}

// Status returns the localtest environment status.
func (e *Env) Status(ctx context.Context) (*Status, error) {
	return e.status(ctx, false)
}

// StatusForUp returns status for the containers requested by env up.
func (e *Env) StatusForUp(ctx context.Context, opts envtypes.UpOptions) (*Status, error) {
	return e.status(ctx, opts.PgAdmin)
}

// Logs streams localtest environment logs.
func (e *Env) Logs(ctx context.Context, opts envtypes.LogsOptions) error {
	return e.logs.Stream(ctx, opts.Component, opts.Follow, opts.JSON)
}

func (e *Env) status(ctx context.Context, includePgAdmin bool) (*Status, error) {
	// TODO: graph resource model package should handle this (retrieving the current state of a graph of resources).
	status := newStatus()

	containers := coreContainerNames(includePgAdmin)
	runningCoreContainers := 0
	for _, name := range containers {
		state, err := e.client.ContainerState(ctx, name)
		if err != nil {
			if errors.Is(err, containertypes.ErrContainerNotFound) {
				status.Containers = append(status.Containers, newContainerStatus(name, "not found"))
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
	status.AnyRunning = runningCoreContainers > 0

	return &status, nil
}

func (e *Env) ensureAppManager(ctx context.Context, topology envtopology.Local) error {
	if err := appmanager.EnsureStarted(
		ctx,
		e.cfg,
		topology.IngressPort(),
	); err != nil {
		return fmt.Errorf("ensure app-manager: %w", err)
	}
	return nil
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
	e.out.Println("")
	e.out.Println("Localtest is running. Press Ctrl+C to stop.")
	e.out.Printlnf("Access the platform at: %s", localtestURL)

	if err := e.logs.Stream(ctx, "", true, false); err != nil {
		e.out.Verbosef("log streaming ended: %v", err)
	}

	e.out.Println("")
	e.out.Println(stoppingEnvironmentMessage)

	teardownCtx, cancel := context.WithTimeout(context.Background(), teardownTimeout)
	defer cancel()

	destroyOpts := e.buildDestroyOptions()

	//nolint:contextcheck // intentionally using new context for cleanup after cancellation
	if err := e.destroyResources(teardownCtx, destroyOpts, ""); err != nil {
		e.out.Warningf("Failed to stop environment cleanly: %v", err)
		return err
	}
	e.out.Println("Environment stopped.")
	return nil
}

func (e *Env) applyResources(ctx context.Context, opts ResourceBuildOptions) error {
	resources := BuildResources(opts)
	graph, err := buildResourceGraph(resources)
	if err != nil {
		return err
	}

	executor := resource.NewExecutor(e.client)
	spinnerMsg := "Starting localtest environment..."
	if opts.ImageMode == DevMode {
		spinnerMsg = "Building and starting localtest environment (dev mode)..."
	}

	var renderer localtestrenderer.Renderer
	switch localtestrenderer.DetectMode(e.out, e.cfg.Verbose) {
	case localtestrenderer.ModeTable:
		renderer = localtestrenderer.NewTable(e.out, resources, localtestrenderer.OperationApply)
	case localtestrenderer.ModeCompact:
		renderer = localtestrenderer.NewCompact(e.out, resources, localtestrenderer.OperationApply)
	case localtestrenderer.ModeLog:
		renderer = localtestrenderer.NewLog(e.out, resources, localtestrenderer.OperationApply, spinnerMsg)
	}
	renderer.Start()
	executor.SetObserver(renderer)

	if _, err := executor.Apply(ctx, graph); err != nil {
		renderer.FailAll(err.Error())
		renderer.Stop()
		return fmt.Errorf("start environment: %w", err)
	}

	renderer.Stop()
	e.out.Success("Environment started")
	return nil
}

func (e *Env) destroyResources(ctx context.Context, opts ResourceDestroyOptions, logStartMessage string) error {
	// TODO: we should probably load resources as "current state" instead
	resources := BuildResourcesForDestroy(opts)
	graph, err := buildResourceGraph(resources)
	if err != nil {
		return err
	}

	executor := resource.NewExecutor(e.client)
	renderResources, err := currentDestroyRenderResources(ctx, executor, graph, resources)
	if err != nil {
		e.out.Verbosef("Failed to probe current resource status for destroy rendering: %v", err)
		renderResources = resources
	}
	var renderer localtestrenderer.Renderer
	switch localtestrenderer.DetectMode(e.out, e.cfg.Verbose) {
	case localtestrenderer.ModeTable:
		renderer = localtestrenderer.NewTable(e.out, renderResources, localtestrenderer.OperationDestroy)
	case localtestrenderer.ModeCompact:
		renderer = localtestrenderer.NewCompact(e.out, renderResources, localtestrenderer.OperationDestroy)
	case localtestrenderer.ModeLog:
		renderer = localtestrenderer.NewLog(
			e.out,
			renderResources,
			localtestrenderer.OperationDestroy,
			logStartMessage,
		)
	}
	renderer.Start()
	executor.SetObserver(renderer)

	if err := executor.Destroy(ctx, graph); err != nil {
		renderer.FailAll(err.Error())
		renderer.Stop()
		return fmt.Errorf("destroy resources: %w", err)
	}

	renderer.Stop()
	return nil
}

func currentDestroyRenderResources(
	ctx context.Context,
	executor *resource.Executor,
	graph *resource.Graph,
	resources []resource.Resource,
) ([]resource.Resource, error) {
	statuses, err := executor.Status(ctx, graph)
	if err != nil {
		return nil, fmt.Errorf("get resource status: %w", err)
	}

	return filterRenderResources(resources, statuses), nil
}

func filterRenderResources(
	resources []resource.Resource,
	statuses map[resource.ResourceID]resource.Status,
) []resource.Resource {
	filtered := make([]resource.Resource, 0, len(resources))
	for _, res := range resources {
		status, ok := statuses[res.ID()]
		if ok && status == resource.StatusDestroyed {
			continue
		}
		filtered = append(filtered, res)
	}
	return filtered
}

func (e *Env) buildDestroyOptions() ResourceDestroyOptions {
	return ResourceDestroyOptions{
		DataDir:           e.cfg.DataDir,
		Images:            e.cfg.Images,
		IncludeMonitoring: true, // include all for cleanup
	}
}

func (e *Env) ensureResources(ctx context.Context, buildOpts ResourceBuildOptions) error {
	if !install.IsInstalled(e.cfg.DataDir, e.cfg.Version) {
		if err := e.installResources(ctx, false); err != nil {
			return err
		}
	}

	if err := ensurePgpass(e.cfg.DataDir); err != nil {
		return err
	}
	if err := ensureLocaltestStorageDir(e.cfg.DataDir); err != nil {
		return err
	}
	if err := ensureWorkflowEngineDbDataDir(e.cfg.DataDir); err != nil {
		return err
	}

	if err := ValidateResourceHostPaths(buildOpts); err != nil {
		return e.reinstallResourcesAfterValidationFailure(ctx, buildOpts, err)
	}

	return nil
}

func (e *Env) reinstallResourcesAfterValidationFailure(
	ctx context.Context,
	buildOpts ResourceBuildOptions,
	cause error,
) error {
	e.out.Verbosef("Resource layout invalid, forcing reinstall: %v", cause)
	if err := e.installResources(ctx, true); err != nil {
		return err
	}
	if err := ensurePgpass(e.cfg.DataDir); err != nil {
		return err
	}
	if err := ensureLocaltestStorageDir(e.cfg.DataDir); err != nil {
		return err
	}
	if err := ensureWorkflowEngineDbDataDir(e.cfg.DataDir); err != nil {
		return err
	}
	if err := ValidateResourceHostPaths(buildOpts); err != nil {
		return fmt.Errorf("validate resources after reinstall: %w", err)
	}
	return nil
}

func ensureWorkflowEngineDbDataDir(dataDir string) error {
	if err := os.MkdirAll(workflowEngineDbDataPath(dataDir), osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create workflow-engine database data directory: %w", err)
	}
	return nil
}

func ensureLocaltestStorageDir(dataDir string) error {
	if err := os.MkdirAll(filepath.Join(dataDir, "AltinnPlatformLocal"), osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create localtest storage directory: %w", err)
	}
	return nil
}

func (e *Env) deletePersistedData(ctx context.Context) error {
	if err := removeResetDataPath(e.cfg.DataDir, filepath.Join(e.cfg.DataDir, "AltinnPlatformLocal")); err != nil {
		return err
	}
	return e.removeWorkflowEngineDbData(ctx, workflowEngineDbDataPath(e.cfg.DataDir))
}

func (e *Env) removeWorkflowEngineDbData(ctx context.Context, target string) error {
	targetAbs, exists, err := resetTargetPath(e.cfg.DataDir, target)
	if err != nil {
		return err
	}
	if !exists {
		return nil
	}

	if err := e.cleanupWorkflowEngineDbData(ctx, targetAbs); err != nil {
		return err
	}

	return removeResetDataPath(e.cfg.DataDir, target)
}

func (e *Env) cleanupWorkflowEngineDbData(ctx context.Context, targetAbs string) error {
	helperName := fmt.Sprintf("studioctl-reset-workflow-engine-db-%d", time.Now().UnixNano())
	containerCfg := containertypes.ContainerConfig{
		Labels:         nil,
		HealthCheck:    nil,
		Name:           helperName,
		Image:          e.cfg.Images.Core.WorkflowEngineDb.Ref(),
		User:           "",
		RestartPolicy:  "",
		ExtraHosts:     nil,
		NetworkAliases: nil,
		Volumes: []containertypes.VolumeMount{{
			HostPath:      targetAbs,
			ContainerPath: "/cleanup",
			ReadOnly:      false,
		}},
		Networks: nil,
		Ports:    nil,
		Env:      nil,
		Command:  []string{"sh", "-ceu", "rm -rf /cleanup/* /cleanup/.[!.]* /cleanup/..?*"},
		CapAdd:   nil,
		Detach:   true,
	}

	if _, err := e.client.CreateContainer(ctx, containerCfg); err != nil {
		return fmt.Errorf("start workflow-engine data cleanup helper: %w", err)
	}

	exitCode, waitErr := e.client.ContainerWait(ctx, helperName)
	failureDetails := ""
	if waitErr == nil && exitCode != 0 {
		failureDetails = e.cleanupHelperFailureDetails(ctx, helperName)
	}
	removeErr := e.client.ContainerRemove(ctx, helperName, true)
	if waitErr != nil {
		if removeErr != nil {
			e.out.Verbosef("failed to remove cleanup helper container %q: %v", helperName, removeErr)
		}
		return fmt.Errorf("wait for workflow-engine data cleanup helper: %w", waitErr)
	}
	if removeErr != nil {
		return fmt.Errorf("remove workflow-engine data cleanup helper: %w", removeErr)
	}
	if exitCode != 0 {
		if failureDetails != "" {
			return fmt.Errorf("%w: exit code %d: %s", errResetCleanupFailed, exitCode, failureDetails)
		}
		return fmt.Errorf("%w: exit code %d", errResetCleanupFailed, exitCode)
	}

	return nil
}

func (e *Env) cleanupHelperFailureDetails(ctx context.Context, helperName string) string {
	logs, err := e.client.ContainerLogs(ctx, helperName, false, cleanupHelperLogTail)
	if err != nil {
		e.out.Verbosef("failed to read cleanup helper logs for %q: %v", helperName, err)
		return ""
	}
	defer func() {
		if cerr := logs.Close(); cerr != nil {
			e.out.Verbosef("failed to close cleanup helper logs for %q: %v", helperName, cerr)
		}
	}()

	data, err := io.ReadAll(logs)
	if err != nil {
		e.out.Verbosef("failed to read cleanup helper log stream for %q: %v", helperName, err)
		return ""
	}

	text := strings.TrimSpace(string(data))
	if text == "" {
		return ""
	}
	return "logs: " + text
}

func removeResetDataPath(dataDir, target string) error {
	targetAbs, exists, err := resetTargetPath(dataDir, target)
	if err != nil {
		return err
	}
	if !exists {
		return nil
	}

	if err := os.RemoveAll(targetAbs); err != nil {
		return fmt.Errorf("remove persisted data %q: %w", targetAbs, err)
	}

	return nil
}

func resetTargetPath(dataDir, target string) (string, bool, error) {
	dataDirAbs, err := filepath.Abs(dataDir)
	if err != nil {
		return "", false, fmt.Errorf("resolve data directory: %w", err)
	}

	targetAbs, err := filepath.Abs(target)
	if err != nil {
		return "", false, fmt.Errorf("resolve reset target %q: %w", target, err)
	}

	rel, err := filepath.Rel(dataDirAbs, targetAbs)
	if err != nil {
		return "", false, fmt.Errorf("relativize reset target %q: %w", targetAbs, err)
	}
	if rel == "." || rel == "" || rel == ".." || strings.HasPrefix(rel, ".."+string(os.PathSeparator)) {
		return "", false, fmt.Errorf("%w: %s", errResetTargetOutsideDataDir, targetAbs)
	}

	info, err := os.Lstat(targetAbs)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return targetAbs, false, nil
		}
		return "", false, fmt.Errorf("stat reset target %q: %w", targetAbs, err)
	}
	if info.Mode()&os.ModeSymlink != 0 {
		return "", false, fmt.Errorf("%w: %s", errResetTargetSymlink, targetAbs)
	}

	return targetAbs, true, nil
}

func ensurePgpass(dataDir string) error {
	content := fmt.Sprintf(
		"%s:%s:*:%s:%s\n",
		ContainerWorkflowEngineDb,
		postgresPort,
		postgresUser,
		postgresPassword,
	)
	if err := os.MkdirAll(workflowEngineInfraPath(dataDir), osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create workflow-engine infra directory: %w", err)
	}

	path := workflowEngineInfraFilePath(dataDir, "pgpass")
	// PgAdmin's entrypoint runs as the image user and must read this bind mount before it copies it to a private 0600 file.
	if err := os.WriteFile(path, []byte(content), osutil.FilePermDefault); err != nil {
		return fmt.Errorf("write pgpass: %w", err)
	}
	if err := os.Chmod(path, osutil.FilePermDefault); err != nil {
		return fmt.Errorf("chmod pgpass: %w", err)
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
	topology envtopology.Local,
	monitoring bool,
	pgAdmin bool,
) (ResourceBuildOptions, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return ResourceBuildOptions{}, fmt.Errorf("get working directory: %w", err)
	}

	imageMode, devConfig, note := detectImageMode(ctx, cwd)
	if note != "" {
		if imageMode == DevMode {
			e.out.Verbosef("%s", note)
		} else {
			e.out.Warning(note)
		}
	}

	return ResourceBuildOptions{
		DataDir:           e.cfg.DataDir,
		RuntimeConfig:     runtimeCfg,
		Topology:          topology,
		IncludeMonitoring: monitoring,
		IncludePgAdmin:    pgAdmin,
		ImageMode:         imageMode,
		Images:            e.cfg.Images,
		DevConfig:         devConfig,
	}, nil
}

func detectImageMode(ctx context.Context, cwd string) (ImageMode, *DevImageConfig, string) {
	if !config.IsTruthyEnv(os.Getenv(config.EnvInternalDevMode)) {
		return ReleaseMode, nil, ""
	}

	detection, err := repocontext.Detect(ctx, cwd, "")
	if err == nil && detection.InStudioRepo {
		return resolveDevImageMode(detection.StudioRoot)
	}

	return ReleaseMode, nil,
		"STUDIOCTL_INTERNAL_DEV is set, but studioctl could not detect a Studio repo from the current directory; using release images"
}

func resolveDevImageMode(studioRoot string) (ImageMode, *DevImageConfig, string) {
	devCfg := DevImageConfig{RepoRoot: studioRoot}
	if _, err := os.Stat(devCfg.LocaltestDockerfile()); err != nil {
		return ReleaseMode, nil,
			fmt.Sprintf(
				"STUDIOCTL_INTERNAL_DEV is set, but %s was not found; using release images",
				devCfg.LocaltestDockerfile(),
			)
	}

	return DevMode, &devCfg, ""
}
