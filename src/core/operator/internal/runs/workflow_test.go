package runs

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	. "github.com/onsi/gomega"

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

// The key of a create names the run before it, so a create after a run ends makes a new run.
func TestCreateKeyDependsOnTheKindTheLabelsAndTheRunBefore(t *testing.T) {
	RegisterTestingT(t)

	key := createKey(testKind, testLabels("app"), "")
	Expect(createKey(testKind, testLabels("app"), "")).To(Equal(key))
	Expect(createKey("other-kind", testLabels("app"), "")).NotTo(Equal(key))
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

// The engine calls the operator for each step in the order of the run. The run's status reads what each step means.
func TestARunHasItsStepsInOrder(t *testing.T) {
	RegisterTestingT(t)

	keys := []string{StepAdmit, StepCreateJob, StepAwaitPod, StepAwaitArchive, StepAwaitResult, StepCleanup}
	steps := runSteps(specOf(testConfig().Kinds[testKind], 0))
	Expect(steps).To(HaveLen(len(keys)))
	for i, step := range steps {
		Expect(step.Key).To(Equal(keys[i]))
		Expect(stepMeanings).To(HaveKey(step.Key), "a run's status reads what the step means")
	}
}

// A longer queue timeout increases the maximum duration of a run by the same time.
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
