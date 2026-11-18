package runs

import (
	"encoding/json"
	"fmt"
	"maps"
	"slices"
	"time"

	"altinn.studio/core-operator/internal/callbacks"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/engine"
	"altinn.studio/core-operator/internal/runner"
)

const (
	// runResultSlack is how long run.await-result can wait after the run timeout, for the operator runner to return the
	// result.
	runResultSlack = 2 * time.Minute
	// cleanupSlack is how long run.cleanup can wait after the time that the operator runner keeps the result, for the
	// operator runner to exit and the operator to see it.
	cleanupSlack = time.Minute
	// retryMaxDuration limits a series of consecutive errors in one step, for example an unreachable operator runner.
	// It is longer than a restart of the operator or the engine. maxDuration counts it up to nine times for a run.
	retryMaxDuration = 2 * time.Minute
	// retryMaxDelay limits the engine's backoff between retries of a step. It is also how long the engine can take to
	// call again after the operator was down.
	retryMaxDelay = 30 * time.Second
)

// KindSpec is the part of its kind that a run uses. A run keeps it from its create to its end. So a change to the
// catalog applies only to new runs, and the Job's deadline fits the budgets of the run's workflow.
type KindSpec struct {
	// Namespace holds the PodTemplate and the run's Job.
	Namespace   string `json:"namespace"`
	PodTemplate string `json:"podTemplate"`
	Command     string `json:"command"`
	// RequiresArchive is whether the run waits for the caller's archive. When false, run.await-pod starts the command.
	RequiresArchive bool          `json:"requiresArchive"`
	QueueTimeout    time.Duration `json:"queueTimeout"`
	RunTimeout      time.Duration `json:"runTimeout"`
	// TimeScale is the operator's timeScale at the create, which shortens the run's other waits and budgets.
	TimeScale float64 `json:"timeScale,omitempty"`
}

func specOf(kind config.Kind, timeScale float64) KindSpec {
	return KindSpec{
		Namespace:       kind.Namespace,
		PodTemplate:     kind.PodTemplate,
		Command:         kind.Command,
		RequiresArchive: kind.RequiresArchive,
		QueueTimeout:    kind.QueueTimeout,
		RunTimeout:      kind.RunTimeout,
		TimeScale:       timeScale,
	}
}

// scaled shortens d by a time scale, which only the integration test sets. Zero does not change d.
func scaled(d time.Duration, timeScale float64) time.Duration {
	if timeScale == 0 {
		return d
	}
	return time.Duration(float64(d) * timeScale)
}

// runState is the state that each step gives to the next step. The engine keeps it with each step, so a step that runs
// again after a restart has what the earlier steps learned. The workflow starts with the kind and its spec, and each
// step adds what it learned.
type runState struct {
	Kind string `json:"kind"`
	// PodIP is the address of the run's operator runner. UploadBy is the time when run.await-archive stops its wait for
	// the caller's archive. run.await-pod sets both.
	PodIP    string     `json:"podIP,omitempty"`
	UploadBy *time.Time `json:"uploadBy,omitempty"`
	// StartedAt is when the command started. The step that started the command sets it. Outcome and Error are the
	// status and error of the ended run from the operator runner. FinishedAt is when run.await-result received them.
	StartedAt  *time.Time `json:"startedAt,omitempty"`
	Outcome    string     `json:"outcome,omitempty"`
	Error      string     `json:"error,omitempty"`
	FinishedAt *time.Time `json:"finishedAt,omitempty"`
	Spec       KindSpec   `json:"spec"`
}

// pod is where the run's operator runner listens.
func (s *runState) pod(runID string) runner.Pod {
	return runner.Pod{Namespace: s.Spec.Namespace, RunID: runID, IP: s.PodIP}
}

func (s *runState) encode() (*string, error) {
	data, err := json.Marshal(s)
	if err != nil {
		return nil, fmt.Errorf("encode step state: %w", err)
	}
	text := string(data)
	return &text, nil
}

func parseState(text *string) (*runState, error) {
	if text == nil || *text == "" {
		return nil, fmt.Errorf("%w: the state is empty", errState)
	}
	var state runState
	if err := json.Unmarshal([]byte(*text), &state); err != nil {
		return nil, fmt.Errorf("%w: %w", errState, err)
	}
	if state.Kind == "" || state.Spec.Namespace == "" {
		return nil, fmt.Errorf("%w: the state has no kind", errState)
	}
	return &state, nil
}

// runSteps lists the steps of a run of the kind. The time scale shortens the budgets that the kind does not set.
func runSteps(spec KindSpec) []callbacks.Step {
	scale := func(d time.Duration) time.Duration { return scaled(d, spec.TimeScale) }
	steps := []callbacks.Step{
		{Key: StepAdmit, MaxExecutionTime: 10 * time.Second, WaitBudget: spec.QueueTimeout},
		{Key: StepCreateJob, MaxExecutionTime: 30 * time.Second, WaitBudget: scale(5 * time.Minute)},
		{Key: StepAwaitPod, MaxExecutionTime: 10 * time.Second, WaitBudget: scale(config.PodBudget)},
		{Key: StepAwaitArchive, MaxExecutionTime: 10 * time.Second, WaitBudget: scale(config.UploadTimeout)},
		{Key: StepAwaitResult, MaxExecutionTime: 40 * time.Second, WaitBudget: spec.RunTimeout + scale(runResultSlack)},
		{
			Key:              StepCleanup,
			MaxExecutionTime: 30 * time.Second,
			WaitBudget:       scale(config.ResultTimeout + config.ResultGrace + cleanupSlack),
		},
	}
	if !spec.RequiresArchive {
		steps = slices.DeleteFunc(steps, func(step callbacks.Step) bool { return step.Key == StepAwaitArchive })
	}
	return steps
}

// stepMeanings tell what each step means for its run. status is the run's status while the step is the current step of
// the workflow. reason is why the run failed if the engine itself failed the step.
var stepMeanings = map[string]struct {
	status Status
	reason string
}{
	StepAdmit:        {StatusQueued, ReasonStartFailed},
	StepCreateJob:    {StatusStarting, ReasonStartFailed},
	StepAwaitPod:     {StatusStarting, ReasonStartFailed},
	StepAwaitArchive: {StatusAwaitingArchive, ReasonStartFailed},
	StepAwaitResult:  {StatusRunning, ReasonRunFailed},
	StepCleanup:      {StatusRunning, ReasonInternal},
}

// maxDuration is the maximum time from the create of a run until its status is final. The status is final when
// run.await-result has the outcome or a step failed, so run.cleanup does not count. A step can retry errors for
// retryMaxDuration before it first defers. It can do this again from its last deferral, which can come just before its
// wait budget runs out. The last retry can start retryMaxDelay and engineLatency after that, and use the execution time
// of the step.
func maxDuration(spec KindSpec) time.Duration {
	var total time.Duration
	for _, step := range runSteps(spec) {
		retries := scaled(retryMaxDuration+retryMaxDelay+engineLatency, spec.TimeScale) + step.MaxExecutionTime
		total += retries
		if step.WaitBudget > 0 {
			total += step.WaitBudget + retries
		}
		if step.Key == StepAwaitResult {
			break
		}
	}
	return total
}

// newRun is what a create stores in the engine.
type newRun struct {
	ID     string
	Caller string
	Kind   string
	Labels map[string]string
	Spec   KindSpec
}

// BuildEnqueueRequest builds the workflow of a run, which is the same for two creates with the same key, kind and
// labels.
func BuildEnqueueRequest(run newRun) (engine.EnqueueRequest, error) {
	initial, err := (&runState{Kind: run.Kind, Spec: run.Spec}).encode()
	if err != nil {
		return engine.EnqueueRequest{}, err
	}
	labels := maps.Clone(run.Labels)
	if labels == nil {
		labels = map[string]string{}
	}
	maps.Copy(labels, map[string]string{
		workflowLabelRunID:  run.ID,
		workflowLabelKind:   run.Kind,
		workflowLabelCaller: run.Caller,
	})
	workflow := callbacks.Workflow{
		Labels:  labels,
		State:   initial,
		Context: callbacks.Context{Domain: Domain, Caller: run.Caller, SubjectID: run.ID},
		Name:    "run",
		Steps:   runSteps(run.Spec),
		Retry: callbacks.Retry{
			BaseInterval: scaled(time.Second, run.Spec.TimeScale),
			MaxDelay:     scaled(retryMaxDelay, run.Spec.TimeScale),
			MaxDuration:  scaled(retryMaxDuration, run.Spec.TimeScale),
		},
	}
	request, err := workflow.Request()
	if err != nil {
		return engine.EnqueueRequest{}, fmt.Errorf("build the run workflow: %w", err)
	}
	return request, nil
}
