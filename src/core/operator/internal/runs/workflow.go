package runs

import (
	"encoding/json"
	"fmt"
	"maps"
	"time"

	"altinn.studio/core-operator/internal/callbacks"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/engine"
)

const (
	// runResultSlack is how long await-result may wait beyond the kind's run timeout: the operator runner's own timeout
	// stops the command, and then it still has to return the result.
	runResultSlack = 2 * time.Minute
	// cleanupSlack is how long run.cleanup may wait beyond the time that the operator runner keeps the result, for the
	// operator runner to exit and the operator to see it.
	cleanupSlack = time.Minute
	// retryMaxDuration bounds a run of consecutive errors in one step, such as an unreachable operator runner. It outlasts
	// a restart of the operator or the engine, and maxDuration counts it up to nine times for a run.
	retryMaxDuration = 2 * time.Minute
	// retryMaxDelay caps the engine's backoff between retries of a step, which is also how long the engine may take
	// to call again after the operator was down.
	retryMaxDelay = 30 * time.Second
)

// KindSpec is what a run uses of its kind. A run keeps it from its create to its end, so a change to the catalog
// applies to new runs, and the Job's deadline fits the budgets of the run's workflow.
type KindSpec struct {
	// Namespace holds the PodTemplate and the run's Job.
	Namespace   string `json:"namespace"`
	PodTemplate string `json:"podTemplate"`
	Command     string `json:"command"`
	// RequiresArchive is whether the run waits for the caller's archive. When false, run.await-pod starts the command.
	RequiresArchive bool          `json:"requiresArchive"`
	QueueTimeout    time.Duration `json:"queueTimeout"`
	RunTimeout      time.Duration `json:"runTimeout"`
}

func specOf(kind config.Kind) KindSpec {
	return KindSpec{
		Namespace:       kind.Namespace,
		PodTemplate:     kind.PodTemplate,
		Command:         kind.Command,
		RequiresArchive: kind.RequiresArchive,
		QueueTimeout:    kind.QueueTimeout,
		RunTimeout:      kind.RunTimeout,
	}
}

// runState is the state that the steps hand on. The engine keeps it with each step, so a step that runs again after a
// restart has what the earlier steps learned, and the operator keeps nothing of a run itself.
//
// The workflow starts with the run's kind and its spec. Each step passes them on and adds what it learned.
type runState struct {
	Kind string `json:"kind"`
	// PodIP is the address of the run's operator runner, from run.await-pod on.
	PodIP string `json:"podIP,omitempty"`
	// Outcome and Error are the operator runner's status and error of the ended run, from run.await-result on.
	Outcome string   `json:"outcome,omitempty"`
	Error   string   `json:"error,omitempty"`
	Spec    KindSpec `json:"spec"`
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

// stepDefinition is a step of the run workflow with its engine clocks.
type stepDefinition struct {
	key              string
	maxExecutionTime time.Duration
	// waitBudget is the step's total time in deferrals. Zero means the step does not wait.
	waitBudget time.Duration
}

// runSteps lists the steps of a run of the kind. A kind that requires no archive has no run.await-archive:
// run.await-pod starts its command once the pod is ready.
func runSteps(spec KindSpec) []stepDefinition {
	steps := []stepDefinition{
		{key: StepAdmit, maxExecutionTime: 10 * time.Second, waitBudget: spec.QueueTimeout},
		{key: StepCreateJob, maxExecutionTime: 30 * time.Second, waitBudget: 5 * time.Minute},
		{key: StepAwaitPod, maxExecutionTime: 10 * time.Second, waitBudget: config.PodBudget},
	}
	if spec.RequiresArchive {
		steps = append(steps,
			stepDefinition{key: StepAwaitArchive, maxExecutionTime: 10 * time.Second, waitBudget: config.UploadTimeout})
	}
	return append(
		steps,
		stepDefinition{
			key:              StepAwaitResult,
			maxExecutionTime: 40 * time.Second,
			waitBudget:       spec.RunTimeout + runResultSlack,
		},
		stepDefinition{
			key:              StepCleanup,
			maxExecutionTime: 30 * time.Second,
			waitBudget:       config.ResultTimeout + config.ResultGrace + cleanupSlack,
		},
	)
}

// maxDuration bounds the time from the create of a run until its status is final, which it is once run.await-result
// has the outcome or a step has failed, so run.cleanup does not count. A step may retry errors for retryMaxDuration
// before it first defers, and again from its last deferral, which may come just before its wait budget runs out. The
// last retry may start retryMaxDelay and engineLatency after that, and take the step's execution time.
func maxDuration(spec KindSpec) time.Duration {
	var total time.Duration
	for _, step := range runSteps(spec) {
		retries := retryMaxDuration + retryMaxDelay + engineLatency + step.maxExecutionTime
		total += retries
		if step.waitBudget > 0 {
			total += step.waitBudget + retries
		}
		if step.key == StepAwaitResult {
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

// BuildEnqueueRequest builds the workflow of a run. Everything but the context is part of the engine's idempotency hash,
// so two creates with the same key, kind and labels build the same request.
func BuildEnqueueRequest(run newRun) (engine.EnqueueRequest, error) {
	workflowContext, err := json.Marshal(callbacks.Context{Domain: Domain, Caller: run.Caller, SubjectID: run.ID})
	if err != nil {
		return engine.EnqueueRequest{}, fmt.Errorf("encode workflow context: %w", err)
	}
	initial, err := (&runState{Kind: run.Kind, Spec: run.Spec}).encode()
	if err != nil {
		return engine.EnqueueRequest{}, err
	}

	retry := &engine.RetryStrategy{
		BackoffType:  engine.BackoffExponential,
		BaseInterval: engine.Duration(time.Second),
		MaxDelay:     engine.DurationOf(retryMaxDelay),
		MaxDuration:  engine.DurationOf(retryMaxDuration),
	}

	definitions := runSteps(run.Spec)
	steps := make([]engine.StepRequest, 0, len(definitions))
	for _, definition := range definitions {
		encoded, err := json.Marshal(callbacks.CommandData{CommandKey: definition.key})
		if err != nil {
			return engine.EnqueueRequest{}, fmt.Errorf("encode command data: %w", err)
		}
		command := engine.CommandDefinition{
			Type:             callbacks.CommandType,
			MaxExecutionTime: engine.DurationOf(definition.maxExecutionTime),
			Data:             encoded,
		}
		if definition.waitBudget > 0 {
			command.WaitBudget = engine.DurationOf(definition.waitBudget)
		}
		steps = append(steps, engine.StepRequest{OperationID: definition.key, Command: command, RetryStrategy: retry})
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
	return engine.EnqueueRequest{
		Labels:    labels,
		Context:   workflowContext,
		Workflows: []engine.WorkflowRequest{{OperationID: "run", State: initial, Steps: steps}},
	}, nil
}
