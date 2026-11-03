// Package sandboxtest is a sandbox in memory, for the tests of the run steps. A test sets the state of each run's pod.
package sandboxtest

import (
	"context"
	"sync"

	"altinn.studio/core-operator/internal/sandbox"
)

type job struct {
	spec     sandbox.Job
	pod      sandbox.Pod
	finished bool
}

type Sandbox struct {
	jobs map[string]*job
	// CreateErr makes CreateJob fail with it, such as sandbox.ErrQuotaFull.
	CreateErr error
	// FailReads makes the reads fail.
	FailReads error
	mu        sync.Mutex
}

var _ sandbox.Sandbox = (*Sandbox)(nil)

func New() *Sandbox {
	return &Sandbox{jobs: make(map[string]*job)}
}

func key(namespace, runID string) string {
	return namespace + "/" + runID
}

func (s *Sandbox) CreateJob(_ context.Context, spec sandbox.Job) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.CreateErr != nil {
		return s.CreateErr
	}
	if _, ok := s.jobs[key(spec.Namespace, spec.RunID)]; !ok {
		s.jobs[key(spec.Namespace, spec.RunID)] = &job{spec: spec, pod: sandbox.Pod{Status: sandbox.PodNone}}
	}
	return nil
}

func (s *Sandbox) Pod(_ context.Context, namespace, runID string) (sandbox.Pod, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.FailReads != nil {
		return sandbox.Pod{}, s.FailReads
	}
	found, ok := s.jobs[key(namespace, runID)]
	if !ok {
		return sandbox.Pod{Status: sandbox.JobUnseen}, nil
	}
	return found.pod, nil
}

func (s *Sandbox) PodGone(_ context.Context, namespace, runID, ip string) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.FailReads != nil {
		return false, s.FailReads
	}
	found, ok := s.jobs[key(namespace, runID)]
	if !ok || found.pod.IP != ip {
		return true, nil
	}
	return found.pod.Status == sandbox.PodEnded, nil
}

func (s *Sandbox) ActiveJobs(_ context.Context, namespace, kind string) ([]sandbox.Ref, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.FailReads != nil {
		return nil, s.FailReads
	}
	var refs []sandbox.Ref
	for _, found := range s.jobs {
		if found.spec.Namespace == namespace && found.spec.Kind == kind && !found.finished {
			refs = append(refs, sandbox.Ref{RunID: found.spec.RunID, Caller: found.spec.Caller})
		}
	}
	return refs, nil
}

func (s *Sandbox) Jobs(_ context.Context, namespace string) ([]sandbox.Ref, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.FailReads != nil {
		return nil, s.FailReads
	}
	var refs []sandbox.Ref
	for _, found := range s.jobs {
		if found.spec.Namespace == namespace {
			refs = append(refs, sandbox.Ref{RunID: found.spec.RunID, Caller: found.spec.Caller})
		}
	}
	return refs, nil
}

func (s *Sandbox) DeleteJob(_ context.Context, namespace, runID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.jobs, key(namespace, runID))
	return nil
}

// Add adds a Job that the steps did not create, such as one whose run the engine has forgotten.
func (s *Sandbox) Add(spec sandbox.Job) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.jobs[key(spec.Namespace, spec.RunID)] = &job{spec: spec, pod: sandbox.Pod{Status: sandbox.PodNone}}
}

// SetPod sets the state of the pod of a run's Job.
func (s *Sandbox) SetPod(namespace, runID string, pod sandbox.Pod) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if found, ok := s.jobs[key(namespace, runID)]; ok {
		found.pod = pod
		found.finished = pod.Status == sandbox.PodEnded || pod.Status == sandbox.JobFailed
	}
}

// Job returns a run's Job, and whether it exists.
func (s *Sandbox) Job(namespace, runID string) (sandbox.Job, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	found, ok := s.jobs[key(namespace, runID)]
	if !ok {
		return sandbox.Job{}, false
	}
	return found.spec, true
}
