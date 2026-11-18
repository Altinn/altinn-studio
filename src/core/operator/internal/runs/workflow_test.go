package runs

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	. "github.com/onsi/gomega"

	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/engine"
)

func TestRunIDIsStablePerCallerAndKey(t *testing.T) {
	RegisterTestingT(t)

	id := RunID("assistant", "key")
	Expect(RunID("assistant", "key")).To(Equal(id))
	Expect(RunID("designer", "key")).NotTo(Equal(id))
	Expect(RunID("assistant", "other")).NotTo(Equal(id))

	parsed, err := uuid.Parse(id)
	Expect(err).NotTo(HaveOccurred())
	Expect(parsed.Version()).To(Equal(uuid.Version(5)))
	Expect(ValidRunID(id)).To(BeTrue())
	Expect(ValidRunID("../" + id)).To(BeFalse())
	Expect(ValidRunID("{" + id + "}")).To(BeFalse())
	Expect(EngineNamespace("assistant")).To(Equal("runs-assistant"))
}

// The key of a create names the run before it, so a create after a run has ended makes a new run.
func TestCreateKeyDependsOnTheKindTheLabelsAndTheRunBefore(t *testing.T) {
	RegisterTestingT(t)

	key := createKey(testKind, testLabels("app"), "")
	Expect(createKey(testKind, testLabels("app"), "")).To(Equal(key))
	Expect(createKey(noArchiveKind, testLabels("app"), "")).NotTo(Equal(key))
	Expect(createKey(testKind, testLabels("other"), "")).NotTo(Equal(key))
	Expect(createKey(testKind, testLabels("app"), RunID("assistant", key))).NotTo(Equal(key))
	moved := testLabels("app")
	moved["repoOwner"] = "user"
	Expect(createKey(testKind, moved, "")).NotTo(Equal(key))
	// A label moved to another key is another run, and the order of the labels makes no difference.
	Expect(
		createKey(testKind, map[string]string{"a": "b=c"}, ""),
	).NotTo(Equal(createKey(testKind, map[string]string{"a=b": "c"}, "")))
}

// enqueueRequest builds the request of the assistant's run of the app ttd/app.
func enqueueRequest(t *testing.T) engine.EnqueueRequest {
	t.Helper()
	request, err := BuildEnqueueRequest(newRun{
		ID:     RunID("assistant", "key"),
		Caller: "assistant",
		Kind:   testKind,
		Labels: testLabels("app"),
		Spec:   specOf(testConfig().Kinds[testKind], 0),
	})
	if err != nil {
		t.Fatal(err)
	}
	return request
}

// The engine hashes the request without its context to detect a reused key, so two creates of the same run must give
// the same request.
func TestEnqueueRequestIsTheSameForTheSameRun(t *testing.T) {
	RegisterTestingT(t)
	id := RunID("assistant", "key")

	first := enqueueRequest(t)
	Expect(json.Marshal(first)).To(Equal(must(json.Marshal(enqueueRequest(t)))))
	Expect(string(first.Context)).To(MatchJSON(`{"domain":"runs","caller":"assistant","subjectId":"` + id + `"}`))
}

// The engine calls the operator back for each step in the order of the run, and the run's status reads what each step
// means. A kind without an archive has no step that waits for one.
func TestARunHasItsStepsInOrder(t *testing.T) {
	RegisterTestingT(t)

	for kind, keys := range map[string][]string{
		testKind:      {StepAdmit, StepCreateJob, StepAwaitPod, StepAwaitArchive, StepAwaitResult, StepCleanup},
		noArchiveKind: {StepAdmit, StepCreateJob, StepAwaitPod, StepAwaitResult, StepCleanup},
	} {
		steps := runSteps(specOf(testConfig().Kinds[kind], 0))
		Expect(steps).To(HaveLen(len(keys)), kind)
		for i, step := range steps {
			Expect(step.Key).To(Equal(keys[i]), kind)
			Expect(stepMeanings).To(HaveKey(step.Key), "a run's status reads what the step means")
		}
	}
}

// A longer queue timeout makes the bound on a run's duration as much longer.
func TestMaxDurationGrowsWithTheQueueTimeout(t *testing.T) {
	RegisterTestingT(t)

	spec := specOf(testConfig().Kinds[testKind], 0)
	longer := spec
	longer.QueueTimeout += time.Hour
	Expect(maxDuration(longer) - maxDuration(spec)).To(Equal(time.Hour))
}

func must(data []byte, err error) []byte {
	if err != nil {
		panic(err)
	}
	return data
}

// The bound on a run's duration counts the archive step only for a kind that waits for an archive.
func TestMaxDurationCountsTheArchiveStep(t *testing.T) {
	RegisterTestingT(t)

	spec := specOf(testConfig().Kinds[noArchiveKind], 0)
	withArchive := specOf(testConfig().Kinds[testKind], 0)
	archiveStep := 2*(retryMaxDuration+retryMaxDelay+engineLatency+10*time.Second) + config.UploadTimeout
	Expect(maxDuration(withArchive) - maxDuration(spec)).To(Equal(archiveStep))
}
