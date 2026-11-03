package kube

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	. "github.com/onsi/gomega"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/client/interceptor"

	"altinn.studio/core-operator/internal/sandbox"
)

const (
	testNamespace = "sandbox-runs"
	testRunID     = "4e1f6a52-5f0b-5d3e-9a4b-2c7d8e9f0a1b"
)

var (
	errQuota = errors.New(
		"exceeded quota: sandbox-runs, requested: count/jobs.batch=1, limited: count/jobs.batch=2",
	)
	errNoPermission = errors.New("the Role does not allow it")
)

// testJob is the Job of a run of upgrade-v9 for the assistant, with a run timeout of 660 s.
func testJob(runID string) sandbox.Job {
	return sandbox.Job{
		RunID:      runID,
		Kind:       "upgrade-v9",
		Caller:     "assistant",
		Namespace:  testNamespace,
		Template:   "job-host",
		RunTimeout: 660 * time.Second,
	}
}

func testPodTemplate() *corev1.PodTemplate {
	return &corev1.PodTemplate{
		ObjectMeta: metav1.ObjectMeta{Name: "job-host", Namespace: testNamespace},
		Template: corev1.PodTemplateSpec{
			ObjectMeta: metav1.ObjectMeta{
				Labels:      map[string]string{LabelName: jobHostName},
				Annotations: map[string]string{"cluster-autoscaler.kubernetes.io/safe-to-evict": "false"},
			},
			Spec: corev1.PodSpec{
				RestartPolicy: corev1.RestartPolicyNever,
				Containers:    []corev1.Container{{Name: "job-host", Image: "job-host:1"}},
			},
		},
	}
}

// policyDenial is the error the API server gives when the admission policy refuses a Job, as the envtest shows.
func policyDenial(name string) error {
	cause := "ValidatingAdmissionPolicy 'sandbox-run-jobs' with binding 'sandbox-run-jobs' denied request: " +
		"The pod spec of the Job must be the pod spec of the PodTemplate job-host."
	return &apierrors.StatusError{ErrStatus: metav1.Status{
		Status:  metav1.StatusFailure,
		Code:    http.StatusUnprocessableEntity,
		Reason:  metav1.StatusReasonInvalid,
		Message: `jobs.batch "` + name + `" is forbidden: ` + cause,
		Details: &metav1.StatusDetails{
			Name: name, Group: "batch", Kind: "jobs", Causes: []metav1.StatusCause{{Message: cause}},
		},
	}}
}

// newSandbox is a sandbox on a fake API server with the PodTemplate. createErr, when set, answers every create.
func newSandbox(createErr error) (*Sandbox, client.Client) {
	builder := fake.NewClientBuilder().WithScheme(clientgoscheme.Scheme).WithObjects(testPodTemplate())
	if createErr != nil {
		builder.WithInterceptorFuncs(interceptor.Funcs{
			Create: func(_ context.Context, _ client.WithWatch, _ client.Object, _ ...client.CreateOption) error {
				return createErr
			},
		})
	}
	k8s := builder.Build()
	return &Sandbox{Client: k8s, Reader: k8s}, k8s
}

func TestBuildJobCopiesThePodTemplate(t *testing.T) {
	RegisterTestingT(t)
	template := testPodTemplate()
	run := testJob(testRunID)

	job := BuildJob(template, run)

	Expect(job.Name).To(Equal(JobName(run.RunID)))
	Expect(job.Namespace).To(Equal(testNamespace))
	Expect(job.Spec.Template.Spec).To(Equal(template.Template.Spec))
	Expect(job.Spec.Template.Annotations).To(Equal(template.Template.Annotations))
	labels := map[string]string{
		LabelName:      "job-host",
		LabelManagedBy: "core-operator",
		LabelRunID:     run.RunID,
		LabelRunKind:   "upgrade-v9",
		LabelRunCaller: "assistant",
	}
	Expect(job.Labels).To(Equal(labels))
	Expect(job.Spec.Template.Labels).To(Equal(labels))
	Expect(*job.Spec.BackoffLimit).To(BeZero())
	// The pod may take 5 minutes to be ready and the archive 5 to arrive before the run timeout of 660 s starts, and
	// the job host then keeps the result for 5 minutes and a grace of 30 seconds.
	Expect(*job.Spec.ActiveDeadlineSeconds).To(Equal(int64(1650)))
	Expect(*job.Spec.TTLSecondsAfterFinished).To(Equal(int32(300)))

	// The Job must not share the template's maps or slices.
	job.Spec.Template.Spec.Containers[0].Image = "changed"
	job.Spec.Template.Annotations["x"] = "y"
	Expect(template.Template.Spec.Containers[0].Image).To(Equal("job-host:1"))
	Expect(template.Template.Annotations).NotTo(HaveKey("x"))

	run.RunTimeout = 60 * time.Second
	Expect(*BuildJob(template, run).Spec.ActiveDeadlineSeconds).To(Equal(int64(300 + 300 + 60 + 300 + 30 + 60)))
}

func TestBuildJobWorksWithoutTemplateLabels(t *testing.T) {
	RegisterTestingT(t)
	job := BuildJob(&corev1.PodTemplate{}, testJob("r"))
	Expect(job.Spec.Template.Labels).To(HaveKeyWithValue(LabelRunID, "r"))
	Expect(job.Spec.Template.Annotations).To(BeNil())
}

func TestCreateJobTellsWhyTheAPIServerRefusedIt(t *testing.T) {
	cases := map[string]struct {
		err  error
		want error
	}{
		"a full quota": {
			err:  apierrors.NewForbidden(schema.GroupResource{Group: "batch", Resource: "jobs"}, "run", errQuota),
			want: sandbox.ErrQuotaFull,
		},
		"the admission policy": {err: policyDenial("run"), want: sandbox.ErrNotAdmitted},
		"an invalid Job": {
			err:  apierrors.NewInvalid(schema.GroupKind{Group: "batch", Kind: "Job"}, "run", nil),
			want: sandbox.ErrRefused,
		},
		"no permission": {
			err: apierrors.NewForbidden(
				schema.GroupResource{Group: "batch", Resource: "jobs"},
				"run",
				errNoPermission,
			),
			want: sandbox.ErrRefused,
		},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			RegisterTestingT(t)
			box, _ := newSandbox(c.err)
			Expect(box.CreateJob(t.Context(), testJob(testRunID))).To(MatchError(c.want))
		})
	}

	t.Run("an API server that does not answer", func(t *testing.T) {
		RegisterTestingT(t)
		box, _ := newSandbox(apierrors.NewServiceUnavailable("down"))
		err := box.CreateJob(t.Context(), testJob(testRunID))
		Expect(err).To(HaveOccurred())
		for _, known := range []error{sandbox.ErrQuotaFull, sandbox.ErrNotAdmitted, sandbox.ErrRefused} {
			Expect(errors.Is(err, known)).To(BeFalse(), "%v", known)
		}
	})
}

func TestCreateJobTakesAnExistingJobAsCreated(t *testing.T) {
	RegisterTestingT(t)
	box, k8s := newSandbox(nil)

	Expect(box.CreateJob(t.Context(), testJob(testRunID))).To(Succeed())
	Expect(box.CreateJob(t.Context(), testJob(testRunID))).To(Succeed())
	var job batchv1.Job
	Expect(k8s.Get(t.Context(), client.ObjectKey{Namespace: testNamespace, Name: JobName(testRunID)}, &job)).
		To(Succeed())
}

// addPod adds the pod p of the run's Job.
func addPod(t *testing.T, k8s client.Client, phase corev1.PodPhase, conditions ...corev1.PodCondition) {
	t.Helper()
	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "p",
			Namespace: testNamespace,
			Labels:    map[string]string{LabelJobName: JobName(testRunID), LabelManagedBy: ManagedBy},
		},
		Spec:   corev1.PodSpec{Containers: []corev1.Container{{Name: "job-host", Image: "job-host:1"}}},
		Status: corev1.PodStatus{Phase: phase, PodIP: "10.0.0.7", Conditions: conditions},
	}
	if err := k8s.Create(t.Context(), pod); err != nil {
		t.Fatal(err)
	}
}

func TestPodTellsTheStateOfTheRunsPod(t *testing.T) {
	ready := corev1.PodCondition{Type: corev1.PodReady, Status: corev1.ConditionTrue}
	unschedulable := corev1.PodCondition{
		Type: corev1.PodScheduled, Status: corev1.ConditionFalse, Reason: corev1.PodReasonUnschedulable,
	}
	cases := map[string]struct {
		setup func(t *testing.T, box *Sandbox, k8s client.Client)
		want  sandbox.Pod
	}{
		"no Job": {setup: func(*testing.T, *Sandbox, client.Client) {}, want: sandbox.Pod{Status: sandbox.JobUnseen}},
		"a Job without a pod": {
			setup: func(t *testing.T, box *Sandbox, _ client.Client) {
				t.Helper()
				Expect(box.CreateJob(t.Context(), testJob(testRunID))).To(Succeed())
			},
			want: sandbox.Pod{Status: sandbox.PodNone},
		},
		"a Job that failed without a pod": {
			setup: func(t *testing.T, box *Sandbox, k8s client.Client) {
				t.Helper()
				Expect(box.CreateJob(t.Context(), testJob(testRunID))).To(Succeed())
				var job batchv1.Job
				Expect(k8s.Get(t.Context(), client.ObjectKey{Namespace: testNamespace, Name: JobName(testRunID)},
					&job)).To(Succeed())
				job.Status.Conditions = []batchv1.JobCondition{{
					Type: batchv1.JobFailed, Status: corev1.ConditionTrue, Reason: "DeadlineExceeded",
				}}
				Expect(k8s.Status().Update(t.Context(), &job)).To(Succeed())
			},
			want: sandbox.Pod{Status: sandbox.JobFailed, Detail: "DeadlineExceeded"},
		},
		"a pod that starts": {
			setup: func(t *testing.T, _ *Sandbox, k8s client.Client) {
				t.Helper()
				addPod(t, k8s, corev1.PodPending)
			},
			want: sandbox.Pod{Status: sandbox.PodStarting},
		},
		"a pod without a node": {
			setup: func(t *testing.T, _ *Sandbox, k8s client.Client) {
				t.Helper()
				addPod(t, k8s, corev1.PodPending, unschedulable)
			},
			want: sandbox.Pod{Status: sandbox.PodUnschedulable},
		},
		"a ready pod": {
			setup: func(t *testing.T, _ *Sandbox, k8s client.Client) {
				t.Helper()
				addPod(t, k8s, corev1.PodRunning, ready)
			},
			want: sandbox.Pod{Status: sandbox.PodReady, IP: "10.0.0.7"},
		},
		"a pod that failed": {
			setup: func(t *testing.T, _ *Sandbox, k8s client.Client) {
				t.Helper()
				addPod(t, k8s, corev1.PodFailed)
			},
			want: sandbox.Pod{Status: sandbox.PodEnded, Detail: "p is Failed"},
		},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			RegisterTestingT(t)
			box, k8s := newSandbox(nil)
			c.setup(t, box, k8s)
			pod, err := box.Pod(t.Context(), testNamespace, testRunID)
			Expect(err).NotTo(HaveOccurred())
			Expect(pod).To(Equal(c.want))
		})
	}
}

func TestPodGoneOnceThePodHasEndedOrDisappeared(t *testing.T) {
	RegisterTestingT(t)
	box, k8s := newSandbox(nil)
	ctx := t.Context()

	Expect(box.PodGone(ctx, testNamespace, testRunID, "10.0.0.7")).To(BeTrue(), "no pod")
	addPod(t, k8s, corev1.PodRunning)
	Expect(box.PodGone(ctx, testNamespace, testRunID, "10.0.0.7")).To(BeFalse())
	Expect(box.PodGone(ctx, testNamespace, testRunID, "10.0.0.8")).To(BeTrue(), "another pod's address")

	var pod corev1.Pod
	Expect(k8s.Get(ctx, client.ObjectKey{Namespace: testNamespace, Name: "p"}, &pod)).To(Succeed())
	pod.Status.Phase = corev1.PodSucceeded
	Expect(k8s.Status().Update(ctx, &pod)).To(Succeed())
	Expect(box.PodGone(ctx, testNamespace, testRunID, "10.0.0.7")).To(BeTrue(), "an ended pod")
}

func TestJobsListsTheRunJobsAndActiveJobsTheUnfinished(t *testing.T) {
	RegisterTestingT(t)
	box, k8s := newSandbox(nil)
	ctx := t.Context()

	running := testJob("11111111-1111-1111-1111-111111111111")
	finished := testJob("22222222-2222-2222-2222-222222222222")
	other := testJob("33333333-3333-3333-3333-333333333333")
	other.Kind, other.Caller = "other-kind", "designer"
	for _, job := range []sandbox.Job{running, finished, other} {
		Expect(box.CreateJob(ctx, job)).To(Succeed())
	}
	var job batchv1.Job
	Expect(k8s.Get(ctx, client.ObjectKey{Namespace: testNamespace, Name: JobName(finished.RunID)}, &job)).To(Succeed())
	job.Status.Conditions = []batchv1.JobCondition{{Type: batchv1.JobComplete, Status: corev1.ConditionTrue}}
	Expect(k8s.Status().Update(ctx, &job)).To(Succeed())

	active, err := box.ActiveJobs(ctx, testNamespace, "upgrade-v9")
	Expect(err).NotTo(HaveOccurred())
	Expect(active).To(ConsistOf(sandbox.Ref{RunID: running.RunID, Caller: "assistant"}))
	all, err := box.Jobs(ctx, testNamespace)
	Expect(err).NotTo(HaveOccurred())
	Expect(all).To(ConsistOf(
		sandbox.Ref{RunID: running.RunID, Caller: "assistant"},
		sandbox.Ref{RunID: finished.RunID, Caller: "assistant"},
		sandbox.Ref{RunID: other.RunID, Caller: "designer"},
	))

	Expect(box.DeleteJob(ctx, testNamespace, running.RunID)).To(Succeed())
	Expect(box.DeleteJob(ctx, testNamespace, running.RunID)).To(Succeed(), "a missing Job")
	all, err = box.Jobs(ctx, testNamespace)
	Expect(err).NotTo(HaveOccurred())
	Expect(all).To(HaveLen(2))
}
