package localtestv2

import (
	"context"
	"errors"
	"fmt"
	"maps"
	"os"
	"slices"
	"strings"
	"time"

	"altinn.studio/devenv/pkg/container"
	containertypes "altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"
	containerbackend "altinn.studio/devenv/pkg/resource/executor/container"
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	envlocaltest "altinn.studio/studioctl/internal/cmd/env/localtest"
	v1components "altinn.studio/studioctl/internal/cmd/env/localtest/components"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/localtestv2"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/studioctlserver"
	"altinn.studio/studioctl/internal/ui"
	"altinn.studio/studioctl/internal/ui/resourcegraph"
)

const (
	// Name is the runtime's name on the command line (-r localtest-v2).
	Name = "localtest-v2"

	// graphID scopes devenv ownership labels to this runtime's graph.
	graphID = "studioctl-localtest-v2"

	teardownTimeout = 30 * time.Second
	stoppingMessage = "Stopping localtest-v2 environment..."
)

var (
	// ErrLocaltestRunning is returned when the localtest runtime holds the public origin's port.
	ErrLocaltestRunning = errors.New("the localtest runtime is running; stop it first with 'env down'")
)

// Env implements envtypes.Env for the localtest-v2 runtime.
type Env struct {
	cfg    *config.Config
	out    *ui.Output
	client container.ContainerClient
}

// NewEnv creates the localtest-v2 environment manager.
func NewEnv(cfg *config.Config, out *ui.Output, client container.ContainerClient) *Env {
	return &Env{cfg: cfg, out: out, client: client}
}

// Name returns the runtime name.
func (e *Env) Name() string {
	return Name
}

// Preflight validates prerequisites before startup: the localtest runtime must not hold port 8000, the groups must be
// known, and a dev build must name a container and a Dockerfile.
func (e *Env) Preflight(ctx context.Context, opts envtypes.UpOptions) error {
	if err := envlocaltest.CheckForLegacyLocaltest(ctx, e.client); err != nil {
		return fmt.Errorf("check for legacy localtest: %w", err)
	}
	info, err := e.client.ContainerInspect(ctx, v1components.ContainerLocaltest)
	if err == nil && info.State.Running {
		return ErrLocaltestRunning
	}
	if err != nil && !errors.Is(err, container.ErrContainerNotFound) {
		return fmt.Errorf("inspect container %s: %w", v1components.ContainerLocaltest, err)
	}
	if _, err := e.devBuilds(opts.DevComponents); err != nil {
		return err
	}
	if _, err := ResolveGroups(opts.With, opts.Without); err != nil {
		return err
	}
	return nil
}

// Changed reports whether `env up` asks for other optional groups, other images (--latest) or other dev builds than
// the running environment was started with, in which case an environment that is already healthy still has to be
// converged: a plain `env up` after `env up --dev-storage` runs the pinned Storage again.
func (e *Env) Changed(opts envtypes.UpOptions) (bool, error) {
	want, err := ResolveGroups(opts.With, opts.Without)
	if err != nil {
		return false, err
	}
	state, _, err := localtestv2.ReadState(e.cfg)
	if err != nil {
		return false, fmt.Errorf("read localtest-v2 state: %w", err)
	}
	have := slices.Clone(state.Groups)
	slices.Sort(have)
	return !slices.Equal(want, have) ||
		opts.LatestImages != state.LatestImages ||
		!slices.Equal(slices.Sorted(maps.Keys(opts.DevComponents)), state.Dev), nil
}

// Up starts the environment: writes the certificate and the state file, restarts studioctl-server so that it
// registers the apps it discovers with the front door, applies the containers (each one's health checked before what
// depends on it starts), and waits until the front door answers on the public origin.
func (e *Env) Up(ctx context.Context, upOpts envtypes.UpOptions) error {
	toolchain := e.client.Toolchain()
	e.out.Verbosef("Using container toolchain: %s via %s", toolchain.Platform, toolchain.AccessMode)

	opts, err := e.options(upOpts)
	if err != nil {
		return err
	}
	if err := ensureCertificate(opts.CertDir); err != nil {
		return err
	}
	if err := localtestv2.WriteState(e.cfg, localtestv2.State{
		CertificateDir: opts.CertDir,
		Groups:         opts.Groups,
		Dev:            slices.Sorted(maps.Keys(opts.Dev)),
		LatestImages:   opts.LatestImages,
	}); err != nil {
		return fmt.Errorf("record localtest-v2 state: %w", err)
	}
	// A restart, not only a start: the server then registers every running app again once the front door answers,
	// and a registration provisions the app for the groups that are up now, so an app registered before
	// `env up --with dialogporten` is synced to Dialogporten too. The front door keeps its registrations on its volume,
	// so a server that kept running would see nothing to do.
	if err := studioctlserver.Restart(ctx, e.cfg, opts.Topology.IngressPort()); err != nil {
		return fmt.Errorf("restart studioctl-server: %w", err)
	}

	probes := newProber(e.client, e.out.Verbosef).probes
	if err := e.applyResources(ctx, resources(opts, probes), len(opts.Dev) > 0); err != nil {
		return err
	}
	e.out.Println("Waiting for the front door to answer...")
	if err := waitFrontDoor(ctx, e.out, frontDoorHealthURL(opts)); err != nil {
		return fmt.Errorf("localtest-v2 did not become healthy: %w", err)
	}
	e.out.Success("Environment healthy")

	localtestURL := opts.Topology.LocaltestURL()
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
	if err := e.destroyResources(ctx, resources(e.teardownOptions(), nil), stoppingMessage); err != nil {
		return fmt.Errorf("stop environment: %w", err)
	}
	if err := e.forgetState(ctx, nil); err != nil {
		return err
	}
	e.out.Success("Environment stopped")
	return nil
}

// Reset stops the environment if needed and deletes its volumes: the manifest's, with this runtime's prefix only.
func (e *Env) Reset(ctx context.Context) error {
	hasResources, err := e.hasManagedResources(ctx)
	if err != nil {
		return err
	}
	if hasResources {
		if err := e.destroyResources(ctx, resources(e.teardownOptions(), nil), stoppingMessage); err != nil {
			return fmt.Errorf("stop environment: %w", err)
		}
	}
	if err := e.forgetState(ctx, nil); err != nil {
		return err
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
	streamer := envlocaltest.NewLogStreamer(e.client, e.out, containerNames(current))
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
func (e *Env) Status(ctx context.Context) (*envlocaltest.Status, error) {
	current, err := e.currentOptions()
	if err != nil {
		return nil, err
	}
	graph, err := buildResourceGraph(resources(current, nil))
	if err != nil {
		return nil, err
	}
	exec, err := newResourceExecutor(e.client)
	if err != nil {
		return nil, err
	}
	snapshot, err := exec.Status(ctx, graph, executor.SkipResource(isImageResource))
	if err != nil {
		return nil, fmt.Errorf("get resource status: %w", err)
	}

	status := envlocaltest.Status{Containers: []envlocaltest.ContainerStatus{}, Running: false, AnyRunning: false}
	ready := 0
	for _, res := range graph.All() {
		ctr, ok := res.(*resource.Container)
		if !ok {
			continue
		}
		resourceStatus, imageID := observedContainer(snapshot, ctr)
		status.Containers = append(status.Containers, envlocaltest.ContainerStatus{
			Name:    ctr.Name,
			Image:   e.imageRef(ctx, ctr, imageID),
			ImageID: imageID,
			Status:  statusString(resourceStatus),
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

// observedContainer reads a container's status and image from the snapshot; a container studioctl does
// not own counts as absent.
func observedContainer(snapshot executor.Snapshot, ctr *resource.Container) (executor.Status, string) {
	observed, present := snapshot.Resources[ctr.ID()]
	if !present || !observed.Managed {
		return executor.StatusDestroyed, ""
	}
	return observed.Status, observed.ImageID
}

// imageRef names the reference a container was pulled from, when that reference still resolves to the
// build the container runs; a dev build or a moved tag has none.
func (e *Env) imageRef(ctx context.Context, ctr *resource.Container, imageID string) string {
	pulled, isPulled := ctr.Image.Resource().(*resource.PulledImage)
	if !isPulled || imageID == "" {
		return ""
	}
	info, err := e.client.ImageInspect(ctx, pulled.Ref)
	if err != nil || info.ID != imageID {
		return ""
	}
	return pulled.Ref
}

func statusString(status executor.Status) string {
	if status == executor.StatusDestroyed {
		return "not found"
	}
	if status == executor.StatusReady {
		return "running"
	}
	return status.String()
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
	return defaultOptions(localtestv2.CertificateDir(e.cfg))
}

// currentOptions are the options of the environment as it was started: the optional groups and the image tags come
// from the state file, so status and logs cover the containers that exist, do not report a group that was never
// started as missing, and name the images the containers were started from.
func (e *Env) currentOptions() (*Options, error) {
	opts := e.defaultOptions()
	state, _, err := localtestv2.ReadState(e.cfg)
	if err != nil {
		return nil, fmt.Errorf("read localtest-v2 state: %w", err)
	}
	opts.Groups = state.Groups
	opts.LatestImages = state.LatestImages
	return opts, nil
}

// teardownOptions include every optional group, so that stopping or resetting finds the containers of whichever were
// started, even when the state file is gone.
func (e *Env) teardownOptions() *Options {
	opts := e.defaultOptions()
	opts.Groups = OptionalGroups()
	return opts
}

func (e *Env) options(upOpts envtypes.UpOptions) (*Options, error) {
	opts := e.defaultOptions()
	_, _, opts.RelabelBinds = v1components.RuntimeUser(e.client.Toolchain())
	opts.LatestImages = upOpts.LatestImages
	groups, err := ResolveGroups(upOpts.With, upOpts.Without)
	if err != nil {
		return nil, err
	}
	opts.Groups = groups
	if opts.Dev, err = e.devBuilds(upOpts.DevComponents); err != nil {
		return nil, err
	}
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

	streamer := envlocaltest.NewLogStreamer(e.client, e.out, containerNames(opts))
	if err := streamer.Stream(ctx, "", true, false); err != nil {
		e.out.Verbosef("log streaming ended: %v", err)
	}
	e.out.Println("")
	e.out.Println(stoppingMessage)

	teardownCtx, cancel := context.WithTimeout(context.Background(), teardownTimeout)
	defer cancel()
	//nolint:contextcheck // intentionally using new context for cleanup after cancellation
	if err := e.destroyResources(teardownCtx, resources(e.teardownOptions(), nil), ""); err != nil {
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
	graph, err := buildResourceGraph(resources(e.teardownOptions(), nil))
	if err != nil {
		return false, err
	}
	exec, err := newResourceExecutor(e.client)
	if err != nil {
		return false, err
	}
	snapshot, err := exec.Status(ctx, graph, executor.SkipResource(isImageResource))
	if err != nil {
		return false, fmt.Errorf("get resource status: %w", err)
	}
	for _, observed := range snapshot.Resources {
		if !observed.Managed || observed.Status == executor.StatusDestroyed {
			continue
		}
		return true, nil
	}
	return false, nil
}

func (e *Env) applyResources(ctx context.Context, resources []resource.Resource, building bool) error {
	graph, err := buildResourceGraph(resources)
	if err != nil {
		return err
	}
	exec, err := newResourceExecutor(e.client)
	if err != nil {
		return err
	}
	spinnerMsg := "Starting localtest-v2 environment..."
	if building {
		spinnerMsg = "Building and starting localtest-v2 environment..."
	}

	var renderer resourcegraph.Renderer
	outputs, err := exec.Apply(ctx, graph, executor.WithApplyPlan(func(plan executor.ApplyPlan) error {
		planned := make([]executor.PlannedResource, 0, len(plan.Destroy)+len(plan.Reconcile))
		planned = append(planned, plan.Destroy...)
		planned = append(planned, plan.Reconcile...)
		e.startRenderer(exec, &renderer, planned, resourcegraph.OperationApply, plan.Snapshot.Statuses(), spinnerMsg)
		return nil
	}))
	if err != nil {
		if renderer != nil {
			renderer.FailAll(err.Error())
			renderer.Stop()
		}
		return fmt.Errorf("start environment: %w", err)
	}
	if renderer != nil {
		renderer.Stop()
	}
	for _, res := range resources {
		image, ok := res.(*resource.PulledImage)
		if !ok {
			continue
		}
		if output, found := outputs.Image(image.ID()); found && output.Stale {
			e.out.Warningf("Could not reach the registry for %s; using the copy already on this machine.", image.Ref)
		}
	}
	e.out.Success("Containers started")
	return nil
}

func (e *Env) destroyResources(ctx context.Context, resources []resource.Resource, logStartMessage string) error {
	graph, err := buildResourceGraph(resources)
	if err != nil {
		return err
	}
	exec, err := newResourceExecutor(e.client)
	if err != nil {
		return err
	}
	var renderer resourcegraph.Renderer
	if err := exec.Destroy(ctx, graph, executor.WithDestroyPlan(func(plan executor.DestroyPlan) error {
		e.startRenderer(
			exec,
			&renderer,
			plan.Destroy,
			resourcegraph.OperationDestroy,
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
	exec *executor.Executor,
	renderer *resourcegraph.Renderer,
	resources []executor.PlannedResource,
	operation resourcegraph.Operation,
	statuses map[resource.ResourceID]executor.Status,
	logStartMessage string,
) {
	switch resourcegraph.DetectMode(e.out, e.cfg.Verbose) {
	case resourcegraph.ModeTable:
		*renderer = resourcegraph.NewTableWithPlan(e.out, resources, operation, statuses)
	case resourcegraph.ModeCompact:
		*renderer = resourcegraph.NewCompactWithPlan(e.out, resources, operation, statuses)
	case resourcegraph.ModeLog:
		*renderer = resourcegraph.NewLogWithPlan(e.out, resources, operation, statuses, logStartMessage)
	default:
		*renderer = resourcegraph.NewLogWithPlan(e.out, resources, operation, statuses, logStartMessage)
	}
	(*renderer).Start()
	exec.SetObserver(*renderer)
}

func newResourceExecutor(client container.ContainerClient) (*executor.Executor, error) {
	exec := executor.New()
	if err := exec.RegisterBackend(containerbackend.New(client)); err != nil {
		return nil, fmt.Errorf("register container backend: %w", err)
	}
	return exec, nil
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

func isImageResource(res resource.Resource) bool {
	_, ok := res.(resource.ImageResource)
	return ok
}
