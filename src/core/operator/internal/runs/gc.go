package runs

import (
	"context"
	"errors"
	"fmt"
	"time"

	commontelemetry "altinn.studio/common/telemetry"

	"altinn.studio/core-operator/internal/callbacks"
	"altinn.studio/core-operator/internal/clock"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/engine"
	"altinn.studio/core-operator/internal/logging"
	"altinn.studio/core-operator/internal/sandbox"
	"altinn.studio/core-operator/internal/telemetry"
)

const gcInterval = time.Minute

// release frees what an ended run holds. It frees the place of the run in the queue. It deletes the Job after it relays
// the warnings and errors of the operator runner. A cancel, a step that ends the run, and run.cleanup call release. It
// is safe to repeat.
func release(ctx context.Context, queue *Queue, box sandbox.Sandbox, namespace, runID string) error {
	queue.Forget(runID)
	return deleteJob(ctx, box, namespace, runID)
}

// Collector deletes the Jobs of runs that ended without a release. This occurs if the engine failed a step itself, or
// if a release did not delete the Job. The deadline and TTL of the Job are the last safeguard.
type Collector struct {
	cfg     *config.Config
	engine  *engine.Client
	sandbox sandbox.Sandbox
	clock   clock.Clock
}

func NewCollector(cfg *config.Config, engineClient *engine.Client, box sandbox.Sandbox, clk clock.Clock) *Collector {
	return &Collector{cfg: cfg, engine: engineClient, sandbox: box, clock: clk}
}

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

// Collect makes one pass. It deletes the Jobs of runs that ended or that the engine does not know. It keeps a Job if it
// cannot decide, for example if the engine does not answer. The cache holds Jobs only in the namespaces of the
// configured kinds. A pass logs one record for its failures, so that an engine that is down does not log one per Job.
func (c *Collector) Collect(ctx context.Context) {
	ctx, span := telemetry.Tracer().Start(ctx, "gc.collect")
	defer span.End()
	var failed failures
	for _, namespace := range c.cfg.KindNamespaces() {
		c.collectJobs(ctx, namespace, &failed)
	}
	if failed.count > 0 {
		commontelemetry.SetError(span, failed.step, failed.first)
		logging.FromContext(ctx).WithName("gc").Error(failed.first, "Collect run Jobs failed", "failures", failed.count)
	}
}

// failures counts the failures of a pass, and keeps the first with the step that failed.
type failures struct {
	first error
	step  string
	count int
}

func (f *failures) add(step string, err error) {
	if f.count == 0 {
		f.first, f.step = err, step
	}
	f.count++
}

func (c *Collector) collectJobs(ctx context.Context, namespace string, failed *failures) {
	jobs, err := c.sandbox.Jobs(ctx, namespace)
	if err != nil {
		failed.add("list_jobs", fmt.Errorf("list the run Jobs in %s: %w", namespace, err))
		return
	}
	for _, job := range jobs {
		workflow, err := locate(ctx, c.engine, job.Caller, job.RunID)
		switch {
		case errors.Is(err, ErrNotFound):
			// The engine has no workflow for the Job, so nothing else will delete it.
		case err != nil:
			failed.add("locate_workflow", fmt.Errorf("find the workflow of run %s: %w", job.RunID, err))
			continue
		case !callbacks.Read(workflow).Settled:
			continue
		}
		if err := deleteJob(ctx, c.sandbox, namespace, job.RunID); err != nil {
			failed.add("delete_job", fmt.Errorf("delete the Job of run %s: %w", job.RunID, err))
			continue
		}
		logger := logging.FromContext(ctx).WithName("gc")
		logger.Info("Deleted the Job of a finished run", string(telemetry.AttrSubjectID), job.RunID)
	}
}
