package runs

import (
	"context"
	"errors"
	"fmt"
	"io"
	"maps"
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
	// MaxArchiveBytes is the largest archive that the operator runner accepts.
	MaxArchiveBytes = 50 << 20
	// maxFound is the most runs a find returns, and how many runs with the same labels a create reads.
	maxFound = 20
)

// RequestError refuses a request that the caller must change. Its message says what to change.
type RequestError struct {
	Message string
}

func (e *RequestError) Error() string { return e.Message }

// UploadError is the operator runner's refusal of an archive, such as one that is too large.
type UploadError = runner.RejectedError

// Service carries out the run API.
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
		spec := specOf(kind, s.cfg.TimeScale)
		uploadTimeout := scaled(config.UploadTimeout, spec.TimeScale)
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
			ResultTimeoutSeconds: int(scaled(config.ResultTimeout, spec.TimeScale) / time.Second),
			MaxDurationSeconds:   int(maxDuration(spec) / time.Second),
		})
	}
	return kinds
}

// CreateRequest is the body of POST /api/v1/runs.
type CreateRequest struct {
	// Labels has a value for each label of the kind.
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

// Create enqueues a run of the kind with the labels. If the caller has such a run that has not ended, Create returns it
// with created false. A run has ended once its status is final, which can be before the engine ends its workflow. A
// completed run whose Job still keeps the result has not ended.
//
// The workflow's key names the newest run of the kind and labels that has ended. So two creates at the same time make
// one run, and a create after a run has ended makes a new one.
func (s *Service) Create(ctx context.Context, caller string, request CreateRequest) (*Run, bool, error) {
	request.Labels = normalizedLabels(request.Labels)
	if err := s.check(caller, &request); err != nil {
		return nil, false, err
	}
	// The lock covers the kind, so that creates at the same time count each other's runs against MaxQueuedPerCaller.
	unlock := s.locks.lock(caller + ":" + request.Kind)
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
		found := s.read(&workflows[i])
		if !found.Status.Final() || found.keepsResult() {
			return &found.Run, false, nil
		}
		if after == "" {
			after = found.ID
		}
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
		Spec:   specOf(kind, s.cfg.TimeScale),
	}
	enqueueRequest, err := BuildEnqueueRequest(run)
	if err != nil {
		return nil, false, err
	}
	result, err := s.engine.Enqueue(ctx, namespace, run.ID, enqueueRequest)
	switch {
	case errors.Is(err, engine.ErrConflict):
		// A create at the same time used another version of the kind, because the catalog changed between the two.
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
		found = append(found, &s.read(&workflows[i]).Run)
	}
	return found, nil
}

// locate finds a caller's run by its id. The engine namespace holds only the caller's runs, so a caller cannot learn
// another's run ids.
func locate(ctx context.Context, client *engine.Client, caller, runID string) (*engine.Workflow, error) {
	if !ValidRunID(runID) || caller == "" {
		return nil, ErrNotFound
	}
	labels := map[string]string{workflowLabelRunID: runID}
	workflows, err := client.FindByLabels(ctx, EngineNamespace(caller), labels, 1)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrUnavailable, err)
	}
	if len(workflows) == 0 {
		return nil, ErrNotFound
	}
	return &workflows[0], nil
}

// read reads a run from its workflow, with its place in the queue.
func (s *Service) read(workflow *engine.Workflow) *record {
	rec := readRun(workflow)
	if rec.Status == StatusQueued {
		if position, ok := s.queue.Position(rec.ID); ok {
			rec.QueuePosition = &position
		}
	}
	return rec
}

// Get returns a run. With wait, it waits up to MaxWait for the status or the queue position to change.
func (s *Service) Get(ctx context.Context, caller, runID string, wait time.Duration) (*Run, error) {
	workflow, err := locate(ctx, s.engine, caller, runID)
	if err != nil {
		return nil, err
	}
	run := &s.read(workflow).Run
	if wait <= 0 || run.Status.Final() {
		return run, nil
	}

	deadline := s.clock.Now().Add(min(wait, MaxWait))
	for s.clock.Now().Before(deadline) {
		if workflow = s.poll(ctx, workflow); workflow == nil {
			break
		}
		next := &s.read(workflow).Run
		if next.Status != run.Status || !equalPosition(next.QueuePosition, run.QueuePosition) {
			return next, nil
		}
		run = next
	}
	// The run has not changed, or the operator cannot tell. The caller asks again.
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

// Upload passes the caller's archive on to the run's operator runner, which starts the command. size is -1 when the
// caller did not say. A repeat succeeds, and the operator runner discards the second archive.
func (s *Service) Upload(ctx context.Context, caller, runID string, archive io.Reader, size int64) (*Run, error) {
	workflow, err := locate(ctx, s.engine, caller, runID)
	if err != nil {
		return nil, err
	}
	rec := s.read(workflow)
	if rec.Status != StatusAwaitingArchive {
		return nil, fmt.Errorf("%w: the run is %s", ErrNotAwaiting, rec.Status)
	}

	if rec.state.UploadBy != nil {
		// An archive that arrived after run.await-archive gave up would start the command of a run that has failed.
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, rec.state.UploadBy.Sub(s.clock.Now()))
		defer cancel()
	}
	err = s.host.Start(ctx, rec.state.pod(runID), rec.state.Spec.Command, rec.state.Spec.RunTimeout, archive, size)
	switch {
	case err == nil:
		return &rec.Run, nil
	case errors.Is(err, context.DeadlineExceeded):
		return nil, fmt.Errorf("%w: the upload timeout ran out", ErrNotAwaiting)
	case errors.Is(err, runner.ErrRejected):
		return nil, fmt.Errorf("upload the archive: %w", err) // an *UploadError
	case errors.Is(err, runner.ErrGone):
		return nil, fmt.Errorf("%w: %w", ErrNotAwaiting, err)
	default:
		return nil, fmt.Errorf("%w: %w", ErrRunner, err)
	}
}

// Result opens the result of a completed run at its operator runner. This is the fetch, after which the operator
// runner keeps the result only for a grace. The caller closes the body. size is -1 when the operator runner did not
// say.
func (s *Service) Result(ctx context.Context, caller, runID string) (io.ReadCloser, int64, error) {
	workflow, err := locate(ctx, s.engine, caller, runID)
	if err != nil {
		return nil, 0, err
	}
	rec := readRun(workflow)
	switch {
	case !rec.Status.Final():
		return nil, 0, ErrNotFinished
	case rec.Status != StatusCompleted:
		detail := string(rec.Status)
		if rec.Error != nil {
			detail += ": " + rec.Error.Detail
		}
		return nil, 0, fmt.Errorf("%w: the run is %s", ErrNoResult, detail)
	case !rec.keepsResult():
		// run.cleanup has deleted the Job.
		return nil, 0, ErrExpired
	}

	body, size, err := s.host.OpenResult(ctx, rec.state.pod(runID))
	switch {
	case err == nil:
		return body, size, nil
	case errors.Is(err, runner.ErrGone), errors.Is(err, runner.ErrNotClaimed):
		// The operator runner exits after the grace that follows a fetch, or at the result timeout.
		return nil, 0, fmt.Errorf("%w: %w", ErrExpired, err)
	default:
		return nil, 0, fmt.Errorf("%w: %w", ErrRunner, err)
	}
}

// Cancel cancels the run's workflow and deletes its Job. canceled is false when the run had already ended.
func (s *Service) Cancel(ctx context.Context, caller, runID string) (*Run, bool, error) {
	workflow, err := locate(ctx, s.engine, caller, runID)
	if err != nil {
		return nil, false, err
	}
	rec := s.read(workflow)
	if rec.Status.Final() {
		return &rec.Run, false, nil
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

	// The engine stops calling the run's steps, but the Job would run its command to the end. If this fails, the
	// garbage collector deletes the Job.
	if err := release(ctx, s.queue, s.sandbox, rec.state.Spec.Namespace, runID); err != nil {
		logging.FromContext(ctx).
			Info("Could not release a canceled run", "runId", runID, "error", err.Error())
	}
	if workflow.CancellationRequestedAt == nil {
		now := s.clock.Now()
		workflow.CancellationRequestedAt = &now
	}
	return &s.read(workflow).Run, true, nil
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
