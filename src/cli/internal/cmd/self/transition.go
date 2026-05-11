package self

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"time"

	"altinn.studio/devenv/pkg/container"
	containertypes "altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/appmanager"
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	envregistry "altinn.studio/studioctl/internal/cmd/env/registry"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/migrations"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

const (
	appShutdownTimeout = 10 * time.Second
	runModeProcess     = "process"
	runModeContainer   = "container"
)

type appManagerShutdownFunc func(context.Context, *config.Config) (<-chan error, error)
type appManagerStartFunc func(context.Context, *config.Config, string, string) error
type migrationRunnerFunc func(context.Context, *config.Config) error
type containerClientFactory func(context.Context) (container.ContainerClient, error)
type stopProcessFunc func(context.Context, int) error

type appRuntimeClient interface {
	Status(ctx context.Context) (*appmanager.Status, error)
	UnregisterApp(ctx context.Context, appID string) error
	UpgradeApp(ctx context.Context, upgrade appmanager.AppUpgrade) (appmanager.AppUpgradeResult, error)
}

var (
	errAppContainerIDMissing = errors.New("app container id or name missing")
	errAppProcessIDMissing   = errors.New("app process id missing")
)

// TransitionState captures process state needed after a self operation.
type TransitionState struct {
	previousStudioctlPath string
	appManagerWasRunning  bool
}

// Transition coordinates app/env/app-manager shutdown around self operations.
type Transition struct {
	cfg             *config.Config
	out             *ui.Output
	appClient       appRuntimeClient
	containerClient containerClientFactory
	stopProcess     stopProcessFunc
	shutdown        appManagerShutdownFunc
	start           appManagerStartFunc
	runMigrations   migrationRunnerFunc
}

// NewTransition creates a transition coordinator.
func NewTransition(cfg *config.Config, out *ui.Output) *Transition {
	return &Transition{
		cfg:             cfg,
		out:             out,
		appClient:       appmanager.NewClient(cfg),
		containerClient: container.Detect,
		stopProcess: func(ctx context.Context, pid int) error {
			return osutil.StopProcess(ctx, pid, appShutdownTimeout)
		},
		shutdown: appmanager.Shutdown,
		start: func(ctx context.Context, cfg *config.Config, ingressPort, studioctlPath string) error {
			if studioctlPath == "" {
				return appmanager.EnsureStarted(ctx, cfg, ingressPort)
			}
			return appmanager.EnsureStartedWithStudioctlPath(ctx, cfg, ingressPort, studioctlPath)
		},
		runMigrations: migrations.Run,
	}
}

// Prepare stops running apps, environments, and app-manager before a self operation.
func (t *Transition) Prepare(ctx context.Context) (TransitionState, error) {
	appManagerWasRunning, studioctlPath, err := t.stopApps(ctx)
	if err != nil {
		return TransitionState{}, err
	}
	state := TransitionState{
		previousStudioctlPath: studioctlPath,
		appManagerWasRunning:  appManagerWasRunning,
	}

	if stopErr := t.stopEnvs(ctx); stopErr != nil {
		return TransitionState{}, stopErr
	}

	wasRunning, err := t.stopAppManager(ctx)
	if err != nil {
		return TransitionState{}, err
	}
	state.appManagerWasRunning = state.appManagerWasRunning || wasRunning

	return state, nil
}

// RunMigrations applies pending installation migrations.
func (t *Transition) RunMigrations(ctx context.Context) error {
	if t.runMigrations != nil {
		if err := t.runMigrations(ctx, t.cfg); err != nil {
			return fmt.Errorf("run installation migrations: %w", err)
		}
	}
	return nil
}

// ResetEnvs removes persisted environment data before uninstall.
func (t *Transition) ResetEnvs(ctx context.Context) error {
	containerClient := t.containerClient
	if containerClient == nil {
		containerClient = container.Detect
	}
	client, err := containerClient(ctx)
	if err != nil {
		return fmt.Errorf("connect to container runtime: %w", err)
	}
	defer func() {
		if closeErr := client.Close(); closeErr != nil {
			t.out.Verbosef("failed to close container client: %v", closeErr)
		}
	}()

	envs, err := envregistry.Envs(
		envregistry.WithConfig(t.cfg),
		envregistry.WithOutput(t.out),
		envregistry.WithContainerClient(client),
	)
	if err != nil {
		return fmt.Errorf("build environment registry: %w", err)
	}

	for _, env := range envs {
		resetter, ok := env.(envtypes.Resetter)
		if !ok {
			continue
		}
		if err := resetter.Reset(ctx); err != nil {
			return fmt.Errorf("reset %s before uninstall: %w", env.Name(), err)
		}
	}

	return nil
}

// Restore restarts app-manager after a failed self operation when it was previously running.
func (t *Transition) Restore(
	ctx context.Context,
	state TransitionState,
	studioctlPath string,
) {
	if !state.appManagerWasRunning {
		return
	}
	if err := t.restartAppManager(ctx, restartStudioctlPath(state, studioctlPath)); err != nil {
		t.out.Verbosef("failed to restart app-manager after failed self operation: %v", err)
	}
}

func (t *Transition) stopApps(ctx context.Context) (bool, string, error) {
	status, err := t.appClient.Status(ctx)
	if err != nil {
		if errors.Is(err, appmanager.ErrNotRunning) {
			return false, "", nil
		}
		return false, "", fmt.Errorf("get app-manager status before self operation: %w", err)
	}

	apps := sortDiscoveredApps(filterManagedApps(status.Apps))
	if len(apps) == 0 {
		return true, status.StudioctlPath, nil
	}

	t.out.Println("Stopping running apps...")

	var containerClient container.ContainerClient
	defer func() {
		if containerClient != nil {
			if closeErr := containerClient.Close(); closeErr != nil {
				t.out.Verbosef("failed to close container client: %v", closeErr)
			}
		}
	}()

	var stopErrors []error
	for _, app := range apps {
		if err := t.stopApp(ctx, app, &containerClient); err != nil {
			stopErrors = append(stopErrors, fmt.Errorf("%s: %w", app.AppID, err))
			continue
		}
		t.unregisterBestEffort(ctx, app)
		t.out.Verbosef("Stopped %s before self operation.", app.AppID)
	}
	if err := errors.Join(stopErrors...); err != nil {
		return true, status.StudioctlPath, fmt.Errorf("stop running apps before self operation: %w", err)
	}

	return true, status.StudioctlPath, nil
}

func (t *Transition) stopEnvs(ctx context.Context) error {
	containerClient := t.containerClient
	if containerClient == nil {
		containerClient = container.Detect
	}
	client, err := containerClient(ctx)
	if err != nil {
		t.out.Verbosef("skipping environment shutdown before self operation: %v", err)
		return nil
	}
	defer func() {
		if closeErr := client.Close(); closeErr != nil {
			t.out.Verbosef("failed to close container client: %v", closeErr)
		}
	}()

	envs, err := envregistry.Envs(
		envregistry.WithConfig(t.cfg),
		envregistry.WithOutput(t.out),
		envregistry.WithContainerClient(client),
	)
	if err != nil {
		return fmt.Errorf("build environment registry: %w", err)
	}

	for _, env := range envs {
		if err := env.Down(ctx); err != nil {
			if errors.Is(err, envtypes.ErrAlreadyStopped) {
				continue
			}
			return fmt.Errorf("stop %s before self operation: %w", env.Name(), err)
		}
	}

	return nil
}

func (t *Transition) stopAppManager(ctx context.Context) (bool, error) {
	shutdown := t.shutdown
	if shutdown == nil {
		shutdown = appmanager.Shutdown
	}

	done, err := shutdown(ctx, t.cfg)
	if err != nil {
		if errors.Is(err, appmanager.ErrNotRunning) {
			return false, nil
		}
		return false, fmt.Errorf("stop app-manager before self operation: %w", err)
	}
	if done == nil {
		return false, nil
	}

	if shutdownErr := <-done; shutdownErr != nil {
		if errors.Is(shutdownErr, appmanager.ErrNotRunning) {
			return false, nil
		}
		return false, fmt.Errorf("stop app-manager before self operation: %w", shutdownErr)
	}

	return true, nil
}

func (t *Transition) restartAppManager(ctx context.Context, studioctlPath string) error {
	topology := envtopology.NewLocal(envtopology.DefaultIngressPortString())
	start := t.start
	if start == nil {
		start = func(ctx context.Context, cfg *config.Config, ingressPort, studioctlPath string) error {
			if studioctlPath == "" {
				return appmanager.EnsureStarted(ctx, cfg, ingressPort)
			}
			return appmanager.EnsureStartedWithStudioctlPath(ctx, cfg, ingressPort, studioctlPath)
		}
	}
	if err := start(ctx, t.cfg, topology.IngressPort(), studioctlPath); err != nil {
		return fmt.Errorf("ensure app-manager started: %w", err)
	}
	return nil
}

func (t *Transition) stopApp(
	ctx context.Context,
	app appmanager.DiscoveredApp,
	containerClient *container.ContainerClient,
) error {
	switch appStopMode(app) {
	case runModeProcess:
		pid := appProcessID(app)
		if pid <= 0 {
			return fmt.Errorf("%w: %s", errAppProcessIDMissing, app.AppID)
		}
		stopProcess := t.stopProcess
		if stopProcess == nil {
			stopProcess = func(ctx context.Context, pid int) error {
				return osutil.StopProcess(ctx, pid, appShutdownTimeout)
			}
		}
		if err := stopProcess(ctx, pid); err != nil {
			return fmt.Errorf("stop app process %d: %w", pid, err)
		}
	case runModeContainer:
		if err := t.ensureContainerRuntime(ctx, containerClient); err != nil {
			return err
		}
		client := *containerClient
		nameOrID := app.ContainerID
		if nameOrID == "" {
			nameOrID = app.Name
		}
		if nameOrID == "" {
			return fmt.Errorf("%w: %s", errAppContainerIDMissing, app.AppID)
		}
		if err := client.ContainerStop(ctx, nameOrID, nil); err != nil &&
			!errors.Is(err, containertypes.ErrContainerNotFound) {
			return fmt.Errorf("stop app container %s: %w", nameOrID, err)
		}
		if err := client.ContainerRemove(ctx, nameOrID, true); err != nil &&
			!errors.Is(err, containertypes.ErrContainerNotFound) {
			return fmt.Errorf("remove app container %s: %w", nameOrID, err)
		}
	default:
		return nil
	}

	return nil
}

func (t *Transition) ensureContainerRuntime(
	ctx context.Context,
	containerClient *container.ContainerClient,
) error {
	if *containerClient != nil {
		return nil
	}

	factory := t.containerClient
	if factory == nil {
		factory = container.Detect
	}
	client, err := factory(ctx)
	if err != nil {
		return fmt.Errorf("connect to container runtime: %w", err)
	}
	*containerClient = client
	return nil
}

func (t *Transition) unregisterBestEffort(ctx context.Context, app appmanager.DiscoveredApp) {
	if err := t.appClient.UnregisterApp(ctx, app.AppID); err != nil {
		t.out.Verbosef("failed to unregister app %s from app-manager: %v", app.AppID, err)
	}
}

func filterManagedApps(apps []appmanager.DiscoveredApp) []appmanager.DiscoveredApp {
	filtered := make([]appmanager.DiscoveredApp, 0, len(apps))
	for _, app := range apps {
		if hasStopHandle(app) {
			filtered = append(filtered, app)
		}
	}
	return filtered
}

func sortDiscoveredApps(apps []appmanager.DiscoveredApp) []appmanager.DiscoveredApp {
	sort.Slice(apps, func(i, j int) bool {
		if apps[i].AppID != apps[j].AppID {
			return apps[i].AppID < apps[j].AppID
		}
		return apps[i].BaseURL < apps[j].BaseURL
	})
	return apps
}

func hasStopHandle(app appmanager.DiscoveredApp) bool {
	return appProcessID(app) > 0 || app.ContainerID != "" || app.Name != ""
}

func appStopMode(app appmanager.DiscoveredApp) string {
	if app.ContainerID != "" || (app.Name != "" && appProcessID(app) == 0) {
		return runModeContainer
	}
	if appProcessID(app) > 0 {
		return runModeProcess
	}
	return app.Source
}

func appProcessID(app appmanager.DiscoveredApp) int {
	if app.ProcessID != nil {
		return *app.ProcessID
	}
	return 0
}

func restartStudioctlPath(state TransitionState, replacementPath string) string {
	if replacementPath != "" {
		return replacementPath
	}
	return state.previousStudioctlPath
}
