package e2e

import (
	"context"
	"errors"
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

var (
	errMaskinportenClientMissing  = errors.New("MaskinportenClient does not exist")
	errMaskinportenClientNotReady = errors.New("MaskinportenClient not ready")
	errMissingReadyCondition      = errors.New("MaskinportenClient not ready: no Ready condition")
	errReconciliationPending      = errors.New("reconciliation pending")
	errMaskinportenClientExists   = errors.New("MaskinportenClient still exists")
	errAnnotationNotRemoved       = errors.New("annotation not removed yet")
	errExpectedSingleController   = errors.New("expected exactly one controller pod")
	errControllerPodNotRunning    = errors.New("controller pod not running")
	errTokenRequestFailed         = errors.New("token request failed")
	errExpectedRotatedKeyCount    = errors.New("expected two keys after rotation")
	errClientStillExistsInFakesDB = errors.New("client still exists in fakes db")
)

type stateRef struct {
	clientName string
	secretName string
	namespace  string
}

// createStateFetcher creates a FetchStateFunc for a given MaskinportenClient name and namespace.
func createStateFetcher(
	k8sClient *utils.K8sClient,
	ref stateRef,
) FetchStateFunc {
	return func() (*resourcesv1alpha1.MaskinportenClient, *corev1.Secret, error) {
		ctx := context.Background()

		// Fetch MaskinportenClient
		var mpClient *resourcesv1alpha1.MaskinportenClient
		clientObj := &resourcesv1alpha1.MaskinportenClient{}
		err := k8sClient.CRD.Get().
			Resource("maskinportenclients").
			Namespace(ref.namespace).
			Name(ref.clientName).
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
			Namespace(ref.namespace).
			Name(ref.secretName).
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

// stateIsReconciled checks if the MaskinportenClient is in reconciled state.
func stateIsReconciled(client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret) error {
	if client == nil {
		return errMaskinportenClientMissing
	}
	if !apimeta.IsStatusConditionTrue(client.Status.Conditions, maskinporten.ConditionTypeReady) {
		cond := apimeta.FindStatusCondition(client.Status.Conditions, maskinporten.ConditionTypeReady)
		if cond != nil {
			return fmt.Errorf("%w: reason=%s message=%s", errMaskinportenClientNotReady, cond.Reason, cond.Message)
		}
		return errMissingReadyCondition
	}
	if client.Status.ObservedGeneration != client.Generation {
		return fmt.Errorf("%w: observedGeneration=%d generation=%d", errReconciliationPending,
			client.Status.ObservedGeneration, client.Generation)
	}
	return nil
}

// stateIsDeleted checks if the MaskinportenClient has been deleted.
func stateIsDeleted(client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret) error {
	if client != nil {
		return errMaskinportenClientExists
	}
	return nil
}

func nestedMap(obj map[string]any, fields ...string) (map[string]any, error) {
	value, _, err := unstructured.NestedMap(obj, fields...)
	if err != nil {
		return nil, fmt.Errorf("get nested map %v: %w", fields, err)
	}
	return value, nil
}

func nestedString(obj map[string]any, fields ...string) (string, error) {
	value, _, err := unstructured.NestedString(obj, fields...)
	if err != nil {
		return "", fmt.Errorf("get nested string %v: %w", fields, err)
	}
	return value, nil
}

func ginkgoWritef(format string, args ...any) error {
	if _, err := fmt.Fprintf(GinkgoWriter, format, args...); err != nil {
		return fmt.Errorf("write to GinkgoWriter: %w", err)
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
	var ref stateRef

	BeforeAll(func() {
		By("loading kind runtime")

		var err error
		projectRoot, err := config.TryFindProjectRootByGoMod()
		ExpectWithOffset(2, err).NotTo(HaveOccurred())
		Runtime, err = kind.LoadCurrent(filepath.Join(projectRoot, ".cache"))
		ExpectWithOffset(2, err).NotTo(HaveOccurred())
		Client, err = utils.CreateK8sClient(Runtime.GetContextName())
		ExpectWithOffset(2, err).NotTo(HaveOccurred())
		ref = stateRef{
			clientName: clientName,
			secretName: secretName,
			namespace:  clientNamespace,
		}
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
			err = k8sClient.CRD.Delete().
				Resource("maskinportenclients").
				Namespace(clientNamespace).
				Name(clientName).
				Do(ctx).
				Error()
			if err != nil && !apierrors.IsNotFound(err) {
				Expect(err).NotTo(HaveOccurred())
			}

			By("clearing maskinporten-settings.json from secret")
			patch := []byte(`[{"op": "remove", "path": "/data/maskinporten-settings.json"}]`)
			err = k8sClient.Core.Patch(types.JSONPatchType).
				Resource("secrets").
				Namespace(clientNamespace).
				Name(secretName).
				Body(patch).
				Do(ctx).
				Error()
			if err != nil {
				Expect(ginkgoWritef("Ignoring cleanup patch error for secret %s/%s: %v\n",
					clientNamespace, secretName, err)).To(Succeed())
			}

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
					return fmt.Errorf("%w: got %d", errExpectedSingleController, len(podNames))
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
					return fmt.Errorf("%w: %s", errControllerPodNotRunning, status)
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
			mpClient, secret, err := createStateFetcher(k8sClient, ref)()
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
				createStateFetcher(k8sClient, ref),
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

			status, err := nestedMap(hr.Object, "status")
			Expect(err).NotTo(HaveOccurred())
			initialHandled, err := nestedString(status, "lastHandledReconcileAt")
			Expect(err).NotTo(HaveOccurred())

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
				currentHR := &unstructured.Unstructured{}
				currentHR.SetGroupVersionKind(schema.GroupVersionKind{
					Group:   "helm.toolkit.fluxcd.io",
					Version: "v2",
					Kind:    "HelmRelease",
				})
				getErr := k8sClient.Flux.Get().
					Resource("helmreleases").
					Namespace(clientNamespace).
					Name(helmReleaseName).
					Do(ctx).
					Into(currentHR)
				if getErr != nil {
					return false
				}
				currentStatus, nestedErr := nestedMap(currentHR.Object, "status")
				if nestedErr != nil {
					return false
				}
				handled, nestedErr := nestedString(currentStatus, "lastHandledReconcileAt")
				if nestedErr != nil {
					return false
				}
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
				Expect(ginkgoWritef("Event %d: type=%s, dataLen=%d, hasSettings=%v\n",
					i, ev.Type, ev.DataLength, ev.HasSettings)).To(Succeed())

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
			status, err = nestedMap(hr.Object, "status")
			Expect(err).NotTo(HaveOccurred())
			handled, err := nestedString(status, "lastHandledReconcileAt")
			Expect(err).NotTo(HaveOccurred())
			Expect(handled).To(Equal(requestedAt))
		})

		It("should generate token using reconciled credentials", func() {
			By("calling testapp token endpoint")
			var tokenResp *TokenResponse
			Eventually(func() error {
				resp, err := FetchToken("altinn:serviceowner/instances.read")
				if err != nil {
					writeErr := ginkgoWritef("FetchToken error: %v\n", err)
					if writeErr != nil {
						return writeErr
					}
					return err
				}
				if !resp.Success {
					writeErr := ginkgoWritef("Token request failed: %s\n", resp.Error)
					if writeErr != nil {
						return writeErr
					}
					return fmt.Errorf("%w: %s", errTokenRequestFailed, resp.Error)
				}
				if err := ginkgoWritef(
					"Token request succeeded, clientId: %s, scopes: %v\n",
					resp.Claims.ClientId, resp.Claims.Scopes,
				); err != nil {
					return err
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
				createStateFetcher(k8sClient, ref),
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
				createStateFetcher(k8sClient, ref),
				FetchFakesDb,
				func(client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret) error {
					if client.Annotations[maskinporten.AnnotationRotateJwk] == rotateJwkEnabled {
						return errAnnotationNotRemoved
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
				createStateFetcher(k8sClient, ref),
				FetchFakesDb,
				func(client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret) error {
					if client.Annotations[maskinporten.AnnotationRotateJwk] == rotateJwkEnabled {
						return errAnnotationNotRemoved
					}
					reconcileErr := stateIsReconciled(client, secret)
					if reconcileErr != nil {
						return reconcileErr
					}
					if len(client.Status.KeyIds) != 2 {
						return fmt.Errorf("%w: got %d", errExpectedRotatedKeyCount, len(client.Status.KeyIds))
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

			By("capturing current client id before deletion")
			client := &resourcesv1alpha1.MaskinportenClient{}
			err := k8sClient.CRD.Get().
				Resource("maskinportenclients").
				Namespace(clientNamespace).
				Name(clientName).
				Do(ctx).
				Into(client)
			Expect(err).To(Succeed())
			expectedClientID := client.Status.ClientId
			Expect(expectedClientID).NotTo(BeEmpty())

			By("deleting MaskinportenClient")
			err = k8sClient.CRD.Delete().
				Resource("maskinportenclients").
				Namespace(clientNamespace).
				Name(clientName).
				Do(ctx).
				Error()
			Expect(err).To(Succeed())

			By("waiting for MaskinportenClient to be deleted")
			EventuallyWithSnapshot(
				createStateFetcher(k8sClient, ref),
				FetchFakesDb,
				stateIsDeleted,
				time.Second*10,
				time.Second,
				"step3-deleted",
			)

			By("verifying client is deleted from fakes db")
			Eventually(func() error {
				db, err := FetchFakesDb()
				if err != nil {
					return err
				}
				for _, record := range db {
					if record.ClientId == expectedClientID {
						return fmt.Errorf("%w: %s", errClientStillExistsInFakesDB, expectedClientID)
					}
				}
				return nil
			}, 20*time.Second, time.Second).Should(Succeed())
		})

		It("should clean up when secret is deleted before CR", func() {
			k8sClient := Client
			Expect(k8sClient).NotTo(BeNil())

			ctx := context.Background()

			By("recreating MaskinportenClient resource")
			maskinportenClient := &resourcesv1alpha1.MaskinportenClient{
				ObjectMeta: metav1.ObjectMeta{
					Name:      clientName,
					Namespace: clientNamespace,
					Labels: map[string]string{
						"app": "ttd-localtestapp-deployment",
					},
				},
				Spec: resourcesv1alpha1.MaskinportenClientSpec{
					Scopes: []string{"altinn:serviceowner/instances.read"},
				},
			}
			err := k8sClient.CRD.Post().
				Resource("maskinportenclients").
				Namespace(clientNamespace).
				Body(maskinportenClient).
				Do(ctx).
				Error()
			Expect(err).To(Succeed())

			By("waiting for reconciliation to complete")
			Eventually(func() error {
				client, secret, fetchErr := createStateFetcher(k8sClient, ref)()
				if fetchErr != nil {
					return fetchErr
				}
				return stateIsReconciled(client, secret)
			}, 15*time.Second, time.Second).Should(Succeed())

			By("capturing reconciled client id")
			client := &resourcesv1alpha1.MaskinportenClient{}
			err = k8sClient.CRD.Get().
				Resource("maskinportenclients").
				Namespace(clientNamespace).
				Name(clientName).
				Do(ctx).
				Into(client)
			Expect(err).To(Succeed())
			expectedClientID := client.Status.ClientId
			Expect(expectedClientID).NotTo(BeEmpty())

			By("snapshotting app secret for suite state restoration")
			originalSecret := &corev1.Secret{}
			err = k8sClient.Core.Get().
				Resource("secrets").
				Namespace(clientNamespace).
				Name(secretName).
				Do(ctx).
				Into(originalSecret)
			Expect(err).To(Succeed())

			DeferCleanup(func() {
				By("restoring shared app secret for subsequent e2e suites")
				currentSecret := &corev1.Secret{}
				getErr := k8sClient.Core.Get().
					Resource("secrets").
					Namespace(clientNamespace).
					Name(secretName).
					Do(ctx).
					Into(currentSecret)
				if apierrors.IsNotFound(getErr) {
					restored := originalSecret.DeepCopy()
					restored.SetResourceVersion("")
					restored.SetUID("")
					restored.SetGeneration(0)
					restored.SetCreationTimestamp(metav1.Time{})
					restored.SetManagedFields(nil)
					restored.SetFinalizers(nil)
					restored.SetOwnerReferences(nil)

					createErr := k8sClient.Core.Post().
						Resource("secrets").
						Namespace(clientNamespace).
						Body(restored).
						Do(ctx).
						Error()
					Expect(createErr).To(Succeed())
				} else {
					Expect(getErr).To(Succeed())
				}
			})

			By("deleting secret first")
			err = k8sClient.Core.Delete().
				Resource("secrets").
				Namespace(clientNamespace).
				Name(secretName).
				Do(ctx).
				Error()
			if err != nil && !apierrors.IsNotFound(err) {
				Expect(err).To(Succeed())
			}

			By("waiting for secret to be absent before deleting CR")
			Eventually(func() bool {
				secret := &corev1.Secret{}
				getErr := k8sClient.Core.Get().
					Resource("secrets").
					Namespace(clientNamespace).
					Name(secretName).
					Do(ctx).
					Into(secret)
				return apierrors.IsNotFound(getErr)
			}, 10*time.Second, time.Second).Should(BeTrue())

			By("deleting MaskinportenClient after secret deletion")
			err = k8sClient.CRD.Delete().
				Resource("maskinportenclients").
				Namespace(clientNamespace).
				Name(clientName).
				Do(ctx).
				Error()
			if err != nil && !apierrors.IsNotFound(err) {
				Expect(err).To(Succeed())
			}

			By("waiting for CR deletion and API client cleanup")
			Eventually(func() error {
				mpClient, secret, fetchErr := createStateFetcher(k8sClient, ref)()
				if fetchErr != nil {
					return fetchErr
				}
				deleteErr := stateIsDeleted(mpClient, secret)
				if deleteErr != nil {
					return deleteErr
				}
				db, err := FetchFakesDb()
				if err != nil {
					return err
				}
				for _, record := range db {
					if record.ClientId == expectedClientID {
						return fmt.Errorf("%w: %s", errClientStillExistsInFakesDB, expectedClientID)
					}
				}
				return nil
			}, 20*time.Second, time.Second).Should(Succeed())
		})
	})
})
