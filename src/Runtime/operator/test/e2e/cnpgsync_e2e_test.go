package e2e

import (
	"context"
	"encoding/json"
	"fmt"
	"path/filepath"
	"time"

	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	"github.com/gkampitakis/go-snaps/snaps"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	apimeta "k8s.io/apimachinery/pkg/api/meta"

	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/test/utils"
	"altinn.studio/runtime-fixture/pkg/runtimes/kind"
)

var _ = Describe("cnpgsync", Ordered, func() {
	const (
		cnpgNamespace = "runtime-cnpg"
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

	It("should create CNPG namespace", func() {
		ctx := context.Background()

		By("checking namespace exists")
		Eventually(func() error {
			ns := &corev1.Namespace{}
			return Client.Core.Get().
				Resource("namespaces").
				Name(cnpgNamespace).
				Do(ctx).
				Into(ns)
		}, 60*time.Second, time.Second).Should(Succeed())
	})

	It("should create CNPG HelmRepository", func() {
		ctx := context.Background()

		By("checking HelmRepository exists")
		Eventually(func() error {
			repo := &sourcev1.HelmRepository{}
			return Client.Source.Get().
				Resource("helmrepositories").
				Namespace(cnpgNamespace).
				Name("cnpg").
				Do(ctx).
				Into(repo)
		}, 30*time.Second, time.Second).Should(Succeed())
	})

	It("should create CNPG HelmRelease and become ready", func() {
		ctx := context.Background()

		var readyHr *helmv2.HelmRelease

		By("checking HelmRelease exists and is ready")
		Eventually(func() error {
			hr := &helmv2.HelmRelease{}
			err := Client.Flux.Get().
				Resource("helmreleases").
				Namespace(cnpgNamespace).
				Name("cnpg").
				Do(ctx).
				Into(hr)
			if err != nil {
				return err
			}

			if !apimeta.IsStatusConditionTrue(hr.Status.Conditions, "Ready") {
				cond := apimeta.FindStatusCondition(hr.Status.Conditions, "Ready")
				if cond != nil {
					return fmt.Errorf("HelmRelease not ready: reason=%s message=%s", cond.Reason, cond.Message)
				}
				return fmt.Errorf("HelmRelease not ready: no Ready condition")
			}
			readyHr = hr
			return nil
		}, 120*time.Second, 2*time.Second).Should(Succeed())

		By("snapshotting HelmRelease spec")
		specJSON, err := json.Marshal(readyHr.Spec)
		Expect(err).NotTo(HaveOccurred())
		snaps.WithConfig(snaps.Filename("cnpg-helmrelease-spec")).MatchJSON(GinkgoT(), specJSON)
	})
})
