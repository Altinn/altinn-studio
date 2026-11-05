package runs

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.opentelemetry.io/otel/trace"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"altinn.studio/core-operator/internal/callbacks"
	"altinn.studio/core-operator/internal/clock"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/jobhost"
	"altinn.studio/core-operator/internal/telemetry"
)

const (
	quotaRecheck   = 5 * time.Second
	podRecheck     = 2 * time.Second
	archiveRecheck = 2 * time.Second
	resultRecheck  = time.Second
	cleanupRecheck = 5 * time.Second
	// resultWait is the job host's long poll. It stays well inside run.await-result's execution time.
	resultWait = 20 * time.Second
)

var (
	errContext = errors.New("the callback is not for a run")
	errNoKind  = errors.New("the run's kind is not configured anymore")
	// errQueueTimeout fails run.admit on the engine's final check. The engine passes the error on in the step's error
	// history, where status reads recognize it.
	errQueueTimeout = errors.New("the run waited in the queue longer than its kind allows")
	// errArchiveTimeout fails run.await-archive on the engine's final check, as errQueueTimeout does run.admit.
	errArchiveTimeout = errors.New("no archive arrived within the upload timeout")
	errState          = errors.New("the step state is not valid")
	errNoPodIP        = errors.New("the step state has no pod IP")
	errPodEnded       = errors.New("the pod stopped before it was ready")
	errJobFailed      = errors.New("the Job failed")
	errPodGone        = errors.New("the job host's pod is gone, and its result with it")
	errJobRefused     = errors.New("the API server refused the Job")
	errArgs           = errors.New("the job host cannot receive arguments yet")
)

// permanent marks err so that the engine fails the run instead of retrying the step.
func permanent(err error) error {
	return fmt.Errorf("%w: %w", callbacks.ErrPermanent, err)
}

// expected fails the run like permanent, for an end of the run that is not a fault of the operator.
func expected(err error) error {
	return fmt.Errorf("%w: %w", callbacks.ErrExpected, err)
}

// Steps are the callback handlers of the run workflow. Each step works out what it needs from the run id in the
// workflow context and the step state, and is safe to run again.
type Steps struct {
	clock clock.Clock
	cfg   *config.Config
	queue *Queue
	kube  *Kube
	host  *jobhost.Client
}

func NewSteps(
	cfg *config.Config,
	queue *Queue,
	kube *Kube,
	host *jobhost.Client,
	clk clock.Clock,
) *Steps {
	return &Steps{cfg: cfg, queue: queue, kube: kube, host: host, clock: clk}
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

func (s *Steps) load(ctx context.Context, payload *callbacks.Payload) (*stepRun, error) {
	id := payload.Context.SubjectID
	if payload.Context.Domain != Domain || !ValidRunID(id) || payload.Context.Caller == "" {
		return nil, permanent(fmt.Errorf("%w: domain %q, subject %q", errContext, payload.Context.Domain, id))
	}
	state, err := parseState(payload.State)
	if err != nil {
		return nil, permanent(err)
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
		return callbacks.Response{}, permanent(fmt.Errorf("%w: %s", errNoKind, run.state.Kind))
	}
	jobs, err := s.kube.ActiveJobs(ctx, run.state.Spec.Namespace, run.state.Kind)
	if err != nil {
		return callbacks.Response{}, err
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
		return callbacks.Response{}, expected(errQueueTimeout)
	}
	reason := fmt.Sprintf("The run is number %d in the queue for %s.", admission.Position, run.state.Kind)
	return callbacks.Wait(payload.State, AdmitRecheck, reason), nil
}

// createJob creates the run's Job from the kind's PodTemplate. It defers while the namespace's ResourceQuota for Jobs
// is full. The quota's KVM, CPU and memory limits apply to pods, not Jobs, so they do not stop a Job the queue should
// not have admitted; the run's reservation in the queue does, and the step renews it on every call.
func (s *Steps) createJob(ctx context.Context, payload *callbacks.Payload) (callbacks.Response, error) {
	run, err := s.load(ctx, payload)
	if err != nil {
		return callbacks.Response{}, err
	}
	s.queue.KeepAdmitted(run.id, run.state.Kind, run.caller)

	template, err := s.kube.PodTemplate(ctx, run.state.Spec)
	if err != nil {
		return callbacks.Response{}, err
	}
	job := BuildJob(template, RunJob{RunID: run.id, Kind: run.state.Kind, Caller: run.caller}, run.state.Spec)
	err = s.kube.Client.Create(ctx, job)
	switch {
	case err == nil || apierrors.IsAlreadyExists(err):
		return callbacks.Done(payload.State), nil
	case isQuotaExceeded(err):
		return callbacks.Wait(payload.State, quotaRecheck, "The sandbox quota is full."), nil
	case isAdmissionDenial(err):
		// The policy compares the Job with the PodTemplate it has cached, which lags a rollout of the template by a
		// moment. The step's retry strategy bounds how long a Job that never fits is tried.
		return callbacks.Response{}, fmt.Errorf("%w: %w", errJobRefused, err)
	case apierrors.IsInvalid(err) || apierrors.IsForbidden(err) || apierrors.IsBadRequest(err):
		return callbacks.Response{}, permanent(fmt.Errorf("%w: %w", errJobRefused, err))
	default:
		return callbacks.Response{}, fmt.Errorf("create Job: %w", err)
	}
}

// awaitPod waits until the Job's pod is ready, and hands its IP to the next steps.
func (s *Steps) awaitPod(ctx context.Context, payload *callbacks.Payload) (callbacks.Response, error) {
	run, err := s.load(ctx, payload)
	if err != nil {
		return callbacks.Response{}, err
	}
	pods, err := s.kube.JobPods(ctx, run.state.Spec.Namespace, run.id)
	if err != nil {
		return callbacks.Response{}, err
	}
	if len(pods) == 0 {
		return s.awaitPodCreation(ctx, run, payload)
	}

	pod := &pods[0]
	switch {
	case podEnded(pod):
		return callbacks.Response{}, permanent(fmt.Errorf("%w: %s is %s", errPodEnded, pod.Name, pod.Status.Phase))
	case podReady(pod):
		run.state.PodIP = pod.Status.PodIP
		state, err := run.state.encode()
		if err != nil {
			return callbacks.Response{}, err
		}
		return callbacks.Done(state), nil
	case podUnschedulable(pod):
		return callbacks.Wait(payload.State, podRecheck, "Waiting for a sandbox node."), nil
	default:
		return callbacks.Wait(payload.State, podRecheck, "Waiting for the job host to start."), nil
	}
}

// awaitPodCreation waits for the Job controller to create the pod, unless the Job has failed without one.
func (s *Steps) awaitPodCreation(
	ctx context.Context,
	run *stepRun,
	payload *callbacks.Payload,
) (callbacks.Response, error) {
	job, err := s.kube.Job(ctx, run.state.Spec.Namespace, run.id)
	switch {
	case apierrors.IsNotFound(err):
		// The cache has not seen the new Job yet. Until it does, the run holds its place through its reservation,
		// which a queue that restarted meanwhile does not know.
		s.queue.KeepAdmitted(run.id, run.state.Kind, run.caller)
	case err != nil:
		return callbacks.Response{}, err
	default:
		if reason, failed := jobFailure(job); failed {
			return callbacks.Response{}, permanent(fmt.Errorf("%w: %s", errJobFailed, reason))
		}
	}
	return callbacks.Wait(payload.State, podRecheck, "Waiting for the Job to create its pod."), nil
}

// awaitArchive waits until the caller's archive has reached the job host, which then starts the command. The run's
// status reads awaiting-archive meanwhile, and the run API passes the caller's upload on to the job host. The job host
// is the only one that knows when the archive has arrived, so the step asks it.
func (s *Steps) awaitArchive(ctx context.Context, payload *callbacks.Payload) (callbacks.Response, error) {
	run, err := s.load(ctx, payload)
	if err != nil {
		return callbacks.Response{}, err
	}
	// The job host takes a command and an archive, and no kind accepts arguments yet. The first kind that does
	// decides how the job host receives them, from the run's arguments. Until then a run with arguments fails here,
	// rather than run its command without them.
	if len(run.state.Args) > 0 {
		return callbacks.Response{}, permanent(errArgs)
	}
	if run.state.PodIP == "" {
		return callbacks.Response{}, permanent(errNoPodIP)
	}

	_, err = s.host.Status(ctx, run.state.PodIP, run.id, 0)
	switch {
	case err == nil:
		return callbacks.Done(payload.State), nil
	case errors.Is(err, jobhost.ErrNotClaimed):
		if payload.IsFinalWaitCheck {
			return callbacks.Response{}, expected(errArchiveTimeout)
		}
		return callbacks.Wait(payload.State, archiveRecheck, "Waiting for the caller to upload the archive."), nil
	default:
		return callbacks.Response{}, s.jobHostError(ctx, run, err)
	}
}

// awaitResult long-polls the job host until the command has finished, and keeps its outcome in the state. The status
// that it reads does not count as a fetch, so the job host keeps the result for the caller.
func (s *Steps) awaitResult(ctx context.Context, payload *callbacks.Payload) (callbacks.Response, error) {
	run, err := s.load(ctx, payload)
	if err != nil {
		return callbacks.Response{}, err
	}
	if run.state.PodIP == "" {
		return callbacks.Response{}, permanent(errNoPodIP)
	}

	status, err := s.host.Status(ctx, run.state.PodIP, run.id, resultWait)
	if err != nil {
		return callbacks.Response{}, s.jobHostError(ctx, run, err)
	}
	if status.Status == jobhost.StatusRunning {
		return callbacks.Wait(payload.State, resultRecheck, "The command is running."), nil
	}
	log.FromContext(ctx).Info("Run finished", "outcome", status.Status, "exitCode", status.ExitCode,
		"timedOut", status.TimedOut)
	run.state.Outcome = status.Status
	run.state.Error = status.Error
	state, err := run.state.encode()
	if err != nil {
		return callbacks.Response{}, err
	}
	return callbacks.Done(state), nil
}

// jobHostError decides whether a failed request to the job host can succeed later. A job host that does not answer
// may be restarting its connection, unless its pod is gone.
func (s *Steps) jobHostError(ctx context.Context, run *stepRun, err error) error {
	switch {
	case errors.Is(err, jobhost.ErrRejected), errors.Is(err, jobhost.ErrNotClaimed):
		return permanent(err)
	case errors.Is(err, jobhost.ErrUnreachable):
		if gone, podErr := s.podGone(ctx, run); podErr == nil && gone {
			return permanent(fmt.Errorf("%w: %w", errPodGone, err))
		}
	}
	return fmt.Errorf("ask the job host: %w", err)
}

// podGone reports whether the run's pod has stopped or disappeared, so its job host can never answer.
func (s *Steps) podGone(ctx context.Context, run *stepRun) (bool, error) {
	pods, err := s.kube.JobPods(ctx, run.state.Spec.Namespace, run.id)
	if err != nil {
		return false, err
	}
	for i := range pods {
		if pods[i].Status.PodIP == run.state.PodIP {
			return podEnded(&pods[i]) || pods[i].DeletionTimestamp != nil, nil
		}
	}
	return true, nil
}

// cleanup deletes the Job once the caller can have the result no more. The job host of a completed run keeps the
// result until the caller has fetched it and a grace has passed, or until the result timeout, and then exits. The step
// waits for that, so the result lives as long as the Job does.
func (s *Steps) cleanup(ctx context.Context, payload *callbacks.Payload) (callbacks.Response, error) {
	run, err := s.load(ctx, payload)
	if err != nil {
		return callbacks.Response{}, err
	}
	if run.state.Outcome == jobhost.StatusCompleted && !payload.IsFinalWaitCheck {
		gone, err := s.podGone(ctx, run)
		if err != nil {
			return callbacks.Response{}, err
		}
		if !gone {
			return callbacks.Wait(payload.State, cleanupRecheck, "Waiting for the caller to fetch the result."), nil
		}
	}
	if deleteErr := s.kube.DeleteJob(ctx, run.state.Spec.Namespace, run.id); deleteErr != nil {
		return callbacks.Response{}, deleteErr
	}
	s.queue.Forget(run.id)
	return callbacks.Done(payload.State), nil
}
