package kube

import (
	"context"
	"errors"
	"fmt"
	"maps"
	"sort"
	"strings"
	"time"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/sandbox"
)

// The labels of run Jobs and their pods. The cache, the garbage collector and the queue find Jobs by them.
const (
	LabelName      = "app.kubernetes.io/name"
	LabelManagedBy = "app.kubernetes.io/managed-by"
	LabelRunID     = "altinn.studio/run-id"
	LabelRunKind   = "altinn.studio/run-kind"
	LabelRunCaller = "altinn.studio/run-caller"
	// LabelJobName is the label that the Job controller puts on the pods of a Job.
	LabelJobName = "batch.kubernetes.io/job-name"

	jobHostName = "job-host"
	ManagedBy   = "core-operator"

	// jobTTLAfterFinished lets Kubernetes delete a Job that the operator did not.
	jobTTLAfterFinished = int32(300)
)

// JobName is the name of a run's Job.
func JobName(runID string) string {
	return "run-" + runID
}

// jobLabels are the labels of a run's Job and its pod.
func jobLabels(job sandbox.Job) map[string]string {
	return map[string]string{
		LabelName:      jobHostName,
		LabelManagedBy: ManagedBy,
		LabelRunID:     job.RunID,
		LabelRunKind:   job.Kind,
		LabelRunCaller: job.Caller,
	}
}

// BuildJob makes the Job of a run from the kind's PodTemplate. The admission policy in src/core/job-host/infra
// accepts a Job from the operator only when its pod spec and pod annotations equal the template's, so both are copied
// as they are, and only labels are added.
func BuildJob(template *corev1.PodTemplate, job sandbox.Job) *batchv1.Job {
	// The pod may take the whole of run.await-pod's budget to be ready and run.await-archive's to receive the archive
	// before the command's own timeout starts. After the command, the job host keeps the result for the caller.
	// Config validation keeps the sum under the policy's maximum.
	deadline := min(
		config.PodBudget+config.UploadTimeout+job.RunTimeout+config.ResultTimeout+config.ResultGrace+
			config.JobDeadlineSlack,
		config.MaxJobDeadline,
	)

	podLabels := maps.Clone(template.Template.Labels)
	if podLabels == nil {
		podLabels = make(map[string]string)
	}
	maps.Copy(podLabels, jobLabels(job))

	return &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      JobName(job.RunID),
			Namespace: template.Namespace,
			Labels:    jobLabels(job),
		},
		Spec: batchv1.JobSpec{
			BackoffLimit:            new(int32(0)),
			ActiveDeadlineSeconds:   new(int64(deadline / time.Second)),
			TTLSecondsAfterFinished: new(jobTTLAfterFinished),
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels:      podLabels,
					Annotations: maps.Clone(template.Template.Annotations),
				},
				Spec: *template.Template.Spec.DeepCopy(),
			},
		},
	}
}

// Sandbox runs the Jobs of runs on Kubernetes.
type Sandbox struct {
	// Client reads Jobs and pods from the cache, which holds only the operator's Jobs and pods in the kind
	// namespaces.
	Client client.Client
	// Reader reads the PodTemplate from the API server, because the Role may only get it by name.
	Reader client.Reader
}

var _ sandbox.Sandbox = (*Sandbox)(nil)

// CreateJob creates the run's Job from its kind's PodTemplate.
func (s *Sandbox) CreateJob(ctx context.Context, job sandbox.Job) error {
	var template corev1.PodTemplate
	key := client.ObjectKey{Namespace: job.Namespace, Name: job.Template}
	if err := s.Reader.Get(ctx, key, &template); err != nil {
		return fmt.Errorf("get PodTemplate %s/%s: %w", job.Namespace, job.Template, err)
	}
	err := s.Client.Create(ctx, BuildJob(&template, job))
	switch {
	case err == nil || apierrors.IsAlreadyExists(err):
		return nil
	case isQuotaExceeded(err):
		return fmt.Errorf("%w: %w", sandbox.ErrQuotaFull, err)
	case isAdmissionDenial(err):
		return fmt.Errorf("%w: %w", sandbox.ErrNotAdmitted, err)
	case apierrors.IsInvalid(err) || apierrors.IsForbidden(err) || apierrors.IsBadRequest(err):
		return fmt.Errorf("%w: %w", sandbox.ErrRefused, err)
	default:
		return fmt.Errorf("create Job: %w", err)
	}
}

// Pod returns the state of the newest pod of the run's Job, or of the Job while it has no pod.
func (s *Sandbox) Pod(ctx context.Context, namespace, runID string) (sandbox.Pod, error) {
	pods, err := s.jobPods(ctx, namespace, runID)
	if err != nil {
		return sandbox.Pod{}, err
	}
	if len(pods) == 0 {
		return s.jobWithoutPod(ctx, namespace, runID)
	}
	pod := &pods[0]
	switch {
	case podEnded(pod):
		return sandbox.Pod{Status: sandbox.PodEnded, Detail: pod.Name + " is " + string(pod.Status.Phase)}, nil
	case podReady(pod):
		return sandbox.Pod{Status: sandbox.PodReady, IP: pod.Status.PodIP}, nil
	case podUnschedulable(pod):
		return sandbox.Pod{Status: sandbox.PodUnschedulable}, nil
	default:
		return sandbox.Pod{Status: sandbox.PodStarting}, nil
	}
}

// jobWithoutPod tells a Job whose pod the Job controller has not created yet from one that failed without a pod, and
// from one that the cache has not seen yet.
func (s *Sandbox) jobWithoutPod(ctx context.Context, namespace, runID string) (sandbox.Pod, error) {
	var job batchv1.Job
	err := s.Client.Get(ctx, client.ObjectKey{Namespace: namespace, Name: JobName(runID)}, &job)
	switch {
	case apierrors.IsNotFound(err):
		return sandbox.Pod{Status: sandbox.JobUnseen}, nil
	case err != nil:
		return sandbox.Pod{}, fmt.Errorf("get Job: %w", err)
	}
	if reason, failed := jobFailure(&job); failed {
		return sandbox.Pod{Status: sandbox.JobFailed, Detail: reason}, nil
	}
	return sandbox.Pod{Status: sandbox.PodNone}, nil
}

// PodGone reports whether the pod at ip has stopped, is being deleted or has disappeared.
func (s *Sandbox) PodGone(ctx context.Context, namespace, runID, ip string) (bool, error) {
	pods, err := s.jobPods(ctx, namespace, runID)
	if err != nil {
		return false, err
	}
	for i := range pods {
		if pods[i].Status.PodIP == ip {
			return podEnded(&pods[i]) || pods[i].DeletionTimestamp != nil, nil
		}
	}
	return true, nil
}

// ActiveJobs lists the unfinished Jobs of a kind in a namespace.
func (s *Sandbox) ActiveJobs(ctx context.Context, namespace, kind string) ([]sandbox.Ref, error) {
	jobs, err := s.list(ctx, namespace, client.MatchingLabels{LabelManagedBy: ManagedBy, LabelRunKind: kind})
	if err != nil {
		return nil, err
	}
	refs := make([]sandbox.Ref, 0, len(jobs))
	for i := range jobs {
		if !jobFinished(&jobs[i]) {
			refs = append(refs, refOf(&jobs[i]))
		}
	}
	return refs, nil
}

// Jobs lists every run Job in a namespace.
func (s *Sandbox) Jobs(ctx context.Context, namespace string) ([]sandbox.Ref, error) {
	jobs, err := s.list(ctx, namespace, client.MatchingLabels{LabelManagedBy: ManagedBy})
	if err != nil {
		return nil, err
	}
	refs := make([]sandbox.Ref, 0, len(jobs))
	for i := range jobs {
		refs = append(refs, refOf(&jobs[i]))
	}
	return refs, nil
}

// DeleteJob deletes a run's Job and, in the background, its pod. A missing Job is fine.
func (s *Sandbox) DeleteJob(ctx context.Context, namespace, runID string) error {
	job := &batchv1.Job{ObjectMeta: metav1.ObjectMeta{Namespace: namespace, Name: JobName(runID)}}
	err := s.Client.Delete(ctx, job, client.PropagationPolicy(metav1.DeletePropagationBackground))
	if err != nil && !apierrors.IsNotFound(err) {
		return fmt.Errorf("delete Job %s/%s: %w", namespace, job.Name, err)
	}
	return nil
}

func (s *Sandbox) list(ctx context.Context, namespace string, labels client.MatchingLabels) ([]batchv1.Job, error) {
	var jobs batchv1.JobList
	if err := s.Client.List(ctx, &jobs, client.InNamespace(namespace), labels); err != nil {
		return nil, fmt.Errorf("list run Jobs: %w", err)
	}
	return jobs.Items, nil
}

// jobPods lists the pods of a run's Job, the newest first.
func (s *Sandbox) jobPods(ctx context.Context, namespace, runID string) ([]corev1.Pod, error) {
	var pods corev1.PodList
	err := s.Client.List(ctx, &pods, client.InNamespace(namespace),
		client.MatchingLabels{LabelManagedBy: ManagedBy, LabelJobName: JobName(runID)})
	if err != nil {
		return nil, fmt.Errorf("list run pods: %w", err)
	}
	items := pods.Items
	sort.SliceStable(items, func(i, j int) bool {
		return items[i].CreationTimestamp.After(items[j].CreationTimestamp.Time)
	})
	return items, nil
}

func refOf(job *batchv1.Job) sandbox.Ref {
	return sandbox.Ref{RunID: job.Labels[LabelRunID], Caller: job.Labels[LabelRunCaller]}
}

func jobFinished(job *batchv1.Job) bool {
	for _, condition := range job.Status.Conditions {
		if (condition.Type == batchv1.JobComplete || condition.Type == batchv1.JobFailed) &&
			condition.Status == corev1.ConditionTrue {
			return true
		}
	}
	return false
}

func jobFailure(job *batchv1.Job) (string, bool) {
	for _, condition := range job.Status.Conditions {
		if condition.Type == batchv1.JobFailed && condition.Status == corev1.ConditionTrue {
			return strings.TrimSpace(condition.Reason + " " + condition.Message), true
		}
	}
	return "", false
}

func podReady(pod *corev1.Pod) bool {
	if pod.Status.PodIP == "" || pod.DeletionTimestamp != nil {
		return false
	}
	for _, condition := range pod.Status.Conditions {
		if condition.Type == corev1.PodReady {
			return condition.Status == corev1.ConditionTrue
		}
	}
	return false
}

func podUnschedulable(pod *corev1.Pod) bool {
	for _, condition := range pod.Status.Conditions {
		if condition.Type == corev1.PodScheduled && condition.Status == corev1.ConditionFalse &&
			condition.Reason == corev1.PodReasonUnschedulable {
			return true
		}
	}
	return false
}

func podEnded(pod *corev1.Pod) bool {
	return pod.Status.Phase == corev1.PodFailed || pod.Status.Phase == corev1.PodSucceeded
}

// isAdmissionDenial reports whether an admission policy or webhook refused a request. The API server answers 422 for
// a policy, as for an invalid object, so only the message tells them apart.
func isAdmissionDenial(err error) bool {
	var status apierrors.APIStatus
	if !errors.As(err, &status) {
		return false
	}
	message := status.Status().Message
	return strings.Contains(message, "ValidatingAdmissionPolicy") || strings.Contains(message, "admission webhook")
}

// isQuotaExceeded reports whether the API server refused a create because of a ResourceQuota, which frees up when
// other runs finish.
func isQuotaExceeded(err error) bool {
	return apierrors.IsForbidden(err) && strings.Contains(err.Error(), "exceeded quota")
}
