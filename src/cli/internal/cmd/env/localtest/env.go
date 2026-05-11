package localtest

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"altinn.studio/devenv/pkg/container"
	containertypes "altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
	localtestrenderer "altinn.studio/studioctl/internal/cmd/env/localtest/renderer"
	"altinn.studio/studioctl/internal/config"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/envtopology"
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

// graphID scopes devenv ownership labels to studioctl's localtest graph.
const graphID = "studioctl-localtest"

// Env implements envtypes.Env for the localtest runtime.
type Env struct {
	cfg    *config.Config
	out    *ui.Output
	client container.ContainerClient
	paths  components.Paths
}

// NewEnv creates a new localtest environment manager.
func NewEnv(cfg *config.Config, out *ui.Output, client container.ContainerClient) *Env {
	env := &Env{
		cfg:    cfg,
		out:    out,
		client: client,
		paths:  components.NewPaths(cfg.DataDir),
	}
	return env
}

// Name returns the runtime name.
func (e *Env) Name() string {
	return "localtest"
}

// OnInstall prepares localtest-owned filesystem state after bundled resources are installed.
func (e *Env) OnInstall(_ context.Context) error {
	if err := components.EnsureLocaltestStorageDir(e.cfg.DataDir); err != nil {
		return fmt.Errorf("ensure localtest storage dir: %w", err)
	}
	return nil
}

// Preflight validates prerequisites before startup.
func (e *Env) Preflight(ctx context.Context, _ envtypes.UpOptions) error {
	return CheckForLegacyLocaltest(ctx, e.client)
}

// Up starts the localtest environment.
func (e *Env) Up(ctx context.Context, opts envtypes.UpOptions) error {
	toolchain := e.client.Toolchain()
	e.out.Verbosef("Using container toolchain: %s via %s", toolchain.Platform, toolchain.AccessMode)

	runtimeUser := ""
	// Keep empty on Windows because os.Getuid/getgid are unsupported there.
	if runtime.GOOS != osutil.OSWindows {
		runtimeUser = fmt.Sprintf("%d:%d", os.Getuid(), os.Getgid())
	}
	topology := envtopology.NewLocal(envtopology.DefaultIngressPortString())

	buildOpts, err := e.buildResourceOptions(ctx, runtimeUser, topology, opts)
	if err != nil {
		return err
	}
	e.out.Verbosef("Image mode: %s", buildOpts.ImageMode)

	manifest := components.NewManifest(buildOpts)
	if err := envtypes.EnsureBoundTopology(ctx, e.cfg, topology, manifest.Bindings); err != nil {
		return fmt.Errorf("ensure bound topology: %w", err)
	}

	if err := manifest.Prepare(ctx); err != nil {
		return fmt.Errorf("prepare resources: %w", err)
	}

	if err := e.applyResources(ctx, manifest.Resources, buildOpts.ImageMode); err != nil {
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
		return e.runForeground(ctx, localtestURL, manifest.Resources)
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

	destroyManifest := components.NewManifest(e.buildDestroyOptions())
	if err := e.destroyResources(ctx, destroyManifest.Resources, stoppingEnvironmentMessage); err != nil {
		return fmt.Errorf("stop environment: %w", err)
	}

	e.out.Success("Environment stopped")
	return nil
}

// Reset stops localtest if needed and deletes persisted data.
func (e *Env) Reset(ctx context.Context) error {
	toolchain := e.client.Toolchain()
	e.out.Verbosef("Using container toolchain: %s via %s", toolchain.Platform, toolchain.AccessMode)

	if err := CheckForLegacyLocaltest(ctx, e.client); err != nil {
		return err
	}

	hasResources, err := e.hasManagedResources(ctx)
	if err != nil {
		return err
	}
	if hasResources {
		destroyManifest := components.NewManifest(e.buildDestroyOptions())
		if err := e.destroyResources(ctx, destroyManifest.Resources, stoppingEnvironmentMessage); err != nil {
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
	return e.status(ctx, statusOptions{
		DevWorkflowEngine: e.devWorkflowEngineFromEnvironmentTopology(),
		IncludeMonitoring: false,
		IncludePgAdmin:    false,
		RequireDesired:    false,
	})
}

// StatusForUp returns status for the containers requested by env up.
func (e *Env) StatusForUp(ctx context.Context, opts envtypes.UpOptions) (*Status, error) {
	return e.status(ctx, statusOptions{
		DevWorkflowEngine: opts.DevWorkflowEngine,
		IncludeMonitoring: opts.Monitoring,
		IncludePgAdmin:    opts.PgAdmin,
		RequireDesired:    true,
	})
}

// Logs streams localtest environment logs.
func (e *Env) Logs(ctx context.Context, opts envtypes.LogsOptions) error {
	return e.logStreamer().Stream(ctx, opts.Component, opts.Follow, opts.JSON)
}

type statusOptions struct {
	DevWorkflowEngine bool
	IncludeMonitoring bool
	IncludePgAdmin    bool
	RequireDesired    bool
}

func (e *Env) status(ctx context.Context, opts statusOptions) (*Status, error) {
	resourceOpts := e.releaseOptions(
		opts.IncludeMonitoring,
		opts.IncludePgAdmin,
		opts.DevWorkflowEngine,
	)

	manifest := components.NewManifest(resourceOpts)
	graph, err := buildResourceGraph(manifest.Resources)
	if err != nil {
		return nil, fmt.Errorf("build resource graph: %w", err)
	}

	executor := resource.NewExecutor(e.client)
	snapshot, err := executor.Status(ctx, graph, resource.SkipResource(isImageResource))
	if err != nil {
		return nil, fmt.Errorf("get resource status: %w", err)
	}

	return localtestStatus(graph.All(), snapshot, opts.RequireDesired), nil
}

func (e *Env) devWorkflowEngineFromEnvironmentTopology() bool {
	envConfig, err := envtopology.ReadBoundTopologyConfig(e.cfg.BoundTopologyBaseConfigPath())
	if err != nil {
		e.out.Verbosef("Failed to read environment topology config: %v", err)
		return false
	}

	for _, route := range envConfig.Routes {
		if route.Component != envtopology.ComponentWorkflowEngine {
			continue
		}
		return route.Destination.Location == envtopology.DestinationLocationHost
	}
	return false
}

func (e *Env) hasManagedResources(ctx context.Context) (bool, error) {
	manifest := components.NewManifest(e.buildDestroyOptions())
	graph, err := buildResourceGraph(manifest.Resources)
	if err != nil {
		return false, fmt.Errorf("build resource graph: %w", err)
	}

	executor := resource.NewExecutor(e.client)
	snapshot, err := executor.Status(ctx, graph, resource.SkipResource(isImageResource))
	if err != nil {
		return false, fmt.Errorf("get resource status: %w", err)
	}

	for _, observed := range snapshot.Resources {
		if !observed.Managed || observed.Status == resource.StatusDestroyed {
			continue
		}
		if observed.Resource != nil && !isRuntimeResource(observed.Resource) {
			continue
		}
		return true, nil
	}

	return false, nil
}

func (e *Env) runForeground(
	ctx context.Context,
	localtestURL string,
	resources []resource.Resource,
) error {
	e.out.Println("")
	e.out.Println("Localtest is running. Press Ctrl+C to stop.")
	e.out.Printlnf("Access the platform at: %s", localtestURL)

	streamer := newLogStreamer(e.client, e.out, components.EnabledContainerNames(resources))
	if err := streamer.Stream(ctx, "", true, false); err != nil {
		e.out.Verbosef("log streaming ended: %v", err)
	}

	e.out.Println("")
	e.out.Println(stoppingEnvironmentMessage)

	teardownCtx, cancel := context.WithTimeout(context.Background(), teardownTimeout)
	defer cancel()

	destroyManifest := components.NewManifest(e.buildDestroyOptions())

	//nolint:contextcheck // intentionally using new context for cleanup after cancellation
	if err := e.destroyResources(teardownCtx, destroyManifest.Resources, ""); err != nil {
		e.out.Warningf("Failed to stop environment cleanly: %v", err)
		return err
	}
	e.out.Println("Environment stopped.")
	return nil
}

func (e *Env) logStreamer() *logStreamer {
	manifest := components.NewManifest(e.releaseOptions(true, true, e.devWorkflowEngineFromEnvironmentTopology()))
	return newLogStreamer(e.client, e.out, components.EnabledContainerNames(manifest.Resources))
}

func (e *Env) applyResources(ctx context.Context, resources []resource.Resource, imageMode components.ImageMode) error {
	graph, err := buildResourceGraph(resources)
	if err != nil {
		return err
	}

	executor := resource.NewExecutor(e.client)
	spinnerMsg := "Starting localtest environment..."
	if imageMode == components.DevMode {
		spinnerMsg = "Building and starting localtest environment (dev mode)..."
	}

	var renderer localtestrenderer.Renderer
	if _, err := executor.Apply(ctx, graph, resource.WithApplyPlan(func(plan resource.ApplyPlan) error {
		e.startRenderer(
			executor,
			&renderer,
			applyPlannedResources(plan),
			localtestrenderer.OperationApply,
			plan.Snapshot.Statuses(),
			spinnerMsg,
		)
		return nil
	})); err != nil {
		if renderer != nil {
			renderer.FailAll(err.Error())
			renderer.Stop()
		}
		return fmt.Errorf("start environment: %w", err)
	}

	if renderer != nil {
		renderer.Stop()
	}
	e.out.Success("Environment started")
	return nil
}

func (e *Env) destroyResources(ctx context.Context, resources []resource.Resource, logStartMessage string) error {
	graph, err := buildResourceGraph(resources)
	if err != nil {
		return err
	}

	var renderer localtestrenderer.Renderer
	executor := resource.NewExecutor(e.client)
	if err := executor.Destroy(ctx, graph, resource.WithDestroyPlan(func(plan resource.DestroyPlan) error {
		e.startRenderer(
			executor,
			&renderer,
			plan.Destroy,
			localtestrenderer.OperationDestroy,
			plan.Snapshot.Statuses(),
			logStartMessage,
		)
		return nil
	})); err != nil {
		if renderer != nil {
			renderer.FailAll(err.Error())
			renderer.Stop()
		}
		return fmt.Errorf("destroy resources: %w", err)
	}

	if renderer != nil {
		renderer.Stop()
	}
	return nil
}

func (e *Env) startRenderer(
	executor *resource.Executor,
	renderer *localtestrenderer.Renderer,
	resources []resource.PlannedResource,
	operation localtestrenderer.Operation,
	statuses map[resource.ResourceID]resource.Status,
	logStartMessage string,
) {
	switch localtestrenderer.DetectMode(e.out, e.cfg.Verbose) {
	case localtestrenderer.ModeTable:
		*renderer = localtestrenderer.NewTableWithPlan(
			e.out,
			resources,
			operation,
			statuses,
		)
	case localtestrenderer.ModeCompact:
		*renderer = localtestrenderer.NewCompactWithPlan(
			e.out,
			resources,
			operation,
			statuses,
		)
	case localtestrenderer.ModeLog:
		*renderer = localtestrenderer.NewLogWithPlan(
			e.out,
			resources,
			operation,
			statuses,
			logStartMessage,
		)
	default:
		*renderer = localtestrenderer.NewLogWithPlan(e.out, resources, operation, statuses, logStartMessage)
	}
	(*renderer).Start()
	executor.SetObserver(*renderer)
}

func applyPlannedResources(plan resource.ApplyPlan) []resource.PlannedResource {
	resources := make([]resource.PlannedResource, 0, len(plan.Destroy)+len(plan.Reconcile))
	resources = append(resources, plan.Destroy...)
	resources = append(resources, plan.Reconcile...)
	return resources
}

func localtestStatus(
	resources []resource.Resource,
	snapshot resource.Snapshot,
	requireDesired bool,
) *Status {
	status := Status{
		Containers: []ContainerStatus{},
		Running:    false,
		AnyRunning: false,
	}
	containerCount := 0
	convergedContainers := 0

	for _, res := range resources {
		containerResource, ok := res.(*resource.Container)
		if !ok {
			continue
		}

		resourceStatus := managedResourceStatus(snapshot, containerResource.ID())
		if !resource.IsEnabled(containerResource) && resourceStatus == resource.StatusDestroyed {
			continue
		}
		status.Containers = append(
			status.Containers,
			ContainerStatus{Name: containerResource.Name, Status: localtestStatusString(resourceStatus)},
		)
		containerCount++
		if containerConverged(containerResource, resourceStatus, requireDesired) {
			convergedContainers++
		}
		if resourceStatus != resource.StatusDestroyed {
			status.AnyRunning = true
		}
	}

	status.Running = containerCount > 0 && convergedContainers == containerCount
	return &status
}

func managedResourceStatus(snapshot resource.Snapshot, id resource.ResourceID) resource.Status {
	if !managedResourcePresent(snapshot, id) {
		return resource.StatusDestroyed
	}
	return snapshot.Resources[id].Status
}

func managedResourcePresent(snapshot resource.Snapshot, id resource.ResourceID) bool {
	observed, ok := snapshot.Resources[id]
	return ok && observed.Managed && observed.Status != resource.StatusDestroyed
}

func containerConverged(containerResource *resource.Container, status resource.Status, requireDesired bool) bool {
	if resource.IsEnabled(containerResource) {
		return status.IsHealthy()
	}
	if !requireDesired {
		return status.IsHealthy()
	}
	return status == resource.StatusDestroyed
}

func localtestStatusString(status resource.Status) string {
	if status == resource.StatusDestroyed {
		return "not found"
	}
	if status == resource.StatusReady {
		return "running"
	}
	return status.String()
}

func isRuntimeResource(res resource.Resource) bool {
	switch res.(type) {
	case *resource.Container, *resource.Network:
		return true
	default:
		return false
	}
}

func isImageResource(res resource.Resource) bool {
	_, ok := res.(resource.ImageResource)
	return ok
}

func (e *Env) buildDestroyOptions() *components.Options {
	return e.releaseOptions(true, true, false) // include all for cleanup
}

func (e *Env) releaseOptions(includeMonitoring, includePgAdmin, devWorkflowEngine bool) *components.Options {
	return &components.Options{
		DevConfig:         nil,
		Paths:             e.paths,
		Images:            e.cfg.Images,
		RuntimeUser:       "",
		Topology:          envtopology.NewLocal(envtopology.DefaultIngressPortString()),
		ImageMode:         components.ReleaseMode,
		DevWorkflowEngine: devWorkflowEngine,
		IncludeMonitoring: includeMonitoring,
		IncludePgAdmin:    includePgAdmin,
	}
}

func (e *Env) deletePersistedData(ctx context.Context) error {
	if err := removeResetDataPath(e.cfg.DataDir, components.LocaltestStoragePath(e.cfg.DataDir)); err != nil {
		return err
	}
	if err := e.removeLegacyWorkflowEngineDbData(ctx, components.WorkflowEngineDbDataPath(e.cfg.DataDir)); err != nil {
		e.out.Verbosef("Failed to remove legacy workflow-engine database data: %v", err)
	}
	return e.removeWorkflowEngineDbVolume(ctx)
}

func (e *Env) removeLegacyWorkflowEngineDbData(ctx context.Context, target string) error {
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

func (e *Env) removeWorkflowEngineDbVolume(ctx context.Context) error {
	if err := e.client.VolumeRemove(ctx, components.WorkflowEngineDbVolume, true); err != nil {
		if errors.Is(err, containertypes.ErrVolumeNotFound) {
			return nil
		}
		return fmt.Errorf("remove workflow-engine database volume %q: %w", components.WorkflowEngineDbVolume, err)
	}
	return nil
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
			Type:          containertypes.VolumeMountTypeBind,
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

func buildResourceGraph(resources []resource.Resource) (*resource.Graph, error) {
	graph := resource.NewGraph(resource.GraphID(graphID))
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

func (e *Env) buildResourceOptions(
	ctx context.Context,
	runtimeUser string,
	topology envtopology.Local,
	upOpts envtypes.UpOptions,
) (*components.Options, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("get working directory: %w", err)
	}

	imageMode, devConfig, note := detectImageMode(ctx, cwd)
	if note != "" {
		if imageMode == components.DevMode {
			e.out.Verbosef("%s", note)
		} else {
			e.out.Warning(note)
		}
	}

	return &components.Options{
		Paths:             e.paths,
		RuntimeUser:       runtimeUser,
		DevConfig:         devConfig,
		Images:            e.cfg.Images,
		Topology:          topology,
		ImageMode:         imageMode,
		DevWorkflowEngine: upOpts.DevWorkflowEngine,
		IncludeMonitoring: upOpts.Monitoring,
		IncludePgAdmin:    upOpts.PgAdmin,
	}, nil
}

func detectImageMode(ctx context.Context, cwd string) (components.ImageMode, *components.DevImageConfig, string) {
	if !config.IsTruthyEnv(os.Getenv(config.EnvInternalDevMode)) {
		return components.ReleaseMode, nil, ""
	}

	detection, err := repocontext.Detect(ctx, cwd, "")
	if err == nil && detection.InStudioRepo {
		return resolveDevImageMode(detection.StudioRoot)
	}

	return components.ReleaseMode, nil,
		"STUDIOCTL_INTERNAL_DEV is set, but studioctl could not detect a Studio repo from the current directory; using release images"
}

func resolveDevImageMode(studioRoot string) (components.ImageMode, *components.DevImageConfig, string) {
	devCfg := components.DevImageConfig{RepoRoot: studioRoot}
	localtestDockerfile := filepath.ToSlash(filepath.Join(studioRoot, "src/Runtime/localtest/Dockerfile"))
	if _, err := os.Stat(localtestDockerfile); err != nil {
		return components.ReleaseMode, nil,
			fmt.Sprintf(
				"STUDIOCTL_INTERNAL_DEV is set, but %s was not found; using release images",
				localtestDockerfile,
			)
	}

	return components.DevMode, &devCfg, ""
}
