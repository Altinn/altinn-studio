// Package sandbox is the contract between the run steps and the place where a run's command runs: a Job with an
// operator runner in its pod. The steps know nothing of where that is. internal/kube runs it on Kubernetes, and
// sandboxtest in memory, for the tests of the steps.
package sandbox

import (
	"context"
	"errors"
	"time"
)

var (
	// ErrQuotaFull means the sandbox has no room for the Job now. Room frees up when other runs end.
	ErrQuotaFull = errors.New("the sandbox quota is full")
	// ErrNotAdmitted means the sandbox's admission policy refused the Job. It compares the Job with a template that it
	// caches, so a refusal during a rollout of the template can pass a moment later.
	ErrNotAdmitted = errors.New("the sandbox's admission policy refused the Job")
	// ErrRefused means the sandbox refuses the Job, and a repeat gets the same answer.
	ErrRefused = errors.New("the sandbox refused the Job")
)

// Job is a run's Job: what the sandbox needs to start the operator runner for the run.
type Job struct {
	RunID  string
	Kind   string
	Caller string
	// Namespace holds the template and the Job.
	Namespace string
	// Template names the template of the Job's pod.
	Template string
	// RunTimeout is how long the command may run. The Job's own deadline must not come before it.
	RunTimeout time.Duration
}

// Ref names a run whose Job exists.
type Ref struct {
	RunID  string
	Caller string
}

// PodStatus is the state of a run's pod, as the steps tell the run's status from it.
type PodStatus int

const (
	// JobUnseen means the sandbox does not know the Job yet, such as right after its create.
	JobUnseen PodStatus = iota
	// JobFailed means the Job failed before it had a pod that ran. Detail says why.
	JobFailed
	// PodNone means the Job exists and has no pod yet.
	PodNone
	// PodStarting means the pod is on its way to ready.
	PodStarting
	// PodUnschedulable means no node has room for the pod now.
	PodUnschedulable
	// PodReady means the operator runner answers at IP.
	PodReady
	// PodEnded means the pod stopped. Detail names it and its phase.
	PodEnded
)

// Pod is the state of a run's pod.
type Pod struct {
	IP     string
	Detail string
	Status PodStatus
}

// Sandbox starts, watches and deletes the Jobs of runs. Each method is safe to call again with the same arguments.
type Sandbox interface {
	// CreateJob creates the run's Job. A Job that exists already is success. The errors ErrQuotaFull, ErrNotAdmitted
	// and ErrRefused tell why the sandbox did not take the Job.
	CreateJob(ctx context.Context, job Job) error
	// Pod returns the state of the newest pod of the run's Job.
	Pod(ctx context.Context, namespace, runID string) (Pod, error)
	// PodGone reports whether the pod at ip has stopped or disappeared, so its operator runner can never answer.
	PodGone(ctx context.Context, namespace, runID, ip string) (bool, error)
	// ActiveJobs lists the Jobs of a kind that have not finished. A finished Job holds no room, even before it is
	// deleted.
	ActiveJobs(ctx context.Context, namespace, kind string) ([]Ref, error)
	// Jobs lists every run Job in a namespace.
	Jobs(ctx context.Context, namespace string) ([]Ref, error)
	// DeleteJob deletes a run's Job and its pod. A missing Job is fine.
	DeleteJob(ctx context.Context, namespace, runID string) error
}
