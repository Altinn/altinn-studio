package runs

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
)

const (
	// jobTTLAfterFinished lets Kubernetes delete a Job that the operator did not.
	jobTTLAfterFinished = int32(300)
)

// RunJob describes the Job of one run.
type RunJob struct {
	RunID  string
	Kind   string
	Caller string
}

// Labels are the labels of the Job and its pod.
func (r RunJob) Labels() map[string]string {
	return map[string]string{
		LabelName:      jobHostName,
		LabelManagedBy: ManagedBy,
		LabelRunID:     r.RunID,
		LabelRunKind:   r.Kind,
		LabelRunCaller: r.Caller,
	}
}

// BuildJob makes the Job of a run from the kind's PodTemplate. The admission policy in src/core/job-host/infra
// accepts a Job from the operator only when its pod spec and pod annotations equal the template's, so both are copied
// as they are, and only labels are added.
func BuildJob(template *corev1.PodTemplate, run RunJob, spec KindSpec) *batchv1.Job {
	// The pod may take the whole of run.await-pod's budget to be ready and run.await-archive's to receive the archive
	// before the command's own timeout starts. After the command, the job host keeps the result for the caller.
	// Config validation keeps the sum under the policy's maximum.
	deadline := min(
		config.PodBudget+config.UploadTimeout+spec.RunTimeout+config.ResultTimeout+config.ResultGrace+
			config.JobDeadlineSlack,
		config.MaxJobDeadline,
	)

	podLabels := maps.Clone(template.Template.Labels)
	if podLabels == nil {
		podLabels = make(map[string]string)
	}
	maps.Copy(podLabels, run.Labels())

	return &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      JobName(run.RunID),
			Namespace: template.Namespace,
			Labels:    run.Labels(),
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

// Kube is what the run steps read and change in Kubernetes.
type Kube struct {
	// Client reads Jobs and pods from the cache, which holds only the operator's Jobs and pods in the kind
	// namespaces.
	Client client.Client
	// Reader reads the PodTemplate from the API server, because the Role may only get it by name.
	Reader client.Reader
}

func (k *Kube) PodTemplate(ctx context.Context, spec KindSpec) (*corev1.PodTemplate, error) {
	var template corev1.PodTemplate
	key := client.ObjectKey{Namespace: spec.Namespace, Name: spec.PodTemplate}
	if err := k.Reader.Get(ctx, key, &template); err != nil {
		return nil, fmt.Errorf("get PodTemplate %s/%s: %w", spec.Namespace, spec.PodTemplate, err)
	}
	return &template, nil
}

// ActiveJobs lists the unfinished Jobs of a kind in a namespace. A finished Job holds no sandbox, even before it is
// deleted.
func (k *Kube) ActiveJobs(ctx context.Context, namespace, kind string) ([]JobRef, error) {
	var jobs batchv1.JobList
	err := k.Client.List(ctx, &jobs, client.InNamespace(namespace),
		client.MatchingLabels{LabelManagedBy: ManagedBy, LabelRunKind: kind})
	if err != nil {
		return nil, fmt.Errorf("list run Jobs: %w", err)
	}
	refs := make([]JobRef, 0, len(jobs.Items))
	for i := range jobs.Items {
		job := &jobs.Items[i]
		if jobFinished(job) {
			continue
		}
		refs = append(refs, JobRef{RunID: job.Labels[LabelRunID], Caller: job.Labels[LabelRunCaller]})
	}
	return refs, nil
}

// ManagedJobs lists every run Job in a namespace.
func (k *Kube) ManagedJobs(ctx context.Context, namespace string) ([]batchv1.Job, error) {
	var jobs batchv1.JobList
	err := k.Client.List(ctx, &jobs, client.InNamespace(namespace), client.MatchingLabels{LabelManagedBy: ManagedBy})
	if err != nil {
		return nil, fmt.Errorf("list run Jobs: %w", err)
	}
	return jobs.Items, nil
}

func (k *Kube) Job(ctx context.Context, namespace, runID string) (*batchv1.Job, error) {
	var job batchv1.Job
	if err := k.Client.Get(ctx, client.ObjectKey{Namespace: namespace, Name: JobName(runID)}, &job); err != nil {
		return nil, fmt.Errorf("get Job: %w", err)
	}
	return &job, nil
}

// JobPods lists the pods of a run's Job, the newest first.
func (k *Kube) JobPods(ctx context.Context, namespace, runID string) ([]corev1.Pod, error) {
	var pods corev1.PodList
	err := k.Client.List(ctx, &pods, client.InNamespace(namespace),
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

// DeleteJob deletes a run's Job and, in the background, its pod. A missing Job is fine.
func (k *Kube) DeleteJob(ctx context.Context, namespace, runID string) error {
	job := &batchv1.Job{ObjectMeta: metav1.ObjectMeta{Namespace: namespace, Name: JobName(runID)}}
	err := k.Client.Delete(ctx, job, client.PropagationPolicy(metav1.DeletePropagationBackground))
	if err != nil && !apierrors.IsNotFound(err) {
		return fmt.Errorf("delete Job %s/%s: %w", namespace, job.Name, err)
	}
	return nil
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
