package e2e

import (
	"context"
	"fmt"
	"os/exec"
	"path/filepath"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/rest"

	resourcesv1alpha1 "altinn.studio/operator/api/v1alpha1"
	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/test/utils"
	"altinn.studio/runtime-fixture/pkg/runtimes/kind"
)

const namespace = "runtime-operator"

var Runtime *kind.KindContainerRuntime

// createStateFetcher creates a FetchStateFunc for a given MaskinportenClient name and namespace
func createStateFetcher(k8sClient *rest.RESTClient, name, secretName, namespace string) FetchStateFunc {
	return func() (*resourcesv1alpha1.MaskinportenClient, *corev1.Secret, error) {
		// Fetch MaskinportenClient
		var client *resourcesv1alpha1.MaskinportenClient
		clientObj := &resourcesv1alpha1.MaskinportenClient{}
		err := k8sClient.Get().
			Resource("maskinportenclients").
			Namespace(namespace).
			Name(name).
			Do(context.Background()).
			Into(clientObj)
		if err != nil {
			if apierrors.IsNotFound(err) {
				// Resource deleted - return nil client
				client = nil
			} else {
				return nil, nil, fmt.Errorf("failed to fetch MaskinportenClient: %w", err)
			}
		} else {
			client = clientObj
		}

		// Fetch associated Secret
		var secret *corev1.Secret
		secretObj := &corev1.Secret{}
		err = k8sClient.Get().
			Resource("secrets").
			Namespace(namespace).
			Name(secretName).
			Do(context.Background()).
			Into(secretObj)
		if err != nil {
			// Secret might not exist (deleted or not created yet)
			secret = nil
		} else {
			secret = secretObj
		}

		return client, secret, nil
	}
}

// stateIsReconciled checks if the MaskinportenClient is in reconciled state
func stateIsReconciled(client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret) error {
	if client == nil {
		return fmt.Errorf("MaskinportenClient does not exist")
	}
	if client.Status.State != "reconciled" {
		return fmt.Errorf("MaskinportenClient not reconciled yet: state=%s", client.Status.State)
	}
	return nil
}

// stateIsDeleted checks if the MaskinportenClient has been deleted
func stateIsDeleted(client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret) error {
	if client != nil {
		return fmt.Errorf("MaskinportenClient still exists")
	}
	return nil
}

var _ = Describe("controller", Ordered, func() {
	BeforeAll(func() {
		By("loading kind runtime")

		var err error
		projectRoot := config.TryFindProjectRoot()
		Runtime, err = kind.LoadCurrent(filepath.Join(projectRoot, ".cache"))
		ExpectWithOffset(2, err).NotTo(HaveOccurred())
	})

	Context("Operator", func() {
		BeforeAll(func() {
			k8sClient, err := utils.GetK8sClient()
			Expect(err).To(Succeed())

			const clientName = "ttd-localtestapp"
			const clientNamespace = "default"
			const secretName = "ttd-localtestapp-deployment-secrets"

			By("cleaning up any existing MaskinportenClient")
			_ = k8sClient.Delete().
				Resource("maskinportenclients").
				Namespace(clientNamespace).
				Name(clientName).
				Do(context.Background()).
				Error()

			By("clearing any existing secret data")
			patch := []byte(`{"data": null}`)
			_ = k8sClient.Patch(types.MergePatchType).
				Resource("secrets").
				Namespace(clientNamespace).
				Name(secretName).
				Body(patch).
				Do(context.Background()).
				Error()

			By("waiting for cleanup to complete")
			Eventually(func() bool {
				client := &resourcesv1alpha1.MaskinportenClient{}
				err := k8sClient.Get().
					Resource("maskinportenclients").
					Namespace(clientNamespace).
					Name(clientName).
					Do(context.Background()).
					Into(client)
				return apierrors.IsNotFound(err)
			}, time.Second*10, time.Second).Should(BeTrue())
		})

		It("should run successfully", func() {
			var controllerPodName string

			By("validating that the controller-manager pod is running as expected")
			verifyControllerUp := func() error {
				// Get pod name

				cmd := exec.Command("kubectl", "get",
					"pods", "-l", "control-plane=controller-manager",
					"-o", "go-template={{ range .items }}"+
						"{{ if not .metadata.deletionTimestamp }}"+
						"{{ .metadata.name }}"+
						"{{ \"\\n\" }}{{ end }}{{ end }}",
					"-n", namespace,
				)

				podOutput, err := utils.Run(cmd, "")
				ExpectWithOffset(2, err).NotTo(HaveOccurred())
				podNames := utils.GetNonEmptyLines(string(podOutput))
				if len(podNames) != 1 {
					return fmt.Errorf("expect 1 controller pods running, but got %d", len(podNames))
				}
				controllerPodName = podNames[0]
				ExpectWithOffset(2, controllerPodName).Should(ContainSubstring("controller-manager"))

				// Validate pod status
				cmd = exec.Command("kubectl", "get",
					"pods", controllerPodName, "-o", "jsonpath={.status.phase}",
					"-n", namespace,
				)
				status, err := utils.Run(cmd, "")
				ExpectWithOffset(2, err).NotTo(HaveOccurred())
				if string(status) != "Running" {
					return fmt.Errorf("controller pod in %s status", status)
				}
				return nil
			}
			EventuallyWithOffset(1, verifyControllerUp, time.Minute, time.Second).Should(Succeed())
		})

		It("should respond to MaskinportenClient", func() {
			By("constructing k8s client")
			k8sClient, err := utils.GetK8sClient()
			Expect(err).To(Succeed())

			const clientName = "ttd-localtestapp"
			const clientNamespace = "default"
			const secretName = "ttd-localtestapp-deployment-secrets"

			By("creating MaskinportenClient resource")
			maskinportenClient := &resourcesv1alpha1.MaskinportenClient{
				ObjectMeta: metav1.ObjectMeta{
					Name:      clientName,
					Namespace: clientNamespace,
					Labels: map[string]string{
						"app": "ttd-localtestapp-deployment",
					},
				},
				Spec: resourcesv1alpha1.MaskinportenClientSpec{
					Scopes: []string{"altinn:serviceowner/instances.read", "altinn:serviceowner/instances.write"},
				},
			}

			err = k8sClient.Post().
				Resource("maskinportenclients").
				Namespace(clientNamespace).
				Body(maskinportenClient).
				Do(context.Background()).
				Error()
			Expect(err).To(Succeed())

			By("waiting for reconciliation and snapshotting state")
			EventuallyWithSnapshot(
				createStateFetcher(k8sClient, clientName, secretName, clientNamespace),
				stateIsReconciled,
				time.Second*5,
				time.Second,
				"step1-reconciled",
			)
		})

		It("should handle scope removal", func() {
			k8sClient, err := utils.GetK8sClient()
			Expect(err).To(Succeed())

			const clientName = "ttd-localtestapp"
			const clientNamespace = "default"
			const secretName = "ttd-localtestapp-deployment-secrets"

			By("fetching current MaskinportenClient")
			client := &resourcesv1alpha1.MaskinportenClient{}
			err = k8sClient.Get().
				Resource("maskinportenclients").
				Namespace(clientNamespace).
				Name(clientName).
				Do(context.Background()).
				Into(client)
			Expect(err).To(Succeed())

			By("updating MaskinportenClient to remove one scope")
			client.Spec.Scopes = []string{"altinn:serviceowner/instances.read"}
			err = k8sClient.Put().
				Resource("maskinportenclients").
				Namespace(clientNamespace).
				Name(clientName).
				Body(client).
				Do(context.Background()).
				Error()
			Expect(err).To(Succeed())

			By("waiting for reconciliation after scope removal")
			EventuallyWithSnapshot(
				createStateFetcher(k8sClient, clientName, secretName, clientNamespace),
				stateIsReconciled,
				time.Second*5,
				time.Second,
				"step2-scope-removed",
			)
		})

		It("should clean up on deletion", func() {
			k8sClient, err := utils.GetK8sClient()
			Expect(err).To(Succeed())

			const clientName = "ttd-localtestapp"
			const clientNamespace = "default"
			const secretName = "ttd-localtestapp-deployment-secrets"

			By("deleting MaskinportenClient")
			err = k8sClient.Delete().
				Resource("maskinportenclients").
				Namespace(clientNamespace).
				Name(clientName).
				Do(context.Background()).
				Error()
			Expect(err).To(Succeed())

			By("waiting for MaskinportenClient to be deleted")
			EventuallyWithSnapshot(
				createStateFetcher(k8sClient, clientName, secretName, clientNamespace),
				stateIsDeleted,
				time.Second*10,
				time.Second,
				"step3-deleted",
			)
		})
	})
})
