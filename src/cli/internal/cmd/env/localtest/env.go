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
	"altinn.studio/devenv/pkg/resource/executor"
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
	"altinn.studio/studioctl/internal/cmd/env/stack"
	"altinn.studio/studioctl/internal/config"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

// Sentinel errors for the localtest package.
var (
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
	stack  *stack.Stack
	paths  components.Paths
}

// NewEnv creates a new localtest environment manager.
func NewEnv(cfg *config.Config, out *ui.Output, client container.ContainerClient) *Env {
	env := &Env{
		cfg:    cfg,
		out:    out,
		client: client,
		stack:  stack.New(client, out, graphID, cfg.Verbose),
		paths:  components.NewPaths(cfg.DataDir),
	}
	return env
}

// Active reports whether any localtest container is running.
func (e *Env) Active(ctx context.Context) (bool, error) {
	active, err := e.stack.Active(ctx)
	if err != nil {
		return false, fmt.Errorf("check localtest containers: %w", err)
	}
	return active, nil
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
	if err := e.applyScheduledWorkflowEngineDataReset(ctx); err != nil {
		return err
	}
	return CheckForLegacyLocaltest(ctx, e.client)
}

// Up starts the localtest environment.
func (e *Env) Up(ctx context.Context, opts envtypes.UpOptions) error {
	toolchain := e.client.Toolchain()
	e.out.Verbosef("Using container toolchain: %s via %s", toolchain.Platform, toolchain.AccessMode)

	runtimeUser, runtimeUsernsMode, relabelBinds := components.RuntimeUser(toolchain)
	topology := envtopology.NewLocal(envtopology.DefaultIngressPortString())

	buildOpts, err := e.buildResourceOptions(ctx, runtimeUser, runtimeUsernsMode, relabelBinds, topology, opts)
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

// ResetWorkflowEngineData stops localtest if needed and deletes the workflow-engine database,
// keeping the persisted localtest instance data.
func (e *Env) ResetWorkflowEngineData(ctx context.Context) error {
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

	e.out.Println("Deleting persisted workflow-engine data...")
	if err := e.removeLegacyWorkflowEngineDbData(ctx, components.WorkflowEngineDbDataPath(e.cfg.DataDir)); err != nil {
		e.out.Verbosef("Failed to remove legacy workflow-engine database data: %v", err)
	}
	if err := e.removeWorkflowEngineDbVolume(ctx); err != nil {
		return err
	}

	e.out.Success("Workflow-engine data reset")
	return nil
}

// Status returns the localtest environment status.
func (e *Env) Status(ctx context.Context) (*envtypes.Status, error) {
	return e.status(ctx, statusOptions{
		DevWorkflowEngine: e.devWorkflowEngineFromEnvironmentTopology(),
		IncludeMonitoring: false,
		IncludePgAdmin:    false,
		RequireDesired:    false,
	})
}

// StatusForUp returns status for the containers requested by env up.
func (e *Env) StatusForUp(ctx context.Context, opts envtypes.UpOptions) (*envtypes.Status, error) {
	return e.status(ctx, statusOptions{
		DevWorkflowEngine: opts.DevWorkflowEngine,
		IncludeMonitoring: opts.Monitoring,
		IncludePgAdmin:    opts.PgAdmin,
		RequireDesired:    true,
	})
}

// Logs streams localtest environment logs.
func (e *Env) Logs(ctx context.Context, opts envtypes.LogsOptions) error {
	if err := e.logStreamer().Stream(ctx, opts.Component, opts.Follow, opts.JSON); err != nil {
		return fmt.Errorf("stream localtest logs: %w", err)
	}
	return nil
}

type statusOptions struct {
	DevWorkflowEngine bool
	IncludeMonitoring bool
	IncludePgAdmin    bool
	RequireDesired    bool
}

func (e *Env) status(ctx context.Context, opts statusOptions) (*envtypes.Status, error) {
	resourceOpts := e.releaseOptions(
		opts.IncludeMonitoring,
		opts.IncludePgAdmin,
		opts.DevWorkflowEngine,
	)

	manifest := components.NewManifest(resourceOpts)
	graph, snapshot, err := e.stack.Observe(ctx, manifest.Resources)
	if err != nil {
		return nil, fmt.Errorf("observe localtest: %w", err)
	}

	return localtestStatus(
		graph.All(),
		snapshot,
		e.stack.ContainerImages(ctx, graph.All(), snapshot, containerImageRef),
		opts.RequireDesired,
	), nil
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
	has, err := e.stack.HasManagedResources(ctx, manifest.Resources)
	if err != nil {
		return false, fmt.Errorf("observe localtest: %w", err)
	}
	return has, nil
}

func (e *Env) runForeground(
	ctx context.Context,
	localtestURL string,
	resources []resource.Resource,
) error {
	e.out.Println("")
	e.out.Println("Localtest is running. Press Ctrl+C to stop.")
	e.out.Printlnf("Access the platform at: %s", localtestURL)

	streamer := stack.NewLogStreamer(e.client, e.out, components.EnabledContainerNames(resources))
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

func (e *Env) logStreamer() *stack.LogStreamer {
	manifest := components.NewManifest(e.releaseOptions(true, true, e.devWorkflowEngineFromEnvironmentTopology()))
	return stack.NewLogStreamer(e.client, e.out, components.EnabledContainerNames(manifest.Resources))
}

func (e *Env) applyResources(ctx context.Context, resources []resource.Resource, imageMode components.ImageMode) error {
	spinnerMsg := "Starting localtest environment..."
	if imageMode == components.DevMode {
		spinnerMsg = "Building and starting localtest environment (dev mode)..."
	}
	if err := e.stack.Apply(ctx, resources, spinnerMsg); err != nil {
		return fmt.Errorf("apply localtest: %w", err)
	}
	e.out.Success("Environment started")
	return nil
}

func (e *Env) destroyResources(ctx context.Context, resources []resource.Resource, logStartMessage string) error {
	if err := e.stack.Destroy(ctx, resources, logStartMessage); err != nil {
		return fmt.Errorf("destroy localtest: %w", err)
	}
	return nil
}

func localtestStatus(
	resources []resource.Resource,
	snapshot executor.Snapshot,
	images map[string]envtypes.ContainerImage,
	requireDesired bool,
) *envtypes.Status {
	status := envtypes.Status{
		Containers: []envtypes.ContainerStatus{},
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

		resourceStatus := stack.ManagedStatus(snapshot, containerResource.ID())
		if !resource.IsEnabled(containerResource) && resourceStatus == executor.StatusDestroyed {
			continue
		}
		status.Containers = append(
			status.Containers,
			envtypes.ContainerStatus{
				Name:    containerResource.Name,
				Image:   images[containerResource.Name].Ref,
				ImageID: images[containerResource.Name].ImageID,
				Status:  stack.StatusString(resourceStatus),
			},
		)
		containerCount++
		if containerConverged(containerResource, resourceStatus, requireDesired) {
			convergedContainers++
		}
		if resourceStatus != executor.StatusDestroyed {
			status.AnyRunning = true
		}
	}

	status.Running = containerCount > 0 && convergedContainers == containerCount
	return &status
}

// containerImageRef returns the reference a container was started from. It is empty for an
// image built from the local checkout, and for a component this command treats as disabled:
// the reference would then be a placeholder rather than anything the container ran.
func containerImageRef(containerResource *resource.Container) string {
	pulled, ok := containerResource.Image.Resource().(*resource.PulledImage)
	if !ok || components.IsDisabledImageRef(pulled.Ref) {
		return ""
	}
	return pulled.Ref
}

func containerConverged(containerResource *resource.Container, status executor.Status, requireDesired bool) bool {
	if resource.IsEnabled(containerResource) {
		return status.IsHealthy()
	}
	if !requireDesired {
		return status.IsHealthy()
	}
	return status == executor.StatusDestroyed
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
		RuntimeUsernsMode: "",
		RelabelBinds:      false,
		Topology:          envtopology.NewLocal(envtopology.DefaultIngressPortString()),
		ImageMode:         components.ReleaseMode,
		PrebuiltDevImages: false,
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
	relabel := containertypes.SELinuxRelabelNone
	if e.client.Toolchain().Platform == containertypes.PlatformPodman && e.client.Toolchain().SELinux {
		relabel = containertypes.SELinuxRelabelShared
	}
	containerCfg := containertypes.ContainerConfig{
		Labels:         nil,
		HealthCheck:    nil,
		Name:           helperName,
		Image:          e.cfg.Images.Core.WorkflowEngineDb.Ref(),
		User:           "",
		UsernsMode:     "",
		RestartPolicy:  "",
		ExtraHosts:     nil,
		NetworkAliases: nil,
		Volumes: []containertypes.VolumeMount{{
			HostPath:       targetAbs,
			ContainerPath:  "/cleanup",
			Type:           containertypes.VolumeMountTypeBind,
			SELinuxRelabel: relabel,
			ReadOnly:       false,
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

func (e *Env) buildResourceOptions(
	ctx context.Context,
	runtimeUser string,
	runtimeUsernsMode string,
	relabelBinds bool,
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
		RuntimeUsernsMode: runtimeUsernsMode,
		RelabelBinds:      relabelBinds,
		DevConfig:         devConfig,
		Images:            e.cfg.Images,
		Topology:          topology,
		ImageMode:         imageMode,
		PrebuiltDevImages: config.IsTruthyEnv(os.Getenv(config.EnvPrebuiltDevImages)),
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
