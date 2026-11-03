package kube

import (
	"bytes"
	"errors"
	"io"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/google/uuid"
	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	utilyaml "k8s.io/apimachinery/pkg/util/yaml"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/envtest"

	"altinn.studio/core-operator/internal/config"
)

// operatorUser is the user name of the operator's ServiceAccount, which the admission policy matches on.
const operatorUser = "system:serviceaccount:core-operator:core-operator"

// jobHostInfra is the job host's namespace, PodTemplate, Role and admission policy, as they are deployed.
var jobHostInfra = filepath.Join("..", "..", "..", "job-host", "infra", "kustomize", "base")

// envtestAssets finds the binaries of envtest: KUBEBUILDER_ASSETS, as make test sets it, or what make setup-envtest
// downloaded into bin/k8s, for a run from an IDE.
func envtestAssets() string {
	if dir := os.Getenv("KUBEBUILDER_ASSETS"); dir != "" {
		return dir
	}
	entries, err := os.ReadDir(filepath.Join("..", "..", "bin", "k8s"))
	if err != nil {
		return ""
	}
	for _, entry := range entries {
		if entry.IsDir() {
			return filepath.Join("..", "..", "bin", "k8s", entry.Name())
		}
	}
	return ""
}

// applyFile creates the objects of a manifest file of the job host's infra.
func applyFile(t *testing.T, c client.Client, name string) {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(jobHostInfra, name))
	if err != nil {
		t.Fatal(err)
	}
	decoder := utilyaml.NewYAMLOrJSONDecoder(bytes.NewReader(data), 4096)
	for {
		object := &unstructured.Unstructured{}
		if err := decoder.Decode(&object.Object); err != nil {
			if errors.Is(err, io.EOF) {
				return
			}
			t.Fatal(err)
		}
		if len(object.Object) == 0 {
			continue
		}
		if err := c.Create(t.Context(), object); err != nil {
			t.Fatalf("create %s %s: %v", object.GetKind(), object.GetName(), err)
		}
	}
}

// The admission policy in src/core/job-host/infra lets the operator create only Jobs whose pod is the PodTemplate's.
// This test runs the policy in a real API server, so a change to BuildJob or to the template that would make every
// run fail shows here first.
func TestAdmissionPolicyAcceptsTheJobsTheOperatorBuilds(t *testing.T) {
	RegisterTestingT(t)
	assets := envtestAssets()
	if assets == "" {
		t.Skip("envtest binaries not found: run make test, or make setup-envtest first")
	}

	environment := &envtest.Environment{BinaryAssetsDirectory: assets}
	admin, err := environment.Start()
	Expect(err).NotTo(HaveOccurred())
	t.Cleanup(func() {
		if stopErr := environment.Stop(); stopErr != nil {
			t.Error(stopErr)
		}
	})
	adminClient, err := client.New(admin, client.Options{Scheme: clientgoscheme.Scheme})
	Expect(err).NotTo(HaveOccurred())

	for _, name := range []string{
		"namespace.yaml", "podtemplate.yaml", "role.yaml", "rolebinding.yaml", "admission-policy.yaml",
	} {
		applyFile(t, adminClient, name)
	}

	// The operator's ServiceAccount, through impersonation, so RBAC and the policy see the operator.
	operatorConfig := rest.CopyConfig(admin)
	operatorConfig.Impersonate = rest.ImpersonationConfig{UserName: operatorUser}
	operatorClient, err := client.New(operatorConfig, client.Options{Scheme: clientgoscheme.Scheme})
	Expect(err).NotTo(HaveOccurred())

	var template corev1.PodTemplate
	key := client.ObjectKey{Namespace: "sandbox-runs", Name: "job-host"}
	Expect(operatorClient.Get(t.Context(), key, &template)).To(Succeed(), "the Role lets the operator read it")

	// The API server loads a new policy within a few seconds, so the first check waits until it refuses.
	changed := BuildJob(&template, testJob(uuid.NewString()))
	changed.Spec.Template.Spec.Containers[0].Image = "attacker/image:latest"
	Eventually(func() error {
		return operatorClient.Create(t.Context(), changed.DeepCopy())
	}, 30*time.Second, 200*time.Millisecond).Should(MatchError(ContainSubstring("pod spec of the Job must be")))
	// The run step retries a policy denial, so the sandbox must recognize the API server's answer, which policyDenial
	// copies.
	denial := operatorClient.Create(t.Context(), changed.DeepCopy())
	Expect(isAdmissionDenial(denial)).To(BeTrue(), "%v", denial)
	Expect(apierrors.ReasonForError(denial)).To(Equal(apierrors.ReasonForError(policyDenial(changed.Name))))

	box := &Sandbox{Client: operatorClient, Reader: operatorClient}
	Expect(box.CreateJob(t.Context(), testJob(uuid.NewString()))).To(Succeed())

	refusals := map[string]func(job *corev1.PodTemplateSpec){
		"another pod annotation": func(pod *corev1.PodTemplateSpec) { pod.Annotations["extra"] = "x" },
		"a host network":         func(pod *corev1.PodTemplateSpec) { pod.Spec.HostNetwork = true },
		"another command":        func(pod *corev1.PodTemplateSpec) { pod.Spec.Containers[0].Command = []string{"sh"} },
	}
	for name, change := range refusals {
		refused := BuildJob(&template, testJob(uuid.NewString()))
		change(&refused.Spec.Template)
		err := operatorClient.Create(t.Context(), refused)
		Expect(apierrors.IsInvalid(err) || apierrors.IsForbidden(err)).To(BeTrue(), "%s: %v", name, err)
	}

	// A Job that would run longer than the policy allows.
	long := BuildJob(&template, testJob(uuid.NewString()))
	long.Spec.ActiveDeadlineSeconds = new(int64(config.MaxJobDeadline/time.Second + 1))
	Expect(operatorClient.Create(t.Context(), long)).NotTo(Succeed())

	// The operator may not create anything but Jobs there.
	pod := &corev1.Pod{}
	pod.Namespace = "sandbox-runs"
	pod.Name = "direct"
	pod.Spec = template.Template.Spec
	Expect(apierrors.IsForbidden(operatorClient.Create(t.Context(), pod))).To(BeTrue())
}
