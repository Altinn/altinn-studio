package runs

import (
	"context"
	"errors"
	"time"

	"github.com/go-logr/logr"
	"go.opentelemetry.io/otel/codes"
	semconv "go.opentelemetry.io/otel/semconv/v1.43.0"

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
// configured kinds.
func (c *Collector) Collect(ctx context.Context) {
	ctx, span := telemetry.Tracer().Start(ctx, "gc.collect")
	defer span.End()
	logger := logging.FromContext(ctx).WithName("gc")
	for _, namespace := range c.cfg.KindNamespaces() {
		if failed := c.collectJobs(ctx, logger, namespace); failed != "" {
			span.SetStatus(codes.Error, failed+" failed")
			span.SetAttributes(semconv.ErrorTypeKey.String(failed))
		}
	}
}

// collectJobs returns the step that failed, or "" when none did.
func (c *Collector) collectJobs(ctx context.Context, logger logr.Logger, namespace string) (failed string) {
	jobs, err := c.sandbox.Jobs(ctx, namespace)
	if err != nil {
		logger.Error(err, "List run Jobs failed", "namespace", namespace)
		return "list_jobs"
	}
	for _, job := range jobs {
		workflow, err := locate(ctx, c.engine, job.Caller, job.RunID)
		switch {
		case errors.Is(err, ErrNotFound):
			// The engine has no workflow for the Job, so nothing else will delete it.
		case err != nil:
			logger.Info("Could not find the workflow of a run Job", "runId", job.RunID, "error", err.Error())
			continue
		case !callbacks.Read(workflow).Settled:
			continue
		}
		if err := deleteJob(ctx, c.sandbox, namespace, job.RunID); err != nil {
			logger.Error(err, "Delete run Job failed", "runId", job.RunID)
			failed = "delete_job"
			continue
		}
		logger.Info("Deleted the Job of a finished run", "runId", job.RunID)
	}
	return failed
}
