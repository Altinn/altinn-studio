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
	"altinn.studio/core-operator/internal/telemetry"
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
	// MaxWait limits a long poll of a run's status.
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

// Service implements the run API.
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
	QueueTimeoutSeconds  int      `json:"queueTimeoutSeconds"`
	UploadTimeoutSeconds int      `json:"uploadTimeoutSeconds"`
	RunTimeoutSeconds    int      `json:"runTimeoutSeconds"`
	ResultTimeoutSeconds int      `json:"resultTimeoutSeconds"`
	MaxDurationSeconds   int      `json:"maxDurationSeconds"`
}

func (s *Service) Kinds(caller string) []Kind {
	names := s.cfg.KindsFor(caller)
	kinds := make([]Kind, 0, len(names))
	for _, name := range names {
		kind := s.cfg.Kinds[name]
		spec := specOf(kind, s.cfg.TimeScale)
		kinds = append(kinds, Kind{
			Name: name,
			// An empty list, not null, for a kind without labels.
			Labels:               append([]string{}, kind.Labels...),
			QueueTimeoutSeconds:  int(kind.QueueTimeout / time.Second),
			UploadTimeoutSeconds: int(scaled(config.UploadTimeout, spec.TimeScale) / time.Second),
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

// Create enqueues a run of the kind with the labels. If the caller has such a run that is not ended, Create returns it
// with created false. A run is ended when its status is final. This can be before the engine ends its workflow. A
// completed run whose Job still keeps the result is not ended.
//
// The key of the workflow names the newest ended run of the kind and labels. So two creates at the same time make one
// run, and a create after an ended run makes a new run.
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
	labels[config.LabelKind] = request.Kind
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
	if err = s.queue.Join(Work{ID: run.ID, Kind: run.Kind, Caller: caller}, kind.MaxQueuedPerCaller); err != nil {
		return nil, false, err
	}
	result, err := s.engine.Enqueue(ctx, namespace, run.ID, enqueueRequest)
	switch {
	case errors.Is(err, engine.ErrConflict):
		// A create at the same time used another version of the kind, because the catalog changed between the two.
		return nil, false, ErrConflict
	case errors.Is(err, engine.ErrInvalid):
		// The operator built a workflow the engine does not accept, so a retry does not help.
		s.queue.Forget(run.ID)
		return nil, false, fmt.Errorf("enqueue the run workflow: %w", err)
	case err != nil:
		// If the engine stored the run, the run gets its place again at its first run.admit.
		s.queue.Forget(run.ID)
		return nil, false, fmt.Errorf("%w: %w", ErrUnavailable, err)
	}

	created, err := s.Get(ctx, caller, run.ID, 0)
	if err != nil {
		// The engine has the run, and a second create finds it. A workflow that the engine stored a moment ago is
		// queued.
		logging.FromContext(ctx).Info("Read a new run failed",
			string(telemetry.AttrSubjectID), run.ID, "error", err.Error())
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
	labels := map[string]string{config.LabelRunID: runID}
	workflows, err := client.FindByLabels(ctx, EngineNamespace(caller), labels, 1)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrUnavailable, err)
	}
	if len(workflows) == 0 {
		return nil, ErrNotFound
	}
	return &workflows[0], nil
}

func (s *Service) read(workflow *engine.Workflow) *record {
	found := readRun(workflow)
	if found.Status == StatusQueued {
		if position, ok := s.queue.Position(found.ID); ok {
			found.QueuePosition = &position
		}
	}
	return found
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
	// The run did not change, or the operator cannot tell. The caller asks again.
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
			string(telemetry.AttrSubjectID), workflow.Labels[config.LabelRunID], "error", err.Error())
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

// Upload forwards the caller's archive to the run's operator runner, which starts the command. size is -1 if the caller
// did not give it. A repeat succeeds, and the operator runner discards the second archive.
func (s *Service) Upload(ctx context.Context, caller, runID string, archive io.Reader, size int64) (*Run, error) {
	workflow, err := locate(ctx, s.engine, caller, runID)
	if err != nil {
		return nil, err
	}
	run := s.read(workflow)
	if run.Status != StatusAwaitingArchive {
		return nil, fmt.Errorf("%w: the run is %s", ErrNotAwaiting, run.Status)
	}

	if run.state.UploadBy != nil {
		// An archive that arrives after run.await-archive stops its wait starts the command of a failed run.
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, run.state.UploadBy.Sub(s.clock.Now()))
		defer cancel()
	}
	err = s.host.Start(ctx, run.state.pod(runID), run.state.Spec.Command, run.state.Spec.RunTimeout, archive, size)
	switch {
	case err == nil:
		return &run.Run, nil
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

// Result opens the result of a completed run at its operator runner. This call is the fetch. After it, the operator
// runner keeps the result only for a grace time. The caller must close the body. size is -1 if the operator runner did
// not give it.
func (s *Service) Result(ctx context.Context, caller, runID string) (io.ReadCloser, int64, error) {
	workflow, err := locate(ctx, s.engine, caller, runID)
	if err != nil {
		return nil, 0, err
	}
	run := readRun(workflow)
	switch {
	case !run.Status.Final():
		return nil, 0, ErrNotFinished
	case run.Status != StatusCompleted:
		detail := string(run.Status)
		if run.Error != nil {
			detail += ": " + run.Error.Detail
		}
		return nil, 0, fmt.Errorf("%w: the run is %s", ErrNoResult, detail)
	case !run.keepsResult():
		// run.cleanup deleted the Job.
		return nil, 0, ErrExpired
	}

	body, size, err := s.host.OpenResult(ctx, run.state.pod(runID))
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

// Cancel cancels the run's workflow and deletes its Job. canceled is false if the run ended before.
func (s *Service) Cancel(ctx context.Context, caller, runID string) (*Run, bool, error) {
	workflow, err := locate(ctx, s.engine, caller, runID)
	if err != nil {
		return nil, false, err
	}
	found := s.read(workflow)
	if found.Status.Final() {
		return &found.Run, false, nil
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

	// The engine stops its calls to the steps of the run, but the Job continues its command to the end. If this release
	// fails, the garbage collector deletes the Job.
	if err := release(ctx, s.queue, s.sandbox, found.state.Spec.Namespace, runID); err != nil {
		logging.Warn(logging.FromContext(ctx), "Could not release a canceled run",
			string(telemetry.AttrSubjectID), runID, "error", err.Error())
	}
	// The engine stored the cancel, so the run reads as canceled, or as running until its command ends.
	run, getErr := s.Get(ctx, caller, runID, 0)
	return run, true, getErr
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
