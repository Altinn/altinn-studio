package runs

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"errors"
	"fmt"
	"time"

	"go.opentelemetry.io/otel/trace"

	"altinn.studio/core-operator/internal/callbacks"
	"altinn.studio/core-operator/internal/clock"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/logging"
	"altinn.studio/core-operator/internal/runner"
	"altinn.studio/core-operator/internal/sandbox"
	"altinn.studio/core-operator/internal/telemetry"
)

const (
	quotaRecheck   = 5 * time.Second
	podRecheck     = 2 * time.Second
	archiveRecheck = 2 * time.Second
	resultRecheck  = time.Second
	cleanupRecheck = 5 * time.Second
	// resultWait is the operator runner's long poll. It stays well inside run.await-result's execution time.
	resultWait = 20 * time.Second
)

var (
	errState   = errors.New("the step state is not valid")
	errNoPodIP = ends(ReasonInternal, "The step state has no pod IP.", nil)
	// errQueueTimeout fails run.admit on the engine's final check, so the run's status can say why it ended.
	errQueueTimeout = &callbacks.End{Reason: ReasonQueueTimeout, Expected: true,
		Detail: "The run waited in the queue longer than its kind allows."}
	// errArchiveTimeout fails run.await-archive on the engine's final check, as errQueueTimeout does run.admit.
	errArchiveTimeout = &callbacks.End{Reason: ReasonArchiveTimeout, Expected: true,
		Detail: "No archive arrived within the upload timeout of the kind."}
)

// ends fails the run instead of retrying the step. The run's status shows reason and detail, and the log err.
func ends(reason, detail string, err error) error {
	return &callbacks.End{Err: err, Reason: reason, Detail: detail}
}

// Steps are the callback handlers of the run workflow. Each step works out what it needs from the run id in the
// workflow context and the step state, and is safe to run again.
type Steps struct {
	clock   clock.Clock
	sandbox sandbox.Sandbox
	cfg     *config.Config
	queue   *Queue
	host    *runner.Client
}

func NewSteps(
	cfg *config.Config,
	queue *Queue,
	box sandbox.Sandbox,
	host *runner.Client,
	clk clock.Clock,
) *Steps {
	return &Steps{cfg: cfg, queue: queue, sandbox: box, host: host, clock: clk}
}

// Group is the handler group for runs.
func (s *Steps) Group() callbacks.Group {
	return callbacks.Group{
		StepAdmit:        s.admit,
		StepCreateJob:    s.createJob,
		StepAwaitPod:     s.awaitPod,
		StepAwaitArchive: s.awaitArchive,
		StepAwaitResult:  s.awaitResult,
		StepCleanup:      s.cleanup,
	}
}

type stepRun struct {
	state  *runState
	id     string
	caller string
}

// wait defers the step by delay, which the run's time scale shortens.
func (r *stepRun) wait(payload *callbacks.Payload, delay time.Duration, reason string) callbacks.Response {
	return callbacks.Wait(payload.State, scaled(delay, r.state.Spec.TimeScale), reason)
}

func (s *Steps) load(ctx context.Context, payload *callbacks.Payload) (*stepRun, error) {
	id := payload.Context.SubjectID
	if payload.Context.Domain != Domain || !ValidRunID(id) || payload.Context.Caller == "" {
		detail := fmt.Sprintf("The callback is not for a run: domain %q, subject %q.", payload.Context.Domain, id)
		return nil, ends(ReasonInternal, detail, nil)
	}
	state, err := parseState(payload.State)
	if err != nil {
		return nil, ends(ReasonInternal, "The step state is not valid.", err)
	}
	trace.SpanFromContext(ctx).SetAttributes(
		telemetry.AttrKind.String(state.Kind),
		telemetry.AttrCaller.String(payload.Context.Caller),
	)
	return &stepRun{id: id, caller: payload.Context.Caller, state: state}, nil
}

// admit lets the run through when it is among the oldest that fit under its kind's limits. A queued run defers, and
// fails the step on the engine's final check, once the kind's queue timeout has run out.
func (s *Steps) admit(ctx context.Context, payload *callbacks.Payload) (callbacks.Response, error) {
	run, err := s.load(ctx, payload)
	if err != nil {
		return callbacks.Response{}, err
	}
	// The limits are the kind's current ones, since they describe the sandbox as it is now.
	limits, ok := s.cfg.Kinds[run.state.Kind]
	if !ok {
		return callbacks.Response{}, ends(ReasonStartFailed, "The run's kind is not configured anymore.", nil)
	}
	jobs, err := s.sandbox.ActiveJobs(ctx, run.state.Spec.Namespace, run.state.Kind)
	if err != nil {
		return callbacks.Response{}, fmt.Errorf("list the active Jobs: %w", err)
	}
	// The engine sends the time it created the step, which stays the same across restarts. A missing one queues the
	// run as if it arrived now.
	ref := payload.ExecutionReferenceTime
	if ref.IsZero() {
		ref = s.clock.Now()
	}
	admission := s.queue.Admit(run.id, run.state.Kind, run.caller, ref, limits, jobs)
	if admission.Admitted {
		return callbacks.Done(payload.State), nil
	}
	if payload.IsFinalWaitCheck {
		// The engine would fail the step after this deferral. Failing it here gives an error that status reads know.
		s.queue.Forget(run.id)
		return callbacks.Response{}, errQueueTimeout
	}
	reason := fmt.Sprintf("The run is number %d in the queue for %s.", admission.Position, run.state.Kind)
	return run.wait(payload, AdmitRecheck, reason), nil
}

// createJob creates the run's Job from the kind's template. It defers while the sandbox quota for Jobs is full. The
// quota's KVM, CPU and memory limits apply to pods, not Jobs, so they do not stop a Job the queue should not have
// admitted; the run's reservation in the queue does, and the step renews it on every call.
func (s *Steps) createJob(ctx context.Context, payload *callbacks.Payload) (callbacks.Response, error) {
	run, err := s.load(ctx, payload)
	if err != nil {
		return callbacks.Response{}, err
	}
	s.queue.KeepAdmitted(run.id, run.state.Kind, run.caller)

	err = s.sandbox.CreateJob(ctx, jobOf(run))
	switch {
	case err == nil:
		return callbacks.Done(payload.State), nil
	case errors.Is(err, sandbox.ErrQuotaFull):
		return run.wait(payload, quotaRecheck, "The sandbox quota is full."), nil
	case errors.Is(err, sandbox.ErrNotAdmitted):
		// The policy compares the Job with the template it has cached, which lags a rollout of the template by a
		// moment. The step's retry strategy bounds how long a Job that never fits is tried.
		return callbacks.Response{}, fmt.Errorf("the sandbox refused the Job: %w", err)
	case errors.Is(err, sandbox.ErrRefused):
		return callbacks.Response{}, ends(ReasonStartFailed, "The sandbox refused the Job.", err)
	default:
		return callbacks.Response{}, fmt.Errorf("create Job: %w", err)
	}
}

// jobOf is the sandbox Job of a run, from the kind that the run keeps.
func jobOf(run *stepRun) sandbox.Job {
	return sandbox.Job{
		RunID:      run.id,
		Kind:       run.state.Kind,
		Caller:     run.caller,
		Namespace:  run.state.Spec.Namespace,
		Template:   run.state.Spec.PodTemplate,
		RunTimeout: run.state.Spec.RunTimeout,
	}
}

// awaitPod waits until the Job's pod is ready, and hands its IP to the next steps. For a kind that requires no
// archive, it then starts the command.
func (s *Steps) awaitPod(ctx context.Context, payload *callbacks.Payload) (callbacks.Response, error) {
	run, err := s.load(ctx, payload)
	if err != nil {
		return callbacks.Response{}, err
	}
	pod, err := s.sandbox.Pod(ctx, run.state.Spec.Namespace, run.id)
	if err != nil {
		return callbacks.Response{}, fmt.Errorf("read the pod: %w", err)
	}

	waiting := "Waiting for the operator runner to start."
	switch pod.Status {
	case sandbox.JobUnseen:
		// The sandbox has not seen the new Job yet. Until it does, the run holds its place through its reservation,
		// which a queue that restarted meanwhile does not know.
		s.queue.KeepAdmitted(run.id, run.state.Kind, run.caller)
		waiting = "Waiting for the Job to create its pod."
	case sandbox.JobFailed:
		return callbacks.Response{}, ends(ReasonStartFailed, "The Job failed: "+pod.Detail, nil)
	case sandbox.PodNone:
		waiting = "Waiting for the Job to create its pod."
	case sandbox.PodEnded:
		return callbacks.Response{}, ends(ReasonStartFailed, "The pod stopped before it was ready: "+pod.Detail, nil)
	case sandbox.PodReady:
		run.state.PodIP = pod.IP
		if !run.state.Spec.RequiresArchive {
			if err = s.startWithoutArchive(ctx, run); err != nil {
				return callbacks.Response{}, err
			}
		}
		state, err := run.state.encode()
		if err != nil {
			return callbacks.Response{}, err
		}
		return callbacks.Done(state), nil
	case sandbox.PodUnschedulable:
		waiting = "Waiting for a sandbox node."
	case sandbox.PodStarting:
	}
	if payload.IsFinalWaitCheck {
		// The engine would fail the step after this deferral, with a text of its own. Failing it here says what the pod
		// was waiting for.
		return callbacks.Response{}, ends(ReasonStartFailed, "The pod was not ready in time. "+waiting, nil)
	}
	return run.wait(payload, podRecheck, waiting), nil
}

// awaitArchive waits until the caller's archive has reached the operator runner, which then starts the command. The
// run's status reads awaiting-archive meanwhile, and the run API passes the caller's upload on to the operator runner.
// The operator runner is the only one that knows when the archive has arrived, so the step asks it.
func (s *Steps) awaitArchive(ctx context.Context, payload *callbacks.Payload) (callbacks.Response, error) {
	run, err := s.load(ctx, payload)
	if err != nil {
		return callbacks.Response{}, err
	}
	if run.state.PodIP == "" {
		return callbacks.Response{}, errNoPodIP
	}

	_, err = s.host.Status(ctx, run.state.PodIP, run.id, 0)
	switch {
	case err == nil:
		return callbacks.Done(payload.State), nil
	case errors.Is(err, runner.ErrNotClaimed):
		if payload.IsFinalWaitCheck {
			return callbacks.Response{}, errArchiveTimeout
		}
		return run.wait(payload, archiveRecheck, "Waiting for the caller to upload the archive."), nil
	default:
		return callbacks.Response{}, s.runnerError(ctx, run, ReasonStartFailed, err)
	}
}

// startWithoutArchive starts the command of a kind that requires no archive. The operator runner's protocol starts a run
// with an archive, so the operator sends an empty one. A start that comes again for the same run gets the same answer,
// so run.await-pod can repeat it.
func (s *Steps) startWithoutArchive(ctx context.Context, run *stepRun) error {
	archive, err := emptyArchive()
	if err != nil {
		return err
	}
	err = s.host.Start(
		ctx, run.state.PodIP, run.id, run.state.Spec.Command, bytes.NewReader(archive), int64(len(archive)),
	)
	if err != nil {
		return s.runnerError(ctx, run, ReasonStartFailed, err)
	}
	return nil
}

// emptyArchive is a gzip-compressed tar archive with no files.
func emptyArchive() ([]byte, error) {
	var buffer bytes.Buffer
	compressed := gzip.NewWriter(&buffer)
	if err := tar.NewWriter(compressed).Close(); err != nil {
		return nil, fmt.Errorf("write an empty archive: %w", err)
	}
	if err := compressed.Close(); err != nil {
		return nil, fmt.Errorf("write an empty archive: %w", err)
	}
	return buffer.Bytes(), nil
}

// awaitResult long-polls the operator runner until the command has finished, and keeps its outcome in the state. The
// status that it reads does not count as a fetch, so the operator runner keeps the result for the caller.
func (s *Steps) awaitResult(ctx context.Context, payload *callbacks.Payload) (callbacks.Response, error) {
	run, err := s.load(ctx, payload)
	if err != nil {
		return callbacks.Response{}, err
	}
	if run.state.PodIP == "" {
		return callbacks.Response{}, errNoPodIP
	}

	status, err := s.host.Status(ctx, run.state.PodIP, run.id, scaled(resultWait, run.state.Spec.TimeScale))
	if err != nil {
		return callbacks.Response{}, s.runnerError(ctx, run, ReasonRunFailed, err)
	}
	if status.Status == runner.StatusRunning {
		return run.wait(payload, resultRecheck, "The command is running."), nil
	}
	logging.FromContext(ctx).Info("Run finished", "outcome", status.Status, "exitCode", status.ExitCode,
		"timedOut", status.TimedOut)
	run.state.Outcome = status.Status
	run.state.Error = status.Error
	state, err := run.state.encode()
	if err != nil {
		return callbacks.Response{}, err
	}
	return callbacks.Done(state), nil
}

// runnerError decides whether a failed request to the operator runner can succeed later, and ends the run for reason
// if not. An operator runner that does not answer may be restarting its connection, unless its pod is gone.
func (s *Steps) runnerError(ctx context.Context, run *stepRun, reason string, err error) error {
	switch {
	case errors.Is(err, runner.ErrRejected), errors.Is(err, runner.ErrNotClaimed):
		return ends(reason, "The operator runner refused the request.", err)
	case errors.Is(err, runner.ErrUnreachable):
		if gone, podErr := s.podGone(ctx, run); podErr == nil && gone {
			return ends(reason, "The operator runner's pod is gone, and its result with it.", err)
		}
	}
	return fmt.Errorf("ask the operator runner: %w", err)
}

// podGone reports whether the run's pod has stopped or disappeared, so its operator runner can never answer.
func (s *Steps) podGone(ctx context.Context, run *stepRun) (bool, error) {
	gone, err := s.sandbox.PodGone(ctx, run.state.Spec.Namespace, run.id, run.state.PodIP)
	if err != nil {
		return false, fmt.Errorf("read the pod: %w", err)
	}
	return gone, nil
}

// cleanup deletes the Job once the caller can have the result no more. The operator runner of a completed run keeps the
// result until the caller has fetched it and a grace has passed, or until the result timeout, and then exits. The step
// waits for that, so the result lives as long as the Job does.
func (s *Steps) cleanup(ctx context.Context, payload *callbacks.Payload) (callbacks.Response, error) {
	run, err := s.load(ctx, payload)
	if err != nil {
		return callbacks.Response{}, err
	}
	if run.state.Outcome == runner.StatusCompleted && !payload.IsFinalWaitCheck {
		gone, err := s.podGone(ctx, run)
		if err != nil {
			return callbacks.Response{}, err
		}
		if !gone {
			return run.wait(payload, cleanupRecheck, "Waiting for the caller to fetch the result."), nil
		}
	}
	if deleteErr := s.sandbox.DeleteJob(ctx, run.state.Spec.Namespace, run.id); deleteErr != nil {
		return callbacks.Response{}, fmt.Errorf("delete the Job: %w", deleteErr)
	}
	s.queue.Forget(run.id)
	return callbacks.Done(payload.State), nil
}
