// Package stack applies, destroys and observes an environment runtime's devenv resource graph. Every env runtime
// describes its environment as resources under its own graph ID. This package owns what they do with them alike:
// the executor, the progress rendering, the status snapshot and the log streaming.
package stack

import (
	"context"
	"errors"
	"fmt"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"
	containerbackend "altinn.studio/devenv/pkg/resource/executor/container"
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	"altinn.studio/studioctl/internal/ui"
	"altinn.studio/studioctl/internal/ui/resourcegraph"
)

var (
	// ErrUnknownComponent is returned when an unknown component is specified for logs.
	ErrUnknownComponent = errors.New("unknown component")

	// ErrNotRunning is returned when none of the environment's containers runs.
	ErrNotRunning = errors.New("environment not running")
)

// Stack runs one runtime's resource graph.
type Stack struct {
	client  container.ContainerClient
	out     *ui.Output
	graphID resource.GraphID
	verbose bool
}

// New returns the stack of the runtime whose resources carry graphID.
func New(client container.ContainerClient, out *ui.Output, graphID string, verbose bool) *Stack {
	return &Stack{
		client:  client,
		out:     out,
		graphID: resource.GraphID(graphID),
		verbose: verbose,
	}
}

// Graph builds and validates the resource graph of resources.
func (s *Stack) Graph(resources []resource.Resource) (*resource.Graph, error) {
	graph := resource.NewGraph(s.graphID)
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

// Active reports whether any container of this runtime's graph is running. It reads the containers' ownership
// labels rather than a resource list, so it answers for whatever configuration the environment was started with.
func (s *Stack) Active(ctx context.Context) (bool, error) {
	containers, err := s.client.ListContainers(ctx, types.ContainerListFilter{
		Labels: map[string]string{containerbackend.GraphIDLabel: s.graphID.String()},
		All:    false,
	})
	if err != nil {
		return false, fmt.Errorf("list containers of %s: %w", s.graphID, err)
	}
	for _, ctr := range containers {
		if ctr.State.Running {
			return true, nil
		}
	}
	return false, nil
}

// Apply creates or converges resources, rendering progress under spinnerMsg, and warns about images it could not
// refresh from their registry.
func (s *Stack) Apply(ctx context.Context, resources []resource.Resource, spinnerMsg string) error {
	graph, err := s.Graph(resources)
	if err != nil {
		return err
	}
	exec, err := newExecutor(s.client)
	if err != nil {
		return err
	}

	var renderer resourcegraph.Renderer
	outputs, err := exec.Apply(ctx, graph, executor.WithApplyPlan(func(plan executor.ApplyPlan) error {
		s.startRenderer(
			&renderer,
			exec,
			applyPlannedResources(plan),
			resourcegraph.OperationApply,
			plan.Snapshot.Statuses(),
			spinnerMsg,
		)
		return nil
	}))
	if err != nil {
		failRenderer(renderer, err)
		return fmt.Errorf("start environment: %w", err)
	}
	stopRenderer(renderer)
	s.warnAboutStaleImages(resources, outputs)
	return nil
}

// Destroy removes resources, rendering progress. logStartMessage heads the plain log output.
func (s *Stack) Destroy(ctx context.Context, resources []resource.Resource, logStartMessage string) error {
	graph, err := s.Graph(resources)
	if err != nil {
		return err
	}
	exec, err := newExecutor(s.client)
	if err != nil {
		return err
	}

	var renderer resourcegraph.Renderer
	if err := exec.Destroy(ctx, graph, executor.WithDestroyPlan(func(plan executor.DestroyPlan) error {
		s.startRenderer(
			&renderer,
			exec,
			plan.Destroy,
			resourcegraph.OperationDestroy,
			plan.Snapshot.Statuses(),
			logStartMessage,
		)
		return nil
	})); err != nil {
		failRenderer(renderer, err)
		return fmt.Errorf("destroy resources: %w", err)
	}
	stopRenderer(renderer)
	return nil
}

// Observe reads the state of resources' containers and networks, not their images.
func (s *Stack) Observe(
	ctx context.Context,
	resources []resource.Resource,
) (*resource.Graph, executor.Snapshot, error) {
	graph, err := s.Graph(resources)
	if err != nil {
		return nil, executor.Snapshot{}, fmt.Errorf("build resource graph: %w", err)
	}
	exec, err := newExecutor(s.client)
	if err != nil {
		return nil, executor.Snapshot{}, err
	}
	snapshot, err := exec.Status(ctx, graph, executor.SkipResource(isImageResource))
	if err != nil {
		return nil, executor.Snapshot{}, fmt.Errorf("get resource status: %w", err)
	}
	return graph, snapshot, nil
}

// HasManagedResources reports whether any container or network of resources exists and is owned by this runtime.
func (s *Stack) HasManagedResources(ctx context.Context, resources []resource.Resource) (bool, error) {
	_, snapshot, err := s.Observe(ctx, resources)
	if err != nil {
		return false, err
	}
	for _, observed := range snapshot.Resources {
		if !observed.Managed || observed.Status == executor.StatusDestroyed {
			continue
		}
		if observed.Resource != nil && !isRuntimeResource(observed.Resource) {
			continue
		}
		return true, nil
	}
	return false, nil
}

// ContainerImages resolves the image behind each container that exists, keyed by container name. It reads the
// container rather than the configured reference because a moving tag no longer identifies a build: a container keeps
// the one it was created from until the environment is recreated, which is as true of a stopped container as a
// running one. refOf names the reference a container is configured with, empty when there is none to report.
func (s *Stack) ContainerImages(
	ctx context.Context,
	resources []resource.Resource,
	snapshot executor.Snapshot,
	refOf func(*resource.Container) string,
) map[string]envtypes.ContainerImage {
	images := make(map[string]envtypes.ContainerImage)
	for _, res := range resources {
		containerResource, ok := res.(*resource.Container)
		if !ok {
			continue
		}
		observed, found := snapshot.Resources[containerResource.ID()]
		if !found || observed.ImageID == "" {
			continue
		}
		images[containerResource.Name] = s.resolveContainerImage(ctx, observed.ImageID, refOf(containerResource))
	}
	return images
}

// resolveContainerImage pairs an image with the reference it came from, and keeps the reference only when it still
// resolves to that image. A reference a command builds can name something the environment never ran, such as a tag that
// has moved since, or a component the environment was started with differently. Reporting it would then misdescribe
// the container.
func (s *Stack) resolveContainerImage(ctx context.Context, imageID, ref string) envtypes.ContainerImage {
	if ref == "" {
		return envtypes.ContainerImage{Ref: "", ImageID: imageID}
	}
	info, err := s.client.ImageInspect(ctx, ref)
	if err != nil || info.ID != imageID {
		return envtypes.ContainerImage{Ref: "", ImageID: imageID}
	}
	return envtypes.ContainerImage{Ref: ref, ImageID: imageID}
}

// warnAboutStaleImages reports images the registry could not be reached for. The environment then runs whatever copy
// is on the machine, which can be any age, and the progress line saying so is gone by the time the run finishes.
func (s *Stack) warnAboutStaleImages(resources []resource.Resource, outputs executor.Outputs) {
	for _, res := range resources {
		image, ok := res.(*resource.PulledImage)
		if !ok {
			continue
		}
		if output, found := outputs.Image(image.ID()); found && output.Stale {
			s.out.Warningf("Could not reach the registry for %s; using the copy already on this machine.", image.Ref)
		}
	}
}

// startRenderer starts the progress renderer the terminal calls for in renderer and makes it exec's observer.
func (s *Stack) startRenderer(
	renderer *resourcegraph.Renderer,
	exec *executor.Executor,
	resources []executor.PlannedResource,
	operation resourcegraph.Operation,
	statuses map[resource.ResourceID]executor.Status,
	logStartMessage string,
) {
	switch resourcegraph.DetectMode(s.out, s.verbose) {
	case resourcegraph.ModeTable:
		*renderer = resourcegraph.NewTableWithPlan(s.out, resources, operation, statuses)
	case resourcegraph.ModeCompact:
		*renderer = resourcegraph.NewCompactWithPlan(s.out, resources, operation, statuses)
	case resourcegraph.ModeLog:
		*renderer = resourcegraph.NewLogWithPlan(s.out, resources, operation, statuses, logStartMessage)
	default:
		*renderer = resourcegraph.NewLogWithPlan(s.out, resources, operation, statuses, logStartMessage)
	}
	(*renderer).Start()
	exec.SetObserver(*renderer)
}

func failRenderer(renderer resourcegraph.Renderer, err error) {
	if renderer == nil {
		return
	}
	renderer.FailAll(err.Error())
	renderer.Stop()
}

func stopRenderer(renderer resourcegraph.Renderer) {
	if renderer != nil {
		renderer.Stop()
	}
}

func newExecutor(client container.ContainerClient) (*executor.Executor, error) {
	exec := executor.New()
	if err := exec.RegisterBackend(containerbackend.New(client)); err != nil {
		return nil, fmt.Errorf("create resource executor: register container backend: %w", err)
	}
	return exec, nil
}

func applyPlannedResources(plan executor.ApplyPlan) []executor.PlannedResource {
	resources := make([]executor.PlannedResource, 0, len(plan.Destroy)+len(plan.Reconcile))
	resources = append(resources, plan.Destroy...)
	resources = append(resources, plan.Reconcile...)
	return resources
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

// ManagedStatus is a resource's status in snapshot. A resource this runtime does not own counts as destroyed.
func ManagedStatus(snapshot executor.Snapshot, id resource.ResourceID) executor.Status {
	observed, ok := snapshot.Resources[id]
	if !ok || !observed.Managed {
		return executor.StatusDestroyed
	}
	return observed.Status
}

// StatusString renders a container's status for `env status`.
func StatusString(status executor.Status) string {
	if status == executor.StatusDestroyed {
		return "not found"
	}
	if status == executor.StatusReady {
		return "running"
	}
	return status.String()
}
