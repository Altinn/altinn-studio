package runs

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	. "github.com/onsi/gomega"

	"altinn.studio/core-operator/internal/callbacks"
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
func TestCreateKeyDependsOnTheKindTheSourceAndTheRunBefore(t *testing.T) {
	RegisterTestingT(t)

	key := createKey(testKind, testSource("app"), "")
	Expect(createKey(testKind, testSource("app"), "")).To(Equal(key))
	Expect(createKey(argsKind, testSource("app"), "")).NotTo(Equal(key))
	Expect(createKey(testKind, testSource("other"), "")).NotTo(Equal(key))
	Expect(createKey(testKind, testSource("app"), RunID("assistant", key))).NotTo(Equal(key))
	moved := testSource("app")
	moved.RepoOwner = "user"
	Expect(createKey(testKind, moved, "")).NotTo(Equal(key))
}

// enqueueRequest builds the request of the assistant's run of the app ttd/app.
func enqueueRequest(t *testing.T, args map[string]string) engine.EnqueueRequest {
	t.Helper()
	request, err := BuildEnqueueRequest(newRun{
		ID:     RunID("assistant", "key"),
		Caller: "assistant",
		Kind:   testKind,
		Source: testSource("app"),
		Spec:   specOf(testConfig().Kinds[testKind]),
		Args:   args,
	})
	if err != nil {
		t.Fatal(err)
	}
	return request
}

// The engine hashes the request without its context to detect a reused key. Two creates with the same key and
// arguments must give the same request, and other arguments another one.
func TestEnqueueRequestIsTheSameForTheSameRun(t *testing.T) {
	RegisterTestingT(t)
	id := RunID("assistant", "key")

	first := enqueueRequest(t, map[string]string{"target": "v9"})
	again := enqueueRequest(t, map[string]string{"target": "v9"})
	otherArgs := enqueueRequest(t, map[string]string{"target": "v10"})

	Expect(json.Marshal(first)).To(Equal(must(json.Marshal(again))))
	Expect(json.Marshal(first)).NotTo(Equal(must(json.Marshal(otherArgs))))

	Expect(first.Labels).To(Equal(map[string]string{
		"runId": id, "kind": testKind, "caller": "assistant",
		"org": "ttd", "app": "app", "repoOwner": "ttd", "repo": "app", "commit": testCommit,
	}))
	Expect(string(first.Context)).To(MatchJSON(`{"domain":"runs","caller":"assistant","subjectId":"` + id + `"}`))
}

// The engine hashes the initial state as text, so the same arguments must give the same text, however a caller
// ordered them, and no arguments the same as an empty object.
func TestInitialStateSortsTheArguments(t *testing.T) {
	RegisterTestingT(t)

	states := make([]string, 0, 2)
	for _, body := range []string{
		`{"target":"v9","mode":"dry-run","branch":"main"}`,
		`{"branch":"main","mode":"dry-run","target":"v9"}`,
	} {
		var args map[string]string
		Expect(json.Unmarshal([]byte(body), &args)).To(Succeed())
		states = append(states, *enqueueRequest(t, args).Workflows[0].State)
	}
	Expect(states[1]).To(Equal(states[0]))
	Expect(states[0]).To(ContainSubstring(`"args":{"branch":"main","mode":"dry-run","target":"v9"}`))

	absent := enqueueRequest(t, nil)
	empty := enqueueRequest(t, map[string]string{})
	Expect(*absent.Workflows[0].State).NotTo(ContainSubstring(`"args"`))
	Expect(json.Marshal(empty)).To(Equal(must(json.Marshal(absent))))
}

func TestInitialStateHasTheRunsKind(t *testing.T) {
	RegisterTestingT(t)

	state, err := parseState(enqueueRequest(t, nil).Workflows[0].State)
	Expect(err).NotTo(HaveOccurred())
	Expect(state.Kind).To(Equal(testKind))
	Expect(state.Spec).To(Equal(specOf(testConfig().Kinds[testKind])))
	Expect(state.PodIP).To(BeEmpty())
}

func TestEnqueueRequestHasTheRunSteps(t *testing.T) {
	RegisterTestingT(t)

	request := enqueueRequest(t, nil)
	Expect(request.Workflows).To(HaveLen(1))

	type budget struct {
		maxExecution time.Duration
		wait         time.Duration
	}
	expected := map[string]budget{
		StepAdmit:        {10 * time.Second, 15 * time.Minute},
		StepCreateJob:    {30 * time.Second, 5 * time.Minute},
		StepAwaitPod:     {10 * time.Second, 5 * time.Minute},
		StepAwaitArchive: {10 * time.Second, 5 * time.Minute},
		StepAwaitResult:  {40 * time.Second, 13 * time.Minute},
		StepCleanup:      {30 * time.Second, 6*time.Minute + 30*time.Second},
	}
	keys := make([]string, 0, len(request.Workflows[0].Steps))
	for _, step := range request.Workflows[0].Steps {
		keys = append(keys, step.OperationID)
		Expect(step.Command.Type).To(Equal(callbacks.CommandType))
		Expect(time.Duration(*step.Command.MaxExecutionTime)).To(Equal(expected[step.OperationID].maxExecution))
		if wait := expected[step.OperationID].wait; wait > 0 {
			Expect(time.Duration(*step.Command.WaitBudget)).To(Equal(wait), step.OperationID)
		} else {
			Expect(step.Command.WaitBudget).To(BeNil(), step.OperationID)
		}
		Expect(step.RetryStrategy.BackoffType).To(Equal(engine.BackoffExponential))
		Expect(time.Duration(step.RetryStrategy.BaseInterval)).To(Equal(time.Second))
		Expect(time.Duration(*step.RetryStrategy.MaxDelay)).To(Equal(30 * time.Second))
		Expect(step.RetryStrategy.MaxDuration).NotTo(BeNil())

		var data callbacks.CommandData
		Expect(json.Unmarshal(step.Command.Data, &data)).To(Succeed())
		Expect(data.CommandKey).To(Equal(step.OperationID))
		Expect(data.Payload).To(BeNil())
	}
	Expect(keys).To(Equal([]string{
		StepAdmit, StepCreateJob, StepAwaitPod, StepAwaitArchive, StepAwaitResult, StepCleanup,
	}))

	encoded, err := json.Marshal(request.Workflows[0].Steps[0].Command)
	Expect(err).NotTo(HaveOccurred())
	Expect(string(encoded)).To(ContainSubstring(`"maxExecutionTime":"00:00:10"`))
	Expect(string(encoded)).To(ContainSubstring(`"waitBudget":"00:15:00"`))
}

// The bound has the queue timeout, the wait budgets and the execution times of the steps up to run.await-result, and
// the engine's retries of each: before a step first defers, and after its wait budget has run out.
func TestMaxDurationBoundsTheRunUntilItsStatusIsFinal(t *testing.T) {
	RegisterTestingT(t)

	spec := specOf(testConfig().Kinds[testKind])
	retries := func(execution time.Duration) time.Duration {
		return retryMaxDuration + retryMaxDelay + engineLatency + execution
	}
	expected := 2*retries(10*time.Second) + spec.QueueTimeout + // run.admit
		2*retries(30*time.Second) + 5*time.Minute + // run.create-job
		2*retries(10*time.Second) + config.PodBudget + // run.await-pod
		2*retries(10*time.Second) + config.UploadTimeout + // run.await-archive
		2*retries(40*time.Second) + spec.RunTimeout + runResultSlack // run.await-result
	Expect(maxDuration(spec)).To(Equal(expected))
	Expect(maxDuration(spec)).To(Equal(4380 * time.Second))

	// A longer queue timeout makes the bound as much longer.
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
