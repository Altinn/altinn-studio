package runs

import (
	"testing"

	. "github.com/onsi/gomega"
	apierrors "k8s.io/apimachinery/pkg/api/errors"

	"altinn.studio/core-operator/internal/engine"
)

func TestCollectorDeletesJobsOfFinishedOrUnknownRuns(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	ctx := t.Context()

	running := h.create(t, "assistant", "running")
	canceled := h.create(t, "other", "canceled")
	for _, run := range []*Run{running, canceled} {
		Expect(h.step(t, run.ID, StepAdmit).done()).To(BeTrue())
		Expect(h.step(t, run.ID, StepCreateJob).done()).To(BeTrue())
	}
	h.engine.Update(h.workflowID(t, canceled.ID), func(w *engine.Workflow) { w.OverallStatus = engine.StatusCanceled })

	// A Job whose run the engine has forgotten, such as after retention.
	unknown := RunJob{RunID: RunID("assistant", "forgotten"), Kind: testKind, Caller: "assistant"}
	Expect(h.client.Create(ctx, BuildJob(testPodTemplate(), unknown, specOf(h.cfg.Kinds[testKind])))).To(Succeed())

	h.collector.Collect(ctx)

	_, err := h.kube.Job(ctx, testNamespace, running.ID)
	Expect(err).NotTo(HaveOccurred())
	_, err = h.kube.Job(ctx, testNamespace, canceled.ID)
	Expect(apierrors.IsNotFound(err)).To(BeTrue())
	_, err = h.kube.Job(ctx, testNamespace, unknown.RunID)
	Expect(apierrors.IsNotFound(err)).To(BeTrue())
}

func TestCollectorKeepsJobsWhenTheEngineDoesNotAnswer(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	ctx := t.Context()

	run := h.create(t, "assistant", "key")
	Expect(h.step(t, run.ID, StepAdmit).done()).To(BeTrue())
	Expect(h.step(t, run.ID, StepCreateJob).done()).To(BeTrue())
	h.engine.Close()

	h.collector.Collect(ctx)
	_, err := h.kube.Job(ctx, testNamespace, run.ID)
	Expect(err).NotTo(HaveOccurred())
}

// A run of a kind that has left the catalog has its Job deleted when it fails, while another kind still uses the
// namespace. The Job's deadline and TTL are the backstop for a namespace that no kind uses anymore.
func TestCollectorDeletesTheJobOfARunWhoseKindIsGone(t *testing.T) {
	RegisterTestingT(t)
	h := newHarness(t)
	ctx := t.Context()

	run := h.create(t, "assistant", "key")
	Expect(h.step(t, run.ID, StepAdmit).done()).To(BeTrue())
	Expect(h.step(t, run.ID, StepCreateJob).done()).To(BeTrue())
	delete(h.cfg.Kinds, testKind)
	h.failStep(t, run.ID, StepAwaitPod, "the pod stopped before it was ready")

	h.collector.Collect(ctx)
	_, err := h.kube.Job(ctx, testNamespace, run.ID)
	Expect(apierrors.IsNotFound(err)).To(BeTrue())
}
