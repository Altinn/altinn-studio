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
	"unicode/utf8"

	"altinn.studio/core-operator/internal/clock"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/engine"
	"altinn.studio/core-operator/internal/jobhost"
	"altinn.studio/core-operator/internal/logging"
	"altinn.studio/core-operator/internal/sandbox"
)

var (
	ErrKindNotFound  = errors.New("the kind is not in this environment's catalog")
	ErrKindForbidden = errors.New("the caller may not run this kind")
	ErrQueueFull     = errors.New("the caller has as many queued runs as the kind allows")
	ErrConflict      = errors.New("a run of this kind for this source is in progress with other arguments")
	ErrNotFound      = errors.New("not found")
	ErrUnavailable   = errors.New("the operator cannot reach its engine")
	ErrJobHost       = errors.New("the operator cannot reach the run's Job")
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
	// MaxArgLength is the most characters an argument's value may have, as in api/openapi.yaml.
	MaxArgLength = 1024
	// MaxArchiveBytes is the largest archive a caller may send, as the job host accepts.
	MaxArchiveBytes = 50 << 20
	// maxFound is the most runs a find returns, and how many runs of a source a create reads.
	maxFound = 20
)

// RequestError refuses a request that the caller must change, such as an argument the kind does not accept or a source
// that is not valid. Its message tells the caller what to change.
type RequestError struct {
	Message string
}

func (e *RequestError) Error() string { return e.Message }

// UploadError passes on the job host's refusal of an archive, such as one that is too large.
type UploadError struct {
	Detail string
	Status int
}

func (e *UploadError) Error() string {
	return fmt.Sprintf("the job host refused the archive: %d %s", e.Status, e.Detail)
}

// Service carries out the run API for a caller. It keeps nothing of a run: the engine keeps the run's workflow, and
// the run's Job keeps the archive and the result.
type Service struct {
	cfg     *config.Config
	queue   *Queue
	engine  *engine.Client
	host    *jobhost.Client
	sandbox sandbox.Sandbox
	clock   clock.Clock
	locks   keyedMutex
}

func NewService(
	cfg *config.Config,
	queue *Queue,
	engineClient *engine.Client,
	host *jobhost.Client,
	box sandbox.Sandbox,
	clk clock.Clock,
) *Service {
	return &Service{cfg: cfg, queue: queue, engine: engineClient, host: host, sandbox: box, clock: clk}
}

// Kind is Kind in api/openapi.yaml.
type Kind struct {
	Name                 string   `json:"name"`
	Args                 []string `json:"args"`
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
		kinds = append(kinds, Kind{
			Name: name,
			// An empty list, not null, for a kind without arguments.
			Args:                 append([]string{}, kind.Args...),
			QueueTimeoutSeconds:  int(kind.QueueTimeout / time.Second),
			UploadTimeoutSeconds: int(config.UploadTimeout / time.Second),
			RunTimeoutSeconds:    int(kind.RunTimeout / time.Second),
			ResultTimeoutSeconds: int(config.ResultTimeout / time.Second),
			MaxDurationSeconds:   int(maxDuration(specOf(kind)) / time.Second),
		})
	}
	return kinds
}

// CreateRequest is CreateRun in api/openapi.yaml.
type CreateRequest struct {
	// Args are the run's arguments by name. Nil and empty are the same run.
	Args   map[string]string `json:"args,omitempty"`
	Kind   string            `json:"kind"`
	Source Source            `json:"source"`
}

// check tells whether the caller may run the request's kind with its arguments and source.
func (s *Service) check(caller string, request *CreateRequest) error {
	kind, found, allowed := s.cfg.KindFor(caller, request.Kind)
	switch {
	case !found:
		return ErrKindNotFound
	case !allowed:
		return ErrKindForbidden
	}
	if err := request.Source.check(); err != nil {
		return err
	}
	return checkArgs(request.Kind, kind, request.Args)
}

// checkArgs refuses an argument the kind does not accept or one over a limit. A caller can only fill in the values
// the kind asks for, never choose what runs.
func checkArgs(kindName string, kind config.Kind, args map[string]string) error {
	if len(args) > config.MaxArgs {
		return &RequestError{Message: fmt.Sprintf("Send at most %d arguments.", config.MaxArgs)}
	}
	// Sorted, so a request with several wrong arguments always gets the same answer.
	for _, name := range slices.Sorted(maps.Keys(args)) {
		switch {
		case !config.ValidName(name):
			// Not quoted back, since it can be as long as the body.
			return &RequestError{Message: fmt.Sprintf(
				"An argument name must be a lowercase name of at most %d characters.", config.MaxNameLength)}
		case !slices.Contains(kind.Args, name):
			return &RequestError{Message: fmt.Sprintf(
				"The kind %s does not accept the argument %s. GET /api/v1/kinds lists the arguments of each kind.",
				kindName, name)}
		case utf8.RuneCountInString(args[name]) > MaxArgLength:
			return &RequestError{
				Message: fmt.Sprintf("The argument %s is longer than %d characters.", name, MaxArgLength),
			}
		}
	}
	return nil
}

// Create enqueues a run of the kind for the source. When the caller has a run of the same kind for the same source
// that has not ended, it returns that run instead, with created false. A completed run whose Job still keeps the
// result has not ended, so a create finds it and the caller can fetch the result.
//
// The key of the workflow comes from the newest run of the kind and source that has ended, so two creates at the same
// time make one run, and a create after a run has ended makes a new one.
func (s *Service) Create(ctx context.Context, caller string, request CreateRequest) (*Run, bool, error) {
	request.Source = request.Source.normalized()
	if err := s.check(caller, &request); err != nil {
		return nil, false, err
	}
	unlock := s.locks.lock(caller + ":" + createKey(request.Kind, request.Source, ""))
	defer unlock()

	namespace := EngineNamespace(caller)
	labels := request.Source.labels()
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
		if !maps.Equal(argsOf(workflow), request.Args) {
			return nil, false, ErrConflict
		}
		return s.view(workflow), false, nil
	}

	kind := s.cfg.Kinds[request.Kind]
	if s.queue.Waiting(request.Kind, caller) >= kind.MaxQueuedPerCaller {
		return nil, false, ErrQueueFull
	}
	run := newRun{
		ID:     RunID(caller, createKey(request.Kind, request.Source, after)),
		Caller: caller,
		Kind:   request.Kind,
		Source: request.Source,
		Spec:   specOf(kind),
		Args:   request.Args,
	}
	enqueueRequest, err := BuildEnqueueRequest(run)
	if err != nil {
		return nil, false, err
	}
	result, err := s.engine.Enqueue(ctx, namespace, run.ID, enqueueRequest)
	switch {
	case errors.Is(err, engine.ErrConflict):
		// Another create with the same key, at the same time, sent other arguments, or the catalog changed between
		// the two.
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
			ID: run.ID, Kind: run.Kind, Source: run.Source, Status: StatusQueued, CreatedAt: s.clock.Now().UTC(),
		}
		if position, ok := s.queue.Position(run.ID); ok {
			created.QueuePosition = &position
		}
	}
	return created, result.Created, nil
}

// argsOf reads a run's arguments from the initial state of its workflow.
func argsOf(workflow *engine.Workflow) map[string]string {
	state, err := parseState(workflow.InitialState)
	if err != nil {
		return nil
	}
	return state.Args
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
		Source:          sourceOf(workflow.Labels),
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

// jobHostOf returns the address and the command of a run's job host, which run.await-pod left in its state.
func jobHostOf(workflow *engine.Workflow) (podIP, command string, ok bool) {
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

// Upload passes the caller's archive on to the run's job host, which starts the command. The run must await its
// archive. size is -1 when the caller did not say. A repeat after the job host has the archive succeeds, and the job
// host discards the archive that came again.
func (s *Service) Upload(ctx context.Context, caller, runID string, archive io.Reader, size int64) (*Run, error) {
	workflow, err := s.locate(ctx, caller, runID)
	if err != nil {
		return nil, err
	}
	run := s.view(workflow)
	if run.Status != StatusAwaitingArchive {
		return nil, fmt.Errorf("%w: the run is %s", ErrNotAwaiting, run.Status)
	}
	podIP, command, ok := jobHostOf(workflow)
	if !ok {
		return nil, fmt.Errorf("%w: the run has no job host", ErrNotAwaiting)
	}

	err = s.host.Start(ctx, podIP, runID, command, archive, size)
	var rejection *jobhost.RejectedError
	switch {
	case err == nil:
		return run, nil
	case errors.As(err, &rejection):
		return nil, &UploadError{Status: rejection.Status, Detail: rejection.Detail}
	case errors.Is(err, jobhost.ErrConflict):
		// The Job's pod is the run's own, so another run cannot have claimed it.
		return nil, fmt.Errorf("upload the archive: %w", err)
	default:
		return nil, fmt.Errorf("%w: %w", ErrJobHost, err)
	}
}

// Result opens the result of a completed run at its job host, to pass it on as it is. This is the fetch: the job host
// keeps the result for a grace after it, and then exits, and run.cleanup deletes the Job. The caller closes the body.
// size is -1 when the job host did not say.
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
	podIP, _, ok := jobHostOf(workflow)
	if !ok {
		return nil, 0, fmt.Errorf("%w: the run has no job host", ErrExpired)
	}

	body, size, err := s.host.OpenResult(ctx, podIP, runID)
	switch {
	case err == nil:
		return body, size, nil
	case errors.Is(err, jobhost.ErrUnreachable):
		// The job host exits once it has served the result and its grace has passed, or once the result timeout has.
		if gone, podErr := s.podGone(ctx, workflow, runID, podIP); podErr == nil && gone {
			return nil, 0, fmt.Errorf("%w: %w", ErrExpired, err)
		}
		return nil, 0, fmt.Errorf("%w: %w", ErrJobHost, err)
	default:
		return nil, 0, fmt.Errorf("%w: %w", ErrExpired, err)
	}
}

// podGone reports whether the pod of a run's job host has stopped or disappeared.
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

// keyedMutex serializes the creates of one kind and source, so two requests at the same time cannot both find no run
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
