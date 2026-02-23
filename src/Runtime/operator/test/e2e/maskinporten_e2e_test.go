package e2e

import (
	"context"
	"fmt"
	"os/exec"
	"path/filepath"
	"sync"
	"time"

	fluxmeta "github.com/fluxcd/pkg/apis/meta"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	apimeta "k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/watch"

	"altinn.studio/devenv/pkg/runtimes/kind"
	resourcesv1alpha1 "altinn.studio/operator/api/v1alpha1"
	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/maskinporten"
	"altinn.studio/operator/test/utils"
)

// createStateFetcher creates a FetchStateFunc for a given MaskinportenClient name and namespace
func createStateFetcher(k8sClient *utils.K8sClient, name, secretName, ns string) FetchStateFunc { //nolint:unparam
	return func() (*resourcesv1alpha1.MaskinportenClient, *corev1.Secret, error) {
		ctx := context.Background()

		// Fetch MaskinportenClient
		var mpClient *resourcesv1alpha1.MaskinportenClient
		clientObj := &resourcesv1alpha1.MaskinportenClient{}
		err := k8sClient.CRD.Get().
			Resource("maskinportenclients").
			Namespace(ns).
			Name(name).
			Do(ctx).
			Into(clientObj)
		if err != nil {
			if apierrors.IsNotFound(err) {
				mpClient = nil
			} else {
				return nil, nil, fmt.Errorf("failed to fetch MaskinportenClient: %w", err)
			}
		} else {
			mpClient = clientObj
		}

		// Fetch associated Secret
		var secret *corev1.Secret
		secretObj := &corev1.Secret{}
		err = k8sClient.Core.Get().
			Resource("secrets").
			Namespace(ns).
			Name(secretName).
			Do(ctx).
			Into(secretObj)
		if err != nil {
			if apierrors.IsNotFound(err) {
				secret = nil
			} else {
				return nil, nil, fmt.Errorf("failed to fetch Secret: %w", err)
			}
		} else {
			secret = secretObj
		}

		return mpClient, secret, nil
	}
}

// stateIsReconciled checks if the MaskinportenClient is in reconciled state
func stateIsReconciled(client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret) error {
	if client == nil {
		return fmt.Errorf("MaskinportenClient does not exist")
	}
	if !apimeta.IsStatusConditionTrue(client.Status.Conditions, maskinporten.ConditionTypeReady) {
		cond := apimeta.FindStatusCondition(client.Status.Conditions, maskinporten.ConditionTypeReady)
		if cond != nil {
			return fmt.Errorf("MaskinportenClient not ready: reason=%s message=%s", cond.Reason, cond.Message)
		}
		return fmt.Errorf("MaskinportenClient not ready: no Ready condition")
	}
	if client.Status.ObservedGeneration != client.Generation {
		return fmt.Errorf("reconciliation pending: observedGeneration=%d, generation=%d",
			client.Status.ObservedGeneration, client.Generation)
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
	const (
		namespace        = "runtime-operator"
		clientName       = "ttd-localtestapp"
		clientNamespace  = "default"
		secretName       = "ttd-localtestapp-deployment-secrets"
		rotateJwkEnabled = "true"
	)

	var Runtime *kind.KindContainerRuntime
	var Client *utils.K8sClient

	BeforeAll(func() {
		By("loading kind runtime")

		var err error
		projectRoot, err := config.TryFindProjectRootByGoMod()
		ExpectWithOffset(2, err).NotTo(HaveOccurred())
		Runtime, err = kind.LoadCurrent(filepath.Join(projectRoot, ".cache"))
		ExpectWithOffset(2, err).NotTo(HaveOccurred())
		Client, err = utils.CreateK8sClient(Runtime.GetContextName())
		ExpectWithOffset(2, err).NotTo(HaveOccurred())
	})

	Context("Operator", func() {
		BeforeAll(func() {
			ResetConsistencyState()

			By("resetting fakes state for deterministic test runs")
			err := ResetFakesState()
			Expect(err).NotTo(HaveOccurred())

			k8sClient := Client
			Expect(k8sClient).NotTo(BeNil())

			ctx := context.Background()

			By("cleaning up any existing MaskinportenClient")
			_ = k8sClient.CRD.Delete().
				Resource("maskinportenclients").
				Namespace(clientNamespace).
				Name(clientName).
				Do(ctx).
				Error()

			By("clearing maskinporten-settings.json from secret")
			patch := []byte(`[{"op": "remove", "path": "/data/maskinporten-settings.json"}]`)
			_ = k8sClient.Core.Patch(types.JSONPatchType).
				Resource("secrets").
				Namespace(clientNamespace).
				Name(secretName).
				Body(patch).
				Do(ctx).
				Error()

			By("waiting for cleanup to complete")
			Eventually(func() bool {
				mpClient := &resourcesv1alpha1.MaskinportenClient{}
				err := k8sClient.CRD.Get().
					Resource("maskinportenclients").
					Namespace(clientNamespace).
					Name(clientName).
					Do(ctx).
					Into(mpClient)
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

		It("should snapshot initial state before MaskinportenClient exists", func() {
			By("constructing k8s client")
			k8sClient := Client
			Expect(k8sClient).NotTo(BeNil())

			By("snapshotting initial state (CR does not exist, secret is empty)")
			mpClient, secret, err := createStateFetcher(k8sClient, clientName, secretName, clientNamespace)()
			Expect(err).To(Succeed())
			db, err := FetchFakesDb()
			Expect(err).To(Succeed())
			SnapshotState(mpClient, secret, db, "step0-initial")
		})

		It("should reconcile MaskinportenClient", func() {
			By("constructing k8s client")
			k8sClient := Client
			Expect(k8sClient).NotTo(BeNil())

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

			err := k8sClient.CRD.Post().
				Resource("maskinportenclients").
				Namespace(clientNamespace).
				Body(maskinportenClient).
				Do(context.Background()).
				Error()
			Expect(err).To(Succeed())

			By("waiting for reconciliation and snapshotting state")
			EventuallyWithSnapshot(
				createStateFetcher(k8sClient, clientName, secretName, clientNamespace),
				FetchFakesDb,
				stateIsReconciled,
				time.Second*10,
				time.Second,
				"step1-reconciled",
			)

			By("triggering pod secret volume sync")
			err = TriggerPodSecretSync(k8sClient, clientNamespace, "ttd-localtestapp-deployment")
			Expect(err).NotTo(HaveOccurred())
		})

		It("should preserve secret during flux HelmRelease reconciliation", func() {
			k8sClient := Client
			Expect(k8sClient).NotTo(BeNil())

			ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
			defer cancel()

			const helmReleaseName = "ttd-localtestapp"

			By("setting up watch on secret")
			watcher, err := k8sClient.Core.Get().
				Resource("secrets").
				Namespace(clientNamespace).
				Name(secretName).
				Watch(ctx)
			Expect(err).NotTo(HaveOccurred())

			type SecretEvent struct {
				Type        watch.EventType
				DataLength  int
				HasSettings bool
			}
			events := make([]SecretEvent, 0)
			var eventsMu sync.Mutex
			watchDone := make(chan struct{})

			go func() {
				defer close(watchDone)
				for event := range watcher.ResultChan() {
					if secret, ok := event.Object.(*corev1.Secret); ok {
						eventsMu.Lock()
						_, hasSettings := secret.Data["maskinporten-settings.json"]
						events = append(events, SecretEvent{
							Type:        event.Type,
							DataLength:  len(secret.Data),
							HasSettings: hasSettings,
						})
						eventsMu.Unlock()
					}
				}
			}()

			By("fetching current HelmRelease")
			hr := &unstructured.Unstructured{}
			hr.SetGroupVersionKind(schema.GroupVersionKind{
				Group:   "helm.toolkit.fluxcd.io",
				Version: "v2",
				Kind:    "HelmRelease",
			})
			err = k8sClient.Flux.Get().
				Resource("helmreleases").
				Namespace(clientNamespace).
				Name(helmReleaseName).
				Do(ctx).
				Into(hr)
			Expect(err).NotTo(HaveOccurred())

			status, _, _ := unstructured.NestedMap(hr.Object, "status")
			initialHandled, _, _ := unstructured.NestedString(status, "lastHandledReconcileAt")

			By("triggering flux reconcile via annotation")
			annotations := hr.GetAnnotations()
			if annotations == nil {
				annotations = make(map[string]string)
			}
			requestedAt := time.Now().Format(time.RFC3339Nano)
			annotations[fluxmeta.ReconcileRequestAnnotation] = requestedAt
			hr.SetAnnotations(annotations)

			err = k8sClient.Flux.Put().
				Resource("helmreleases").
				Namespace(clientNamespace).
				Name(helmReleaseName).
				Body(hr).
				Do(ctx).
				Error()
			Expect(err).NotTo(HaveOccurred())

			By("waiting for reconciliation to complete")
			Eventually(func() bool {
				hr := &unstructured.Unstructured{}
				hr.SetGroupVersionKind(schema.GroupVersionKind{
					Group:   "helm.toolkit.fluxcd.io",
					Version: "v2",
					Kind:    "HelmRelease",
				})
				err := k8sClient.Flux.Get().
					Resource("helmreleases").
					Namespace(clientNamespace).
					Name(helmReleaseName).
					Do(ctx).
					Into(hr)
				if err != nil {
					return false
				}
				status, _, _ := unstructured.NestedMap(hr.Object, "status")
				handled, _, _ := unstructured.NestedString(status, "lastHandledReconcileAt")
				return handled != initialHandled
			}, 30*time.Second, time.Second).Should(BeTrue())

			By("stopping watch and collecting events")
			watcher.Stop()
			<-watchDone

			eventsMu.Lock()
			collectedEvents := events
			eventsMu.Unlock()

			// NOTE: app deployed through helmrelease right now
			// doesn't actually clear/delete the secret during reconciliaton
			// Note quite sure why, maybe 3-way-merge behavior of fluxcd helm controller?
			// but we keep the test here to make sure this stays true in the future
			By("verifying secret was never emptied")
			for i, ev := range collectedEvents {
				_, _ = fmt.Fprintf(GinkgoWriter, "Event %d: type=%s, dataLen=%d, hasSettings=%v\n",
					i, ev.Type, ev.DataLength, ev.HasSettings)

				if ev.Type == watch.Deleted {
					Fail(fmt.Sprintf("Secret was deleted at event %d", i))
				}
				Expect(ev.DataLength).To(BeNumerically(">", 0),
					fmt.Sprintf("Secret data empty at event %d", i))
				Expect(ev.HasSettings).To(BeTrue(),
					fmt.Sprintf("maskinporten-settings.json missing at event %d", i))
			}

			By("verifying lastHandledReconcileAt matches our request")
			hr = &unstructured.Unstructured{}
			hr.SetGroupVersionKind(schema.GroupVersionKind{
				Group:   "helm.toolkit.fluxcd.io",
				Version: "v2",
				Kind:    "HelmRelease",
			})
			err = k8sClient.Flux.Get().
				Resource("helmreleases").
				Namespace(clientNamespace).
				Name(helmReleaseName).
				Do(ctx).
				Into(hr)
			Expect(err).NotTo(HaveOccurred())
			status, _, _ = unstructured.NestedMap(hr.Object, "status")
			handled, _, _ := unstructured.NestedString(status, "lastHandledReconcileAt")
			Expect(handled).To(Equal(requestedAt))
		})

		It("should generate token using reconciled credentials", func() {
			By("calling testapp token endpoint")
			var tokenResp *TokenResponse
			Eventually(func() error {
				resp, err := FetchToken("altinn:serviceowner/instances.read")
				if err != nil {
					_, err = fmt.Fprintf(GinkgoWriter, "FetchToken error: %v\n", err)
					if err != nil {
						return fmt.Errorf("failed to write to GinkgoWriter: %w", err)
					}
					return err
				}
				if !resp.Success {
					_, err = fmt.Fprintf(GinkgoWriter, "Token request failed: %s\n", resp.Error)
					if err != nil {
						return fmt.Errorf("failed to write to GinkgoWriter: %w", err)
					}
					return fmt.Errorf("token request failed: %s", resp.Error)
				}
				_, err = fmt.Fprintf(
					GinkgoWriter, "Token request succeeded, clientId: %s, scopes: %v\n",
					resp.Claims.ClientId, resp.Claims.Scopes)
				if err != nil {
					return fmt.Errorf("failed to write to GinkgoWriter: %w", err)
				}
				tokenResp = resp
				return nil
			}, time.Second*10, time.Second).Should(Succeed())

			By("verifying token claims")
			Expect(tokenResp.Claims).NotTo(BeNil())
			Expect(tokenResp.Claims.Scopes).To(ContainElement("altinn:serviceowner/instances.read"))

			By("snapshotting token response")
			SnapshotTokenResponse(tokenResp, "step1b-token")
		})

		It("should handle scope removal", func() {
			k8sClient := Client
			Expect(k8sClient).NotTo(BeNil())

			ctx := context.Background()

			By("fetching current MaskinportenClient")
			mpClient := &resourcesv1alpha1.MaskinportenClient{}
			err := k8sClient.CRD.Get().
				Resource("maskinportenclients").
				Namespace(clientNamespace).
				Name(clientName).
				Do(ctx).
				Into(mpClient)
			Expect(err).To(Succeed())

			By("updating MaskinportenClient to remove one scope")
			mpClient.Spec.Scopes = []string{"altinn:serviceowner/instances.read"}
			err = k8sClient.CRD.Put().
				Resource("maskinportenclients").
				Namespace(clientNamespace).
				Name(clientName).
				Body(mpClient).
				Do(ctx).
				Error()
			Expect(err).To(Succeed())

			By("waiting for reconciliation after scope removal")
			EventuallyWithSnapshot(
				createStateFetcher(k8sClient, clientName, secretName, clientNamespace),
				FetchFakesDb,
				stateIsReconciled,
				time.Second*10,
				time.Second,
				"step2-scope-removed",
			)

			By("triggering pod secret volume sync")
			err = TriggerPodSecretSync(k8sClient, clientNamespace, "ttd-localtestapp-deployment")
			Expect(err).NotTo(HaveOccurred())
		})

		It("should handle manual JWK rotation via annotation", func() {
			k8sClient := Client
			Expect(k8sClient).NotTo(BeNil())

			ctx := context.Background()

			By("fetching current MaskinportenClient")
			mpClient := &resourcesv1alpha1.MaskinportenClient{}
			err := k8sClient.CRD.Get().
				Resource("maskinportenclients").
				Namespace(clientNamespace).
				Name(clientName).
				Do(ctx).
				Into(mpClient)
			Expect(err).To(Succeed())

			By("adding rotate-jwk annotation")
			if mpClient.Annotations == nil {
				mpClient.Annotations = make(map[string]string)
			}
			mpClient.Annotations[maskinporten.AnnotationRotateJwk] = rotateJwkEnabled
			err = k8sClient.CRD.Put().
				Resource("maskinportenclients").
				Namespace(clientNamespace).
				Name(clientName).
				Body(mpClient).
				Do(ctx).
				Error()
			Expect(err).To(Succeed())

			By("waiting for rotation and annotation removal")
			EventuallyWithSnapshot(
				createStateFetcher(k8sClient, clientName, secretName, clientNamespace),
				FetchFakesDb,
				func(client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret) error {
					if client.Annotations[maskinporten.AnnotationRotateJwk] == rotateJwkEnabled {
						return fmt.Errorf("annotation not removed yet")
					}
					return stateIsReconciled(client, secret)
				},
				time.Second*10,
				time.Second,
				"step2b-jwk-rotated",
			)

			By("triggering pod secret volume sync")
			err = TriggerPodSecretSync(k8sClient, clientNamespace, "ttd-localtestapp-deployment")
			Expect(err).NotTo(HaveOccurred())
		})

		It("should handle second JWK rotation and trim to 2 keys", func() {
			k8sClient := Client
			Expect(k8sClient).NotTo(BeNil())

			ctx := context.Background()

			By("fetching current MaskinportenClient")
			mpClient := &resourcesv1alpha1.MaskinportenClient{}
			err := k8sClient.CRD.Get().
				Resource("maskinportenclients").
				Namespace(clientNamespace).
				Name(clientName).
				Do(ctx).
				Into(mpClient)
			Expect(err).To(Succeed())

			By("adding rotate-jwk annotation for second rotation")
			if mpClient.Annotations == nil {
				mpClient.Annotations = make(map[string]string)
			}
			mpClient.Annotations[maskinporten.AnnotationRotateJwk] = rotateJwkEnabled
			err = k8sClient.CRD.Put().
				Resource("maskinportenclients").
				Namespace(clientNamespace).
				Name(clientName).
				Body(mpClient).
				Do(ctx).
				Error()
			Expect(err).To(Succeed())

			By("waiting for rotation, annotation removal, and key trimming")
			EventuallyWithSnapshot(
				createStateFetcher(k8sClient, clientName, secretName, clientNamespace),
				FetchFakesDb,
				func(client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret) error {
					if client.Annotations[maskinporten.AnnotationRotateJwk] == rotateJwkEnabled {
						return fmt.Errorf("annotation not removed yet")
					}
					if err := stateIsReconciled(client, secret); err != nil {
						return err
					}
					if len(client.Status.KeyIds) != 2 {
						return fmt.Errorf("expected 2 keys after rotation, got %d", len(client.Status.KeyIds))
					}
					return nil
				},
				time.Second*10,
				time.Second,
				"step2c-jwk-rotated-again",
			)

			By("triggering pod secret volume sync")
			err = TriggerPodSecretSync(k8sClient, clientNamespace, "ttd-localtestapp-deployment")
			Expect(err).NotTo(HaveOccurred())
		})

		It("should clean up on deletion", func() {
			k8sClient := Client
			Expect(k8sClient).NotTo(BeNil())

			ctx := context.Background()

			By("deleting MaskinportenClient")
			err := k8sClient.CRD.Delete().
				Resource("maskinportenclients").
				Namespace(clientNamespace).
				Name(clientName).
				Do(ctx).
				Error()
			Expect(err).To(Succeed())

			By("waiting for MaskinportenClient to be deleted")
			EventuallyWithSnapshot(
				createStateFetcher(k8sClient, clientName, secretName, clientNamespace),
				FetchFakesDb,
				stateIsDeleted,
				time.Second*10,
				time.Second,
				"step3-deleted",
			)
		})
	})
})
