package e2e

import (
	"context"
	"fmt"
	"os/exec"
	"path/filepath"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	resourcesv1alpha1 "altinn.studio/operator/api/v1alpha1"
	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/test/utils"
	"altinn.studio/runtime-fixture/pkg/runtimes/kind"
)

const namespace = "runtime-operator"

var Runtime *kind.KindContainerRuntime

var _ = Describe("controller", Ordered, func() {
	BeforeAll(func() {
		By("loading kind runtime")

		var err error
		projectRoot := config.TryFindProjectRoot()
		Runtime, err = kind.LoadCurrent(filepath.Join(projectRoot, ".cache"))
		ExpectWithOffset(2, err).NotTo(HaveOccurred())
	})

	Context("Operator", func() {
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

			By("creating MaskinportenClient resource")
			maskinportenClient := &resourcesv1alpha1.MaskinportenClient{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "ttd-localtestapp",
					Namespace: "default",
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
				Namespace("default").
				Body(maskinportenClient).
				Do(context.Background()).
				Error()
			Expect(err).To(Succeed())

			By("validating that the corresponding status is updated after reconcile")
			verifyStatusUpdated := func() error {
				maskinportenClient := &resourcesv1alpha1.MaskinportenClient{}
				err := k8sClient.Get().
					Resource("maskinportenclients").
					Namespace("default").
					Name("ttd-localtestapp").
					Do(context.Background()).
					Into(maskinportenClient)

				if err != nil {
					return err
				}

				state := maskinportenClient.Status.State
				if state != "reconciled" {
					return fmt.Errorf("MaskinportenClient resource in %s status", state)
				}

				return nil
			}
			EventuallyWithOffset(
				1,
				verifyStatusUpdated,
			).WithTimeout(time.Second * 5).
				WithPolling(time.Second).
				Should(Succeed())
		})
	})
})
