package localtestv2

import (
	"context"
	"errors"
	"fmt"
	"maps"
	"net"
	"os"
	"slices"
	"strconv"
	"strings"
	"time"

	"altinn.studio/devenv/pkg/container"
	containertypes "altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	envstack "altinn.studio/studioctl/internal/cmd/env/stack"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/localtestv2"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/studioctlserver"
	"altinn.studio/studioctl/internal/ui"
)

const (
	// Name is the runtime's name on the command line (-r localtest-v2).
	Name = "localtest-v2"

	// graphID scopes devenv ownership labels to this runtime's graph.
	graphID = localtestv2.GraphID

	teardownTimeout = 30 * time.Second
	stoppingMessage = "Stopping localtest-v2 environment..."
)

// Env implements envtypes.Env for the localtest-v2 runtime.
type Env struct {
	client     container.ContainerClient
	cfg        *config.Config
	out        *ui.Output
	stack      *envstack.Stack
	lookupHost lookupHostFunc
	flags      UpOptions
}

// NewEnv creates the localtest-v2 environment manager.
func NewEnv(cfg *config.Config, out *ui.Output, client container.ContainerClient) *Env {
	return &Env{
		cfg:        cfg,
		out:        out,
		client:     client,
		stack:      envstack.New(client, out, graphID, cfg.Verbose),
		flags:      noUpOptions(),
		lookupHost: net.DefaultResolver.LookupHost,
	}
}

// Active reports whether any localtest-v2 container is running.
func (e *Env) Active(ctx context.Context) (bool, error) {
	active, err := e.stack.Active(ctx)
	if err != nil {
		return false, fmt.Errorf("check localtest-v2 containers: %w", err)
	}
	return active, nil
}

// Name returns the runtime name.
func (e *Env) Name() string {
	return Name
}

// Up checks the prerequisites and starts the environment with the bound flags, unless it already runs healthy with
// what they ask for. A dev build is always rebuilt.
func (e *Env) Up(ctx context.Context, common envtypes.UpOptions) (envtypes.UpResult, error) {
	opts := e.flags
	opts.Detach = common.Detach
	opts.OpenBrowser = common.OpenBrowser
	if err := e.Preflight(ctx, opts); err != nil {
		return envtypes.UpResult{AlreadyRunning: false}, fmt.Errorf("preflight check: %w", err)
	}
	status, err := e.Status(ctx)
	if err != nil {
		return envtypes.UpResult{AlreadyRunning: false}, fmt.Errorf("get status: %w", err)
	}
	changed, err := e.Changed(opts)
	if err != nil {
		return envtypes.UpResult{AlreadyRunning: false}, fmt.Errorf("compare with the running environment: %w", err)
	}
	if status.Running && len(opts.DevComponents) == 0 && !changed {
		return envtypes.UpResult{AlreadyRunning: true}, nil
	}
	if err := e.Start(ctx, opts); err != nil {
		return envtypes.UpResult{AlreadyRunning: false}, err
	}
	return envtypes.UpResult{AlreadyRunning: false}, nil
}

// Preflight validates prerequisites before startup: no localtest started outside studioctl may hold the public origin,
// the groups must be known, a dev build must name a container and a Dockerfile, and a custom public host must resolve to
// this machine. Another runtime that is running is refused by env up (envtypes.EnsureNoOtherActive).
func (e *Env) Preflight(ctx context.Context, opts UpOptions) error {
	if err := envstack.CheckForLegacyLocaltest(ctx, e.client); err != nil {
		return fmt.Errorf("check for legacy localtest: %w", err)
	}
	if err := checkMinimal(opts); err != nil {
		return err
	}
	if _, err := e.devBuilds(opts.DevComponents); err != nil {
		return err
	}
	if _, err := ResolveGroups(opts.With, opts.Without); err != nil {
		return err
	}
	return e.checkOrigin(ctx, opts)
}

// Changed reports whether `env up` asks for another mode, another public origin, other optional groups, other images
// (--latest) or other dev builds than the running environment was started with, in which case an environment that is
// already healthy still has to be converged: a plain `env up` after `env up --dev-storage` runs the pinned Storage
// again.
func (e *Env) Changed(opts UpOptions) (bool, error) {
	want, err := ResolveGroups(opts.With, opts.Without)
	if err != nil {
		return false, err
	}
	state, up, err := localtestv2.ReadState(e.cfg)
	if err != nil {
		return false, fmt.Errorf("read localtest-v2 state: %w", err)
	}
	have := slices.Clone(state.Groups)
	slices.Sort(have)
	return opts.Minimal != state.Minimal ||
		originChanged(opts, state, up) ||
		!slices.Equal(want, have) ||
		opts.LatestImages != state.LatestImages ||
		!slices.Equal(slices.Sorted(maps.Keys(opts.DevComponents)), state.Dev), nil
}

// Start starts the environment: writes the certificate, the manifest's files and the state file, applies the containers
// (each one's health checked before what depends on it starts), waits until the front door answers on the public
// origin, and restarts studioctl-server so that it registers the apps it discovers with the front door.
func (e *Env) Start(ctx context.Context, upOpts UpOptions) error {
	toolchain := e.client.Toolchain()
	e.out.Verbosef("Using container toolchain: %s via %s", toolchain.Platform, toolchain.AccessMode)

	opts, err := e.options(ctx, upOpts)
	if err != nil {
		return err
	}
	if err := ensureCertificate(opts.CertDir); err != nil {
		return err
	}
	if err := ensureFiles(opts.FilesDir, stack()); err != nil {
		return err
	}
	if err := e.stopOnSwitch(ctx, opts); err != nil {
		return err
	}
	if err := localtestv2.WriteState(e.cfg, localtestv2.State{
		CertificateDir: opts.CertDir,
		PublicHost:     opts.Origin.Host,
		PublicPort:     opts.Origin.Port,
		Groups:         opts.Groups,
		Dev:            slices.Sorted(maps.Keys(opts.Dev)),
		LatestImages:   opts.LatestImages,
		Minimal:        opts.Minimal,
	}); err != nil {
		return fmt.Errorf("record localtest-v2 state: %w", err)
	}
	if err := e.startContainers(ctx, opts); err != nil {
		return err
	}
	e.out.Success("Environment healthy")

	// After the containers, since studioctl-server registers apps with the front door only while they run. A restart,
	// not only a start: the server then registers every running app again, and a registration provisions the app for
	// the groups that are up now, so an app registered before `env up --with dialogporten` is synced to Dialogporten
	// too. The front door keeps its registrations on its volume, so a server that kept running would see nothing to do.
	if err := studioctlserver.Restart(ctx, e.cfg, strconv.Itoa(opts.Origin.Port)); err != nil {
		return fmt.Errorf("restart studioctl-server: %w", err)
	}

	localtestURL := opts.topology().LocaltestURL()
	if upOpts.OpenBrowser {
		if err := osutil.OpenContext(ctx, localtestURL); err != nil {
			e.out.Warningf("Failed to open browser: %v", err)
		}
	}
	if !upOpts.Detach {
		return e.runForeground(ctx, localtestURL, opts)
	}
	e.out.Println("")
	e.out.Println("localtest-v2 started in background.")
	e.out.Printlnf("Access the platform at: %s", localtestURL)
	e.out.Printlnf("Use '%s env logs -r %s' to view logs.", osutil.CurrentBin(), Name)
	e.out.Printlnf("Use '%s env down -r %s' to stop.", osutil.CurrentBin(), Name)
	return nil
}

// Down stops the environment and restarts studioctl-server without the front-door registration.
func (e *Env) Down(ctx context.Context) error {
	hasResources, err := e.hasManagedResources(ctx)
	if err != nil {
		return err
	}
	if !hasResources {
		return e.forgetState(ctx, envtypes.ErrAlreadyStopped)
	}
	if err := e.teardown(ctx, stoppingMessage); err != nil {
		return fmt.Errorf("stop environment: %w", err)
	}
	if err := e.forgetState(ctx, nil); err != nil {
		return err
	}
	e.out.Success("Environment stopped")
	return nil
}

// Reset stops the environment if needed and deletes its volumes: the manifest's, with this runtime's prefix only. In
// minimal mode there are none to delete, and the default stack's are left alone.
func (e *Env) Reset(ctx context.Context) error {
	// An unreadable state file resets as before: the mode only spares the volumes when it is known to be minimal.
	state, _, stateErr := localtestv2.ReadState(e.cfg)
	if stateErr != nil {
		e.out.Verbosef("read localtest-v2 state: %v", stateErr)
	}
	hasResources, err := e.hasManagedResources(ctx)
	if err != nil {
		return err
	}
	if hasResources {
		if err := e.teardown(ctx, stoppingMessage); err != nil {
			return fmt.Errorf("stop environment: %w", err)
		}
	}
	if err := e.forgetState(ctx, nil); err != nil {
		return err
	}
	if state.Minimal {
		e.out.Println(nothingToReset)
		return nil
	}
	e.out.Println("Deleting persisted localtest-v2 data...")
	for _, volume := range volumeNames() {
		if err := e.client.VolumeRemove(
			ctx,
			volume,
			true,
		); err != nil &&
			!errors.Is(err, containertypes.ErrVolumeNotFound) {
			return fmt.Errorf("remove volume %q: %w", volume, err)
		}
	}
	e.out.Success("Environment data reset")
	return nil
}

// Logs streams the containers' logs.
func (e *Env) Logs(ctx context.Context, opts envtypes.LogsOptions) error {
	current, err := e.currentOptions()
	if err != nil {
		return err
	}
	streamer := envstack.NewLogStreamer(e.client, e.out, containerNames(current))
	component := opts.Component
	if component != "" && !strings.HasPrefix(component, containerPrefix) {
		component = containerOf(component)
	}
	if err := streamer.Stream(ctx, component, opts.Follow, opts.JSON); err != nil {
		return fmt.Errorf("stream logs: %w", err)
	}
	return nil
}

// Status returns the environment's container status.
func (e *Env) Status(ctx context.Context) (*envtypes.Status, error) {
	current, err := e.currentOptions()
	if err != nil {
		return nil, err
	}
	graph, snapshot, err := e.stack.Observe(ctx, resources(current, nil))
	if err != nil {
		return nil, fmt.Errorf("observe localtest-v2: %w", err)
	}
	images := e.stack.ContainerImages(ctx, graph.All(), snapshot, pulledRef)

	status := envtypes.Status{
		Origin:     current.Origin.URL(),
		Mode:       "",
		Emulated:   emulated(current),
		Containers: []envtypes.ContainerStatus{},
		Running:    false,
		AnyRunning: false,
	}
	if current.Minimal {
		status.Mode = ModeMinimal
	}
	ready := 0
	for _, res := range graph.All() {
		ctr, ok := res.(*resource.Container)
		if !ok {
			continue
		}
		resourceStatus := envstack.ManagedStatus(snapshot, ctr.ID())
		status.Containers = append(status.Containers, envtypes.ContainerStatus{
			Name:    ctr.Name,
			Image:   images[ctr.Name].Ref,
			ImageID: images[ctr.Name].ImageID,
			Status:  envstack.StatusString(resourceStatus),
		})
		if resourceStatus.IsHealthy() {
			ready++
		}
		if resourceStatus != executor.StatusDestroyed {
			status.AnyRunning = true
		}
	}
	status.Running = len(status.Containers) > 0 && ready == len(status.Containers)
	return &status, nil
}

// pulledRef names the reference a container's image is pulled from; a dev build has none.
func pulledRef(ctr *resource.Container) string {
	pulled, ok := ctr.Image.Resource().(*resource.PulledImage)
	if !ok {
		return ""
	}
	return pulled.Ref
}

// forgetState removes the runtime's state and, when studioctl-server runs, restarts it without the front-door
// registration.
// The passthrough error is returned when the state is gone, so a caller can report "already stopped".
func (e *Env) forgetState(ctx context.Context, passthrough error) error {
	if err := localtestv2.RemoveState(e.cfg); err != nil {
		return fmt.Errorf("forget localtest-v2 state: %w", err)
	}
	if err := studioctlserver.ReconcileIfRunning(ctx, e.cfg, envtopology.DefaultIngressPortString()); err != nil {
		return fmt.Errorf("reconcile studioctl-server: %w", err)
	}
	return passthrough
}

func (e *Env) defaultOptions() *Options {
	return defaultOptions(localtestv2.CertificateDir(e.cfg), localtestv2.FilesDir(e.cfg))
}

// currentOptions are the options of the environment as it was started: the optional groups, the image tags and the
// public origin come from the state file, so status and logs cover the containers that exist, do not report a group that was never
// started as missing, and name the images the containers were started from.
func (e *Env) currentOptions() (*Options, error) {
	opts := e.defaultOptions()
	state, _, err := localtestv2.ReadState(e.cfg)
	if err != nil {
		return nil, fmt.Errorf("read localtest-v2 state: %w", err)
	}
	opts.Groups = state.Groups
	opts.LatestImages = state.LatestImages
	opts.Minimal = state.Minimal
	opts.Origin = state.Origin()
	return opts, nil
}

// teardownOptions include every optional group, so that stopping or resetting finds the containers of whichever were
// started, even when the state file is gone.
func (e *Env) teardownOptions() *Options {
	opts := e.defaultOptions()
	opts.Groups = OptionalGroups()
	return opts
}

func (e *Env) options(ctx context.Context, upOpts UpOptions) (*Options, error) {
	opts := e.defaultOptions()
	_, _, opts.RelabelBinds = envstack.RuntimeUser(e.client.Toolchain())
	opts.LatestImages = upOpts.LatestImages
	opts.Minimal = upOpts.Minimal
	groups, err := ResolveGroups(upOpts.With, upOpts.Without)
	if err != nil {
		return nil, err
	}
	opts.Groups = groups
	if opts.Dev, err = e.devBuilds(upOpts.DevComponents); err != nil {
		return nil, err
	}
	state, up, err := localtestv2.ReadState(e.cfg)
	if err != nil {
		return nil, fmt.Errorf("read localtest-v2 state: %w", err)
	}
	host, port := requestedOrigin(upOpts, state, up, up && e.frontDoorRunning(ctx))
	if port == 0 {
		if port, err = freePort(ctx); err != nil {
			return nil, err
		}
	}
	opts.Origin = stack().Origin(host, port)
	return opts, nil
}

// devBuilds resolves the --dev paths against the current directory.
func (e *Env) devBuilds(dev map[string]string) (map[string]DevBuild, error) {
	if len(dev) == 0 {
		return nil, nil //nolint:nilnil // No dev build.
	}
	cwd, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("current directory: %w", err)
	}
	return resolveDevBuilds(dev, cwd)
}

func (e *Env) runForeground(ctx context.Context, localtestURL string, opts *Options) error {
	e.out.Println("")
	e.out.Println("localtest-v2 is running. Press Ctrl+C to stop.")
	e.out.Printlnf("Access the platform at: %s", localtestURL)

	streamer := envstack.NewLogStreamer(e.client, e.out, containerNames(opts))
	if err := streamer.Stream(ctx, "", true, false); err != nil {
		e.out.Verbosef("log streaming ended: %v", err)
	}
	e.out.Println("")
	e.out.Println(stoppingMessage)

	teardownCtx, cancel := context.WithTimeout(context.Background(), teardownTimeout)
	defer cancel()
	//nolint:contextcheck // intentionally using new context for cleanup after cancellation
	if err := e.teardown(teardownCtx, ""); err != nil {
		e.out.Warningf("Failed to stop environment cleanly: %v", err)
		return err
	}
	//nolint:contextcheck // same cleanup context
	if err := e.forgetState(teardownCtx, nil); err != nil {
		return err
	}
	e.out.Println("Environment stopped.")
	return nil
}

func (e *Env) hasManagedResources(ctx context.Context) (bool, error) {
	managed, err := e.managedResources(ctx)
	return len(managed) > 0, err
}

// managedResources lists the resources of this runtime that exist, sorted: its containers and its network.
func (e *Env) managedResources(ctx context.Context) ([]string, error) {
	_, snapshot, err := e.stack.Observe(ctx, resources(e.teardownOptions(), nil))
	if err != nil {
		return nil, fmt.Errorf("observe localtest-v2: %w", err)
	}
	var managed []string
	for id, observed := range snapshot.Resources {
		if !observed.Managed || observed.Status == executor.StatusDestroyed {
			continue
		}
		managed = append(managed, id.String())
	}
	slices.Sort(managed)
	return managed, nil
}

func (e *Env) applyResources(ctx context.Context, resources []resource.Resource, building bool) error {
	spinnerMsg := "Starting localtest-v2 environment..."
	if building {
		spinnerMsg = "Building and starting localtest-v2 environment..."
	}
	if err := e.stack.Apply(ctx, resources, spinnerMsg); err != nil {
		return fmt.Errorf("apply localtest-v2: %w", err)
	}
	e.out.Success("Containers started")
	return nil
}

func (e *Env) destroyResources(ctx context.Context, resources []resource.Resource, logStartMessage string) error {
	if err := e.stack.Destroy(ctx, resources, logStartMessage); err != nil {
		return fmt.Errorf("destroy localtest-v2: %w", err)
	}
	return nil
}
