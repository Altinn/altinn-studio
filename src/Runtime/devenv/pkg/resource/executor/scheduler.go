package executor

import (
	"context"
	"errors"
	"fmt"
	"slices"

	"golang.org/x/sync/errgroup"

	"altinn.studio/devenv/pkg/resource"
)

var errResourceScheduleBlocked = errors.New("resource schedule is blocked")

type scheduleOrder uint8

const (
	scheduleDependenciesFirst scheduleOrder = iota
	scheduleDependentsFirst
)

type resourceScheduler struct {
	resources map[resource.ResourceID]resource.Resource
	blockedBy map[resource.ResourceID]int
	unblocks  map[resource.ResourceID][]resource.ResourceID
	order     []resource.ResourceID
}

type scheduleResult struct {
	err error
	id  resource.ResourceID
}

type resourceScheduleRunner struct {
	group     *errgroup.Group
	scheduler *resourceScheduler
	done      chan scheduleResult
	ready     []resource.ResourceID
	running   int
}

func schedulerResources(g *resource.Graph, ids []resource.ResourceID) ([]resource.Resource, error) {
	resources := make([]resource.Resource, 0, len(ids))
	for _, id := range ids {
		r := g.Get(id)
		if r == nil {
			return nil, fmt.Errorf("%w: %q", errGraphResourceNotFound, id)
		}
		resources = append(resources, r)
	}
	return resources, nil
}

func newResourceScheduler(resources []resource.Resource, order scheduleOrder) *resourceScheduler {
	scheduler := &resourceScheduler{
		resources: make(map[resource.ResourceID]resource.Resource, len(resources)),
		blockedBy: make(map[resource.ResourceID]int, len(resources)),
		unblocks:  make(map[resource.ResourceID][]resource.ResourceID, len(resources)),
		order:     make([]resource.ResourceID, 0, len(resources)),
	}
	for _, r := range resources {
		id := r.ID()
		scheduler.resources[id] = r
		scheduler.blockedBy[id] = 0
		scheduler.order = append(scheduler.order, id)
	}
	slices.Sort(scheduler.order)

	for _, id := range scheduler.order {
		r := scheduler.resources[id]
		for _, ref := range r.Dependencies() {
			depID := ref.ID()
			if _, ok := scheduler.resources[depID]; !ok {
				continue
			}
			switch order {
			case scheduleDependenciesFirst:
				scheduler.blockedBy[id]++
				scheduler.unblocks[depID] = append(scheduler.unblocks[depID], id)
			case scheduleDependentsFirst:
				scheduler.blockedBy[depID]++
				scheduler.unblocks[id] = append(scheduler.unblocks[id], depID)
			}
		}
	}
	for id := range scheduler.unblocks {
		slices.Sort(scheduler.unblocks[id])
	}
	return scheduler
}

func (s *resourceScheduler) len() int {
	return len(s.resources)
}

func (s *resourceScheduler) ready() []resource.ResourceID {
	ready := make([]resource.ResourceID, 0)
	for _, id := range s.order {
		if s.blockedBy[id] == 0 {
			ready = append(ready, id)
		}
	}
	return ready
}

func (s *resourceScheduler) resource(id resource.ResourceID) resource.Resource {
	return s.resources[id]
}

func (s *resourceScheduler) complete(id resource.ResourceID) []resource.ResourceID {
	delete(s.blockedBy, id)

	ready := make([]resource.ResourceID, 0)
	for _, unblockedID := range s.unblocks[id] {
		remaining, ok := s.blockedBy[unblockedID]
		if !ok {
			continue
		}
		remaining--
		s.blockedBy[unblockedID] = remaining
		if remaining == 0 {
			ready = append(ready, unblockedID)
		}
	}
	return ready
}

func newResourceScheduleRunner(
	ctx context.Context,
	scheduler *resourceScheduler,
) (*resourceScheduleRunner, context.Context) {
	eg, groupCtx := errgroup.WithContext(ctx)
	return &resourceScheduleRunner{
		group:     eg,
		scheduler: scheduler,
		done:      make(chan scheduleResult, scheduler.len()),
		ready:     scheduler.ready(),
	}, groupCtx
}

func (r *resourceScheduleRunner) startReady(
	ctx context.Context,
	run func(context.Context, resource.Resource) error,
) {
	for len(r.ready) > 0 && ctx.Err() == nil {
		id := r.ready[0]
		r.ready = r.ready[1:]
		r.start(ctx, id, run)
	}
}

func (r *resourceScheduleRunner) start(
	ctx context.Context,
	id resource.ResourceID,
	run func(context.Context, resource.Resource) error,
) {
	r.running++
	res := r.scheduler.resource(id)
	r.group.Go(func() error {
		err := run(ctx, res)
		r.done <- scheduleResult{id: id, err: err}
		return err
	})
}

func (r *resourceScheduleRunner) waitForCompletion(ctx context.Context) (bool, error) {
	if r.running == 0 {
		if err := ctx.Err(); err != nil {
			return false, r.waitAfterCancel(err)
		}
		return false, errResourceScheduleBlocked
	}

	result := <-r.done
	r.running--
	if result.err != nil {
		return false, r.waitAfterError(result.err)
	}
	r.ready = append(r.ready, r.scheduler.complete(result.id)...)
	return true, nil
}

func (r *resourceScheduleRunner) waitAfterCancel(err error) error {
	if waitErr := r.group.Wait(); waitErr != nil && !errors.Is(waitErr, err) {
		return errors.Join(
			fmt.Errorf("resource schedule canceled: %w", err),
			fmt.Errorf("wait for scheduled resources: %w", waitErr),
		)
	}
	return fmt.Errorf("resource schedule canceled: %w", err)
}

func (r *resourceScheduleRunner) waitAfterError(err error) error {
	if waitErr := r.group.Wait(); waitErr != nil && !errors.Is(waitErr, err) {
		return errors.Join(err, fmt.Errorf("wait for scheduled resources: %w", waitErr))
	}
	return err
}

func (r *resourceScheduleRunner) wait() error {
	if err := r.group.Wait(); err != nil {
		return fmt.Errorf("wait for scheduled resources: %w", err)
	}
	return nil
}

func runResourceScheduler(
	ctx context.Context,
	scheduler *resourceScheduler,
	run func(context.Context, resource.Resource) error,
) error {
	if scheduler.len() == 0 {
		return nil
	}

	runner, groupCtx := newResourceScheduleRunner(ctx, scheduler)
	completed := 0
	for completed < scheduler.len() {
		runner.startReady(groupCtx, run)
		ok, err := runner.waitForCompletion(groupCtx)
		if err != nil {
			return err
		}
		if ok {
			completed++
		}
	}
	return runner.wait()
}
