package runs

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/go-logr/logr"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"altinn.studio/core-operator/internal/clock"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/engine"
	"altinn.studio/core-operator/internal/telemetry"
)

const gcInterval = time.Minute

// Collector deletes the Jobs of runs whose workflow does not reach run.cleanup, such as after a cancel or a failure.
// It runs on the leader only. The Job's deadline and TTL are the last backstop.
type Collector struct {
	cfg    *config.Config
	engine *engine.Client
	kube   *Kube
	clock  clock.Clock
}

func NewCollector(cfg *config.Config, engineClient *engine.Client, kube *Kube, clk clock.Clock) *Collector {
	return &Collector{cfg: cfg, engine: engineClient, kube: kube, clock: clk}
}

// NeedLeaderElection makes the manager run the collector on the leader only.
func (c *Collector) NeedLeaderElection() bool {
	return true
}

// Start runs Collect every minute until ctx ends.
func (c *Collector) Start(ctx context.Context) error {
	ticker := c.clock.NewTicker(gcInterval)
	defer ticker.Stop()
	for {
		c.Collect(ctx)
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.Chan():
		}
	}
}

// Collect makes one pass. It deletes the Jobs of runs that have ended or that the engine does not know, and leaves
// alone whatever it cannot decide, such as when the engine does not answer. The cache holds Jobs in the namespaces of
// the configured kinds only.
func (c *Collector) Collect(ctx context.Context) {
	ctx, span := telemetry.Tracer().Start(ctx, "gc.Collect")
	defer span.End()
	logger := log.FromContext(ctx).WithName("gc")
	for _, namespace := range c.cfg.KindNamespaces() {
		c.collectJobs(ctx, logger, namespace)
	}
}

func (c *Collector) collectJobs(ctx context.Context, logger logr.Logger, namespace string) {
	jobs, err := c.kube.ManagedJobs(ctx, namespace)
	if err != nil {
		logger.Error(err, "List run Jobs failed", "namespace", namespace)
		return
	}
	for i := range jobs {
		job := &jobs[i]
		runID := job.Labels[LabelRunID]
		workflow, err := c.workflowOf(ctx, runID, job.Labels[LabelRunCaller])
		switch {
		case errors.Is(err, engine.ErrNotFound):
			// The engine has no workflow for the Job, so nothing else will delete it.
		case err != nil:
			logger.Info("Could not find the workflow of a run Job", "job", job.Name, "error", err.Error())
			continue
		case !workflow.OverallStatus.Terminal():
			continue
		}
		if err := c.kube.DeleteJob(ctx, namespace, runID); err != nil {
			logger.Error(err, "Delete run Job failed", "job", job.Name)
			continue
		}
		logger.Info("Deleted the Job of a finished run", "job", job.Name)
	}
}

// workflowOf finds the workflow of a run Job by the Job's labels, or returns engine.ErrNotFound when the engine has
// none.
func (c *Collector) workflowOf(ctx context.Context, runID, caller string) (*engine.Workflow, error) {
	if !ValidRunID(runID) || caller == "" {
		return nil, engine.ErrNotFound
	}
	labels := map[string]string{workflowLabelRunID: runID}
	workflows, err := c.engine.FindByLabels(ctx, EngineNamespace(caller), labels, 1)
	if err != nil {
		return nil, fmt.Errorf("find the workflow: %w", err)
	}
	if len(workflows) == 0 {
		return nil, engine.ErrNotFound
	}
	return &workflows[0], nil
}
