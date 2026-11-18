package runs

import (
	"testing"

	. "github.com/onsi/gomega"

	"altinn.studio/core-operator/internal/engine"
	"altinn.studio/core-operator/internal/sandbox"
)

func TestCollectorDeletesJobsOfFinishedOrUnknownRuns(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	ctx := t.Context()

	running := h.create(t, "assistant", "running")
	canceled := h.create(t, "other", "canceled")
	for _, run := range []*Run{running, canceled} {
		Expect(h.call(t, run.ID, StepAdmit).done()).To(BeTrue())
		Expect(h.call(t, run.ID, StepCreateJob).done()).To(BeTrue())
	}
	h.engine.Update(h.workflowID(t, canceled.ID), func(w *engine.Workflow) { w.OverallStatus = engine.StatusCanceled })

	// A Job whose run the engine forgot, for example after retention.
	unknown := RunID("assistant", "forgotten")
	h.sandbox.Add(sandbox.Job{RunID: unknown, Kind: testKind, Caller: "assistant", Namespace: testNamespace})

	h.collector.Collect(ctx)

	Expect(h.hasJob(running.ID)).To(BeTrue())
	Expect(h.hasJob(canceled.ID)).To(BeFalse())
	Expect(h.hasJob(unknown)).To(BeFalse())
}

func TestCollectorKeepsJobsWhenTheEngineDoesNotAnswer(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "key")
	Expect(h.call(t, run.ID, StepAdmit).done()).To(BeTrue())
	Expect(h.call(t, run.ID, StepCreateJob).done()).To(BeTrue())
	h.engine.Close()

	h.collector.Collect(t.Context())
	Expect(h.hasJob(run.ID)).To(BeTrue())
}

// If a kind leaves the catalog, the operator deletes the Job of its failed run while another kind still uses the
// namespace. The deadline and TTL of the Job are the safeguard for a namespace that no kind uses anymore.
func TestCollectorDeletesTheJobOfARunWhoseKindIsGone(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)

	run := h.create(t, "assistant", "key")
	Expect(h.call(t, run.ID, StepAdmit).done()).To(BeTrue())
	Expect(h.call(t, run.ID, StepCreateJob).done()).To(BeTrue())
	delete(h.cfg.Kinds, testKind)
	h.engine.Update(h.workflowID(t, run.ID), func(w *engine.Workflow) { w.OverallStatus = engine.StatusFailed })

	h.collector.Collect(t.Context())
	Expect(h.hasJob(run.ID)).To(BeFalse())
}
