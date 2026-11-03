package runs

import (
	"context"
	"errors"
	"fmt"
	"io"
	"maps"
	"slices"
	"sync"
	"time"

	"altinn.studio/core-operator/internal/clock"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/engine"
	"altinn.studio/core-operator/internal/logging"
	"altinn.studio/core-operator/internal/runner"
	"altinn.studio/core-operator/internal/sandbox"
)

var (
	ErrKindNotFound  = errors.New("the kind is not in this environment's catalog")
	ErrKindForbidden = errors.New("the caller may not run this kind")
	ErrQueueFull     = errors.New("the caller has as many queued runs as the kind allows")
	ErrConflict      = errors.New("a create of the same run at the same time used another version of its kind")
	ErrNotFound      = errors.New("not found")
	ErrUnavailable   = errors.New("the operator cannot reach its engine")
	ErrRunner        = errors.New("the operator cannot reach the run's Job")
	ErrNotAwaiting   = errors.New("the run does not await its archive")
	ErrNotFinished   = errors.New("the run has not finished")
	ErrNoResult      = errors.New("the run finished without a result")
	ErrExpired       = errors.New("the result has expired")
)

const (
	// MaxWait caps a long poll of a run's status.
	MaxWait = 30 * time.Second
	// statusPoll is how often a long poll reads the workflow from the engine.
	statusPoll = time.Second
	// MaxArchiveBytes is the largest archive a caller may send, as the operator runner accepts.
	MaxArchiveBytes = 50 << 20
	// maxFound is the most runs a find returns, and how many runs with the same labels a create reads.
	maxFound = 20
)

// RequestError refuses a request that the caller must change, such as a label that is not valid. Its message tells the caller what to change.
type RequestError struct {
	Message string
}

func (e *RequestError) Error() string { return e.Message }

// UploadError passes on the operator runner's refusal of an archive, such as one that is too large.
type UploadError struct {
	Detail string
	Status int
}

func (e *UploadError) Error() string {
	return fmt.Sprintf("the operator runner refused the archive: %d %s", e.Status, e.Detail)
}

// Service carries out the run API for a caller. It keeps nothing of a run: the engine keeps the run's workflow, and
// the run's Job keeps the archive and the result.
type Service struct {
	cfg     *config.Config
	queue   *Queue
	engine  *engine.Client
	host    *runner.Client
	sandbox sandbox.Sandbox
	clock   clock.Clock
	locks   keyedMutex
}

func NewService(
	cfg *config.Config,
	queue *Queue,
	engineClient *engine.Client,
	host *runner.Client,
	box sandbox.Sandbox,
	clk clock.Clock,
) *Service {
	return &Service{cfg: cfg, queue: queue, engine: engineClient, host: host, sandbox: box, clock: clk}
}

// Kind is a kind as GET /api/v1/kinds lists it.
type Kind struct {
	Name                 string   `json:"name"`
	Labels               []string `json:"labels"`
	RequiresArchive      bool     `json:"requiresArchive"`
	QueueTimeoutSeconds  int      `json:"queueTimeoutSeconds"`
	UploadTimeoutSeconds int      `json:"uploadTimeoutSeconds"`
	RunTimeoutSeconds    int      `json:"runTimeoutSeconds"`
	ResultTimeoutSeconds int      `json:"resultTimeoutSeconds"`
	MaxDurationSeconds   int      `json:"maxDurationSeconds"`
}

// Kinds lists the kinds the caller may run in this environment.
func (s *Service) Kinds(caller string) []Kind {
	names := s.cfg.KindsFor(caller)
	kinds := make([]Kind, 0, len(names))
	for _, name := range names {
		kind := s.cfg.Kinds[name]
		uploadTimeout := config.UploadTimeout
		spec := specOf(kind)
		if !spec.RequiresArchive {
			uploadTimeout = 0
		}
		kinds = append(kinds, Kind{
			Name: name,
			// An empty list, not null, for a kind without labels.
			Labels:               append([]string{}, kind.Labels...),
			RequiresArchive:      spec.RequiresArchive,
			QueueTimeoutSeconds:  int(kind.QueueTimeout / time.Second),
			UploadTimeoutSeconds: int(uploadTimeout / time.Second),
			RunTimeoutSeconds:    int(kind.RunTimeout / time.Second),
			ResultTimeoutSeconds: int(config.ResultTimeout / time.Second),
			MaxDurationSeconds:   int(maxDuration(specOf(kind)) / time.Second),
		})
	}
	return kinds
}

// CreateRequest is the body of POST /api/v1/runs.
type CreateRequest struct {
	// Labels say what the run is for, with a value for each label of the kind.
	Labels map[string]string `json:"labels"`
	Kind   string            `json:"kind"`
}

// check tells whether the caller may run the request's kind with its labels.
func (s *Service) check(caller string, request *CreateRequest) error {
	kind, found, allowed := s.cfg.KindFor(caller, request.Kind)
	switch {
	case !found:
		return ErrKindNotFound
	case !allowed:
		return ErrKindForbidden
	}
	return checkLabels(request.Kind, kind, request.Labels)
}

// Create enqueues a run of the kind with the labels. When the caller has a run of the same kind with the same labels
// that has not ended, it returns that run instead, with created false. A completed run whose Job still keeps the
// result has not ended, so a create finds it and the caller can fetch the result.
//
// The key of the workflow comes from the newest run of the kind and labels that has ended, so two creates at the same
// time make one run, and a create after a run has ended makes a new one.
func (s *Service) Create(ctx context.Context, caller string, request CreateRequest) (*Run, bool, error) {
	request.Labels = normalizedLabels(request.Labels)
	if err := s.check(caller, &request); err != nil {
		return nil, false, err
	}
	unlock := s.locks.lock(caller + ":" + createKey(request.Kind, request.Labels, ""))
	defer unlock()

	namespace := EngineNamespace(caller)
	labels := maps.Clone(request.Labels)
	labels[workflowLabelKind] = request.Kind
	workflows, err := s.engine.FindByLabels(ctx, namespace, labels, maxFound)
	if err != nil {
		return nil, false, fmt.Errorf("%w: %w", ErrUnavailable, err)
	}
	after := ""
	for i := range workflows {
		workflow := &workflows[i]
		if workflow.OverallStatus.Terminal() {
			if after == "" {
				after = workflow.Labels[workflowLabelRunID]
			}
			continue
		}
		return s.view(workflow), false, nil
	}

	kind := s.cfg.Kinds[request.Kind]
	if s.queue.Waiting(request.Kind, caller) >= kind.MaxQueuedPerCaller {
		return nil, false, ErrQueueFull
	}
	run := newRun{
		ID:     RunID(caller, createKey(request.Kind, request.Labels, after)),
		Caller: caller,
		Kind:   request.Kind,
		Labels: request.Labels,
		Spec:   specOf(kind),
	}
	enqueueRequest, err := BuildEnqueueRequest(run)
	if err != nil {
		return nil, false, err
	}
	result, err := s.engine.Enqueue(ctx, namespace, run.ID, enqueueRequest)
	switch {
	case errors.Is(err, engine.ErrConflict):
		// Another create with the same key, at the same time, used another version of the kind: the catalog changed
		// between the two.
		return nil, false, ErrConflict
	case errors.Is(err, engine.ErrInvalid):
		// The operator built a workflow the engine does not accept, so a retry does not help.
		return nil, false, fmt.Errorf("enqueue the run workflow: %w", err)
	case err != nil:
		return nil, false, fmt.Errorf("%w: %w", ErrUnavailable, err)
	}
	if result.Created {
		s.queue.Register(run.ID, run.Kind, caller, s.clock.Now())
	}

	created, err := s.Get(ctx, caller, run.ID, 0)
	if err != nil {
		// The engine has the run, and a create again finds it. A workflow the engine has just stored is queued.
		logging.FromContext(ctx).Info("Read a new run failed", "runId", run.ID, "error", err.Error())
		created = &Run{
			ID: run.ID, Kind: run.Kind, Labels: run.Labels, Status: StatusQueued, CreatedAt: s.clock.Now().UTC(),
		}
		if position, ok := s.queue.Position(run.ID); ok {
			created.QueuePosition = &position
		}
	}
	return created, result.Created, nil
}

// Find lists the caller's runs that match the filter, newest first.
func (s *Service) Find(ctx context.Context, caller string, filter Filter) ([]*Run, error) {
	labels, err := filter.labels()
	if err != nil {
		return nil, err
	}
	workflows, err := s.engine.FindByLabels(ctx, EngineNamespace(caller), labels, maxFound)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrUnavailable, err)
	}
	found := make([]*Run, 0, len(workflows))
	for i := range workflows {
		found = append(found, s.view(&workflows[i]))
	}
	return found, nil
}

// locate finds a caller's run by its id. The engine namespace holds only the caller's runs, so a caller cannot learn
// another's run ids.
func (s *Service) locate(ctx context.Context, caller, runID string) (*engine.Workflow, error) {
	if !ValidRunID(runID) {
		return nil, ErrNotFound
	}
	labels := map[string]string{workflowLabelRunID: runID}
	workflows, err := s.engine.FindByLabels(ctx, EngineNamespace(caller), labels, 1)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrUnavailable, err)
	}
	if len(workflows) == 0 {
		return nil, ErrNotFound
	}
	return &workflows[0], nil
}

// view describes a run as the run API shows it.
func (s *Service) view(workflow *engine.Workflow) *Run {
	described := describe(workflow)
	run := &Run{
		ID:              workflow.Labels[workflowLabelRunID],
		Kind:            workflow.Labels[workflowLabelKind],
		Labels:          labelsOf(workflow.Labels),
		Status:          described.status,
		CreatedAt:       workflow.CreatedAt,
		StartedAt:       startedAt(workflow),
		FinishedAt:      described.finishedAt,
		ResultExpiresAt: described.resultExpiresAt,
		Error:           described.err,
	}
	if described.status == StatusQueued {
		if position, ok := s.queue.Position(run.ID); ok {
			run.QueuePosition = &position
		}
	}
	return run
}

// Get returns a run. With wait, it waits up to MaxWait for the status or the queue position to change.
func (s *Service) Get(ctx context.Context, caller, runID string, wait time.Duration) (*Run, error) {
	workflow, err := s.locate(ctx, caller, runID)
	if err != nil {
		return nil, err
	}
	run := s.view(workflow)
	if wait <= 0 || run.Status.Final() {
		return run, nil
	}

	deadline := s.clock.Now().Add(min(wait, MaxWait))
	for s.clock.Now().Before(deadline) {
		if workflow = s.poll(ctx, workflow); workflow == nil {
			break
		}
		next := s.view(workflow)
		if next.Status != run.Status || !equalPosition(next.QueuePosition, run.QueuePosition) {
			return next, nil
		}
		run = next
	}
	// The run has not changed, or the operator cannot tell. The last status the caller got is still true as far as
	// the operator knows, and the caller asks again.
	return run, nil
}

// poll waits one poll interval and reads the run's workflow again by its id. It returns nil when the request ends or
// the read fails.
func (s *Service) poll(ctx context.Context, workflow *engine.Workflow) *engine.Workflow {
	select {
	case <-ctx.Done():
		return nil
	case <-s.clock.After(statusPoll):
	}
	next, err := s.engine.Get(ctx, workflow.Namespace, workflow.DatabaseID)
	if err != nil {
		logging.FromContext(ctx).V(1).Info("Read run during a long poll failed",
			"runId", workflow.Labels[workflowLabelRunID], "error", err.Error())
		return nil
	}
	return next
}

func equalPosition(a, b *int) bool {
	if a == nil || b == nil {
		return a == b
	}
	return *a == *b
}

// runnerOf returns the address and the command of a run's operator runner, which run.await-pod left in its state.
func runnerOf(workflow *engine.Workflow) (podIP, command string, ok bool) {
	index := slices.IndexFunc(workflow.Steps, func(step engine.Step) bool { return step.OperationID == StepAwaitPod })
	if index < 0 || workflow.Steps[index].Status != engine.StatusCompleted {
		return "", "", false
	}
	state, err := parseState(workflow.Steps[index].StateOut)
	if err != nil || state.PodIP == "" {
		return "", "", false
	}
	return state.PodIP, state.Spec.Command, true
}

// Upload passes the caller's archive on to the run's operator runner, which starts the command. The run must await its
// archive. size is -1 when the caller did not say. A repeat after the operator runner has the archive succeeds, and the
// operator runner discards the archive that came again.
func (s *Service) Upload(ctx context.Context, caller, runID string, archive io.Reader, size int64) (*Run, error) {
	workflow, err := s.locate(ctx, caller, runID)
	if err != nil {
		return nil, err
	}
	run := s.view(workflow)
	if run.Status != StatusAwaitingArchive {
		return nil, fmt.Errorf("%w: the run is %s", ErrNotAwaiting, run.Status)
	}
	podIP, command, ok := runnerOf(workflow)
	if !ok {
		return nil, fmt.Errorf("%w: the run has no operator runner", ErrNotAwaiting)
	}

	err = s.host.Start(ctx, podIP, runID, command, archive, size)
	var rejection *runner.RejectedError
	switch {
	case err == nil:
		return run, nil
	case errors.As(err, &rejection):
		return nil, &UploadError{Status: rejection.Status, Detail: rejection.Detail}
	case errors.Is(err, runner.ErrConflict):
		// The Job's pod is the run's own, so another run cannot have claimed it.
		return nil, fmt.Errorf("upload the archive: %w", err)
	default:
		return nil, fmt.Errorf("%w: %w", ErrRunner, err)
	}
}

// Result opens the result of a completed run at its operator runner, to pass it on as it is. This is the fetch: the
// operator runner keeps the result for a grace after it, and then exits, and run.cleanup deletes the Job. The caller
// closes the body. size is -1 when the operator runner did not say.
func (s *Service) Result(ctx context.Context, caller, runID string) (io.ReadCloser, int64, error) {
	workflow, err := s.locate(ctx, caller, runID)
	if err != nil {
		return nil, 0, err
	}
	described := describe(workflow)
	switch {
	case !described.status.Final():
		return nil, 0, ErrNotFinished
	case described.status != StatusCompleted:
		detail := string(described.status)
		if described.err != nil {
			detail += ": " + described.err.Detail
		}
		return nil, 0, fmt.Errorf("%w: the run is %s", ErrNoResult, detail)
	case workflow.OverallStatus.Terminal():
		// run.cleanup has deleted the Job.
		return nil, 0, ErrExpired
	}
	podIP, _, ok := runnerOf(workflow)
	if !ok {
		return nil, 0, fmt.Errorf("%w: the run has no operator runner", ErrExpired)
	}

	body, size, err := s.host.OpenResult(ctx, podIP, runID)
	switch {
	case err == nil:
		return body, size, nil
	case errors.Is(err, runner.ErrUnreachable):
		// The operator runner exits once it has served the result and its grace has passed, or once the result timeout has.
		if gone, podErr := s.podGone(ctx, workflow, runID, podIP); podErr == nil && gone {
			return nil, 0, fmt.Errorf("%w: %w", ErrExpired, err)
		}
		return nil, 0, fmt.Errorf("%w: %w", ErrRunner, err)
	default:
		return nil, 0, fmt.Errorf("%w: %w", ErrExpired, err)
	}
}

// podGone reports whether the pod of a run's operator runner has stopped or disappeared.
func (s *Service) podGone(ctx context.Context, workflow *engine.Workflow, runID, podIP string) (bool, error) {
	state, err := parseState(workflow.InitialState)
	if err != nil {
		return false, err
	}
	gone, err := s.sandbox.PodGone(ctx, state.Spec.Namespace, runID, podIP)
	if err != nil {
		return false, fmt.Errorf("read the pod: %w", err)
	}
	return gone, nil
}

// Cancel cancels the run's workflow and deletes its Job. canceled is false when the run had already ended.
func (s *Service) Cancel(ctx context.Context, caller, runID string) (*Run, bool, error) {
	workflow, err := s.locate(ctx, caller, runID)
	if err != nil {
		return nil, false, err
	}
	if run := s.view(workflow); run.Status.Final() {
		return run, false, nil
	}

	err = s.engine.Cancel(ctx, workflow.Namespace, workflow.DatabaseID)
	switch {
	case errors.Is(err, engine.ErrTerminal):
		run, getErr := s.Get(ctx, caller, runID, 0)
		return run, false, getErr
	case errors.Is(err, engine.ErrNotFound):
		return nil, false, ErrNotFound
	case err != nil:
		return nil, false, fmt.Errorf("%w: %w", ErrUnavailable, err)
	}

	s.queue.Forget(runID)
	// The engine stops calling the run's steps, but the Job would run its command to the end. The garbage collector
	// deletes it too, if this fails.
	if state, stateErr := parseState(workflow.InitialState); stateErr == nil {
		if err := s.sandbox.DeleteJob(ctx, state.Spec.Namespace, runID); err != nil {
			logging.FromContext(ctx).
				Info("Could not delete the Job of a canceled run", "runId", runID, "error", err.Error())
		}
	}
	if workflow.CancellationRequestedAt == nil {
		now := s.clock.Now()
		workflow.CancellationRequestedAt = &now
	}
	return s.view(workflow), true, nil
}

// keyedMutex serializes the creates of one kind and labels, so two requests at the same time cannot both find no run
// and both create one.
type keyedMutex struct {
	locks map[string]*keyedLock
	mu    sync.Mutex
}

type keyedLock struct {
	mu      sync.Mutex
	waiters int
}

func (k *keyedMutex) lock(key string) func() {
	k.mu.Lock()
	if k.locks == nil {
		k.locks = make(map[string]*keyedLock)
	}
	entry, ok := k.locks[key]
	if !ok {
		entry = &keyedLock{}
		k.locks[key] = entry
	}
	entry.waiters++
	k.mu.Unlock()

	entry.mu.Lock()
	return func() {
		entry.mu.Unlock()
		k.mu.Lock()
		entry.waiters--
		if entry.waiters == 0 {
			delete(k.locks, key)
		}
		k.mu.Unlock()
	}
}
