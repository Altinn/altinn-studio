package e2e

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"path/filepath"
	"regexp"
	"slices"
	"time"

	helmv2 "github.com/fluxcd/helm-controller/api/v2"
	sourcev1 "github.com/fluxcd/source-controller/api/v1"
	"github.com/gkampitakis/go-snaps/snaps"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	storagev1 "k8s.io/api/storage/v1"
	apimeta "k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"altinn.studio/devenv/pkg/projectroot"
	"altinn.studio/devenv/pkg/runtimes/kind"
	"altinn.studio/operator/internal/cnpgapi"
	"altinn.studio/operator/test/utils"
)

var passwordRegex = regexp.MustCompile(`Password=[^;]+`)

var errHelmReleaseNotReady = errors.New("HelmRelease not ready")
var errHelmReleaseNoReadyCondition = errors.New("HelmRelease has no Ready condition")
var errPasswordKeyMissing = errors.New("password key missing from secret")
var errManagedRolesStatusMissing = errors.New("no managed roles status yet")
var errManagedRoleSpecMissing = errors.New("managed role missing from cluster spec")
var errRoleNotReconciled = errors.New("managed role not yet reconciled")
var errDatabaseNotApplied = errors.New("database not yet applied")
var errPostgresqlJSONMissing = errors.New("postgresql.json key missing from app secret")
var errDBCheckFailed = errors.New("dbcheck failed")
var errUnexpectedDBCheckResult = errors.New("unexpected dbcheck result")

func redactPassword(connStr string) string {
	return passwordRegex.ReplaceAllString(connStr, "Password=REDACTED")
}

var _ = Describe("cnpgsync", Ordered, func() {
	const (
		cnpgNamespace     = "runtime-cnpg"
		storageClassName  = "cnpg-premium-v2"
		clusterName       = "pg-apps-cluster"
		imageCatalogName  = "pg-images"
		appId             = "localtestapp"
		appNamespace      = "default"
		appSecretName     = "ttd-localtestapp-deployment-secrets"
		passwordSecretFmt = "pg-apps-cluster-%s-password"
		databaseNameFmt   = "db-%s"
	)

	var Runtime *kind.KindContainerRuntime
	var Client *utils.K8sClient

	fetchCNPGSpec := func(
		ctx context.Context,
		resource string,
		name string,
		obj *unstructured.Unstructured,
	) (map[string]any, error) {
		err := Client.CNPG.Get().
			Resource(resource).
			Namespace(cnpgNamespace).
			Name(name).
			Do(ctx).
			Into(obj)
		if err != nil {
			return nil, fmt.Errorf("fetch %s: %w", obj.GetKind(), err)
		}
		spec, err := cnpgapi.Spec(obj)
		if err != nil {
			return nil, fmt.Errorf("read %s spec: %w", obj.GetKind(), err)
		}
		return spec, nil
	}

	clusterSpecSnapshot := func(spec map[string]any) map[string]any {
		snapshot := make(map[string]any, len(spec))
		maps.Copy(snapshot, spec)

		// Keep the snapshot focused on the fields this operator writes or relies on.
		// Raw unstructured reads include CNPG CRD defaults that the old typed snapshot omitted.
		delete(snapshot, "failoverDelay")
		delete(snapshot, "maxSyncReplicas")
		delete(snapshot, "minSyncReplicas")
		if monitoring, ok := snapshot["monitoring"].(map[string]any); ok {
			monitoringSnapshot := make(map[string]any, len(monitoring))
			maps.Copy(monitoringSnapshot, monitoring)
			delete(monitoringSnapshot, "enablePodMonitor")
			snapshot["monitoring"] = monitoringSnapshot
		}
		return snapshot
	}

	BeforeAll(func() {
		By("loading kind runtime")

		var err error
		projectRoot, err := projectroot.Find(projectroot.Marker)
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

	It("should create StorageClass", func() {
		ctx := context.Background()

		var readySc *storagev1.StorageClass

		By("checking StorageClass exists")
		Eventually(func() error {
			sc := &storagev1.StorageClass{}
			err := Client.Storage.Get().
				Resource("storageclasses").
				Name(storageClassName).
				Do(ctx).
				Into(sc)
			if err != nil {
				return fmt.Errorf("fetch StorageClass: %w", err)
			}
			readySc = sc
			return nil
		}, 30*time.Second, time.Second).Should(Succeed())

		By("snapshotting StorageClass")
		// Snapshot relevant fields (provisioner, parameters, etc)
		scSnapshot := map[string]any{
			"provisioner":          readySc.Provisioner,
			"parameters":           readySc.Parameters,
			"reclaimPolicy":        readySc.ReclaimPolicy,
			"volumeBindingMode":    readySc.VolumeBindingMode,
			"allowVolumeExpansion": readySc.AllowVolumeExpansion,
		}
		scJSON, err := json.Marshal(scSnapshot)
		Expect(err).NotTo(HaveOccurred())
		snaps.WithConfig(snaps.Filename("cnpg-storageclass")).MatchJSON(GinkgoT(), scJSON)
	})

	It("should create CNPG HelmRepository", func() {
		ctx := context.Background()

		var readyRepo *sourcev1.HelmRepository

		By("checking HelmRepository exists")
		Eventually(func() error {
			repo := &sourcev1.HelmRepository{}
			err := Client.Source.Get().
				Resource("helmrepositories").
				Namespace(cnpgNamespace).
				Name("cnpg").
				Do(ctx).
				Into(repo)
			if err != nil {
				return fmt.Errorf("fetch HelmRepository: %w", err)
			}
			readyRepo = repo
			return nil
		}, 30*time.Second, time.Second).Should(Succeed())

		By("snapshotting HelmRepository spec")
		specJSON, err := json.Marshal(readyRepo.Spec)
		Expect(err).NotTo(HaveOccurred())
		snaps.WithConfig(snaps.Filename("cnpg-helmrepo-spec")).MatchJSON(GinkgoT(), specJSON)
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
				return fmt.Errorf("fetch HelmRelease: %w", err)
			}

			if !apimeta.IsStatusConditionTrue(hr.Status.Conditions, "Ready") {
				cond := apimeta.FindStatusCondition(hr.Status.Conditions, "Ready")
				if cond != nil {
					return fmt.Errorf("%w: reason=%s message=%s", errHelmReleaseNotReady, cond.Reason, cond.Message)
				}
				return errHelmReleaseNoReadyCondition
			}
			readyHr = hr
			return nil
		}, 120*time.Second, 2*time.Second).Should(Succeed())

		By("snapshotting HelmRelease spec")
		specJSON, err := json.Marshal(readyHr.Spec)
		Expect(err).NotTo(HaveOccurred())
		snaps.WithConfig(snaps.Filename("cnpg-helmrelease-spec")).MatchJSON(GinkgoT(), specJSON)
	})

	It("should create ImageCatalog", func() {
		ctx := context.Background()

		var readyCatalog map[string]any

		By("checking ImageCatalog exists")
		Eventually(func() error {
			spec, err := fetchCNPGSpec(
				ctx,
				"imagecatalogs",
				imageCatalogName,
				cnpgapi.NewImageCatalog(cnpgNamespace, imageCatalogName),
			)
			if err != nil {
				return err
			}
			readyCatalog = spec
			return nil
		}, 30*time.Second, time.Second).Should(Succeed())

		By("snapshotting ImageCatalog spec")
		specJSON, err := json.Marshal(readyCatalog)
		Expect(err).NotTo(HaveOccurred())
		snaps.WithConfig(snaps.Filename("cnpg-imagecatalog-spec")).MatchJSON(GinkgoT(), specJSON)
	})

	It("should create Cluster", func() {
		ctx := context.Background()

		var readyCluster map[string]any

		By("checking Cluster exists")
		Eventually(func() error {
			spec, err := fetchCNPGSpec(
				ctx,
				"clusters",
				clusterName,
				cnpgapi.NewCluster(cnpgNamespace, clusterName),
			)
			if err != nil {
				return err
			}
			if _, ok := spec["managed"].(map[string]any); !ok {
				return errManagedRoleSpecMissing
			}
			readyCluster = spec
			return nil
		}, 60*time.Second, time.Second).Should(Succeed())

		By("snapshotting Cluster spec")
		specJSON, err := json.Marshal(clusterSpecSnapshot(readyCluster))
		Expect(err).NotTo(HaveOccurred())
		snaps.WithConfig(snaps.Filename("cnpg-cluster-spec")).MatchJSON(GinkgoT(), specJSON)
	})

	It("should create password secret for app", func() {
		ctx := context.Background()

		passwordSecretName := fmt.Sprintf(passwordSecretFmt, appId)
		var readySecret *corev1.Secret

		By("checking password secret exists with password key")
		Eventually(func() error {
			secret := &corev1.Secret{}
			err := Client.Core.Get().
				Resource("secrets").
				Namespace(cnpgNamespace).
				Name(passwordSecretName).
				Do(ctx).
				Into(secret)
			if err != nil {
				return fmt.Errorf("fetch password secret: %w", err)
			}
			if _, ok := secret.Data["password"]; !ok {
				return errPasswordKeyMissing
			}
			readySecret = secret
			return nil
		}, 60*time.Second, time.Second).Should(Succeed())

		By("snapshotting password secret structure")
		// Snapshot structure with redacted values
		dataKeys := make([]string, 0, len(readySecret.Data))
		for k := range readySecret.Data {
			dataKeys = append(dataKeys, k)
		}
		slices.Sort(dataKeys)
		secretSnapshot := map[string]any{
			"type":     string(readySecret.Type),
			"labels":   readySecret.Labels,
			"dataKeys": dataKeys,
		}
		snapshotJSON, err := json.Marshal(secretSnapshot)
		Expect(err).NotTo(HaveOccurred())
		snaps.WithConfig(snaps.Filename("cnpg-password-secret")).MatchJSON(GinkgoT(), snapshotJSON)
	})

	It("should have managed role reconciled", func() {
		ctx := context.Background()

		By("checking managed role is reconciled in cluster status")
		Eventually(func() error {
			cluster := cnpgapi.NewCluster(cnpgNamespace, clusterName)
			err := Client.CNPG.Get().
				Resource("clusters").
				Namespace(cnpgNamespace).
				Name(clusterName).
				Do(ctx).
				Into(cluster)
			if err != nil {
				return fmt.Errorf("fetch cluster managed roles: %w", err)
			}
			reconciledRoles, err := cnpgapi.ReconciledRoleNames(cluster)
			if err != nil {
				return fmt.Errorf("read reconciled roles: %w", err)
			}
			if reconciledRoles == nil {
				return errManagedRolesStatusMissing
			}
			if slices.Contains(reconciledRoles, appId) {
				return nil
			}
			return fmt.Errorf("%w: role=%s status=%+v", errRoleNotReconciled, appId, cluster.Object["status"])
		}, 120*time.Second, 2*time.Second).Should(Succeed())
	})

	It("should create Database for app", func() {
		ctx := context.Background()

		dbName := fmt.Sprintf(databaseNameFmt, appId)
		var appliedDb map[string]any

		By("checking Database exists and is applied")
		Eventually(func() error {
			db := cnpgapi.NewDatabase(cnpgNamespace, dbName)
			err := Client.CNPG.Get().
				Resource("databases").
				Namespace(cnpgNamespace).
				Name(dbName).
				Do(ctx).
				Into(db)
			if err != nil {
				return fmt.Errorf("fetch database: %w", err)
			}
			applied, err := cnpgapi.DatabaseApplied(db)
			if err != nil {
				return fmt.Errorf("read database status: %w", err)
			}
			if !applied {
				return errDatabaseNotApplied
			}
			spec, err := cnpgapi.Spec(db)
			if err != nil {
				return fmt.Errorf("read Database spec: %w", err)
			}
			appliedDb = spec
			return nil
		}, 180*time.Second, 2*time.Second).Should(Succeed())

		By("snapshotting Database spec")
		specJSON, err := json.Marshal(appliedDb)
		Expect(err).NotTo(HaveOccurred())
		snaps.WithConfig(snaps.Filename("cnpg-database-spec")).MatchJSON(GinkgoT(), specJSON)
	})

	It("should sync postgresql.json to app secret", func() {
		ctx := context.Background()

		var pgJson []byte

		By("checking app secret has postgresql.json")
		Eventually(func() error {
			secret := &corev1.Secret{}
			err := Client.Core.Get().
				Resource("secrets").
				Namespace(appNamespace).
				Name(appSecretName).
				Do(ctx).
				Into(secret)
			if err != nil {
				return fmt.Errorf("fetch app secret: %w", err)
			}
			data, ok := secret.Data["postgresql.json"]
			if !ok {
				return errPostgresqlJSONMissing
			}
			pgJson = data
			return nil
		}, 60*time.Second, time.Second).Should(Succeed())

		By("snapshotting postgresql.json structure (password redacted)")
		var connData map[string]any
		Expect(json.Unmarshal(pgJson, &connData)).To(Succeed())
		// Redact password for deterministic snapshot
		if pgData, ok := connData["PostgreSQL"].(map[string]any); ok {
			if cs, ok := pgData["ConnectionString"].(string); ok {
				pgData["ConnectionString"] = redactPassword(cs)
			}
		}
		redactedJSON, err := json.Marshal(connData)
		Expect(err).NotTo(HaveOccurred())
		snaps.WithConfig(snaps.Filename("cnpg-postgresql-json")).MatchJSON(GinkgoT(), redactedJSON)
	})

	It("should execute SELECT 1 using synced connection string", func() {
		By("triggering pod secret volume sync")
		err := TriggerPodSecretSync(Client, appNamespace, "ttd-localtestapp-deployment")
		Expect(err).NotTo(HaveOccurred())

		By("calling testapp dbcheck endpoint")
		var dbResp *DbCheckResponse
		Eventually(func() error {
			resp, err := FetchDbCheck()
			if err != nil {
				if _, writeErr := fmt.Fprintf(GinkgoWriter, "FetchDbCheck error: %v\n", err); writeErr != nil {
					return fmt.Errorf("write FetchDbCheck error: %w", writeErr)
				}
				return err
			}
			if !resp.Success {
				if _, writeErr := fmt.Fprintf(GinkgoWriter, "DbCheck failed: %s\n", resp.Error); writeErr != nil {
					return fmt.Errorf("write dbcheck failure: %w", writeErr)
				}
				return fmt.Errorf("%w: %s", errDBCheckFailed, resp.Error)
			}
			if resp.Result != 1 {
				return fmt.Errorf("%w: got %d", errUnexpectedDBCheckResult, resp.Result)
			}
			if _, writeErr := fmt.Fprintf(
				GinkgoWriter,
				"DbCheck succeeded, result: %d\n",
				resp.Result,
			); writeErr != nil {
				return fmt.Errorf("write dbcheck success: %w", writeErr)
			}
			dbResp = resp
			return nil
		}, 30*time.Second, time.Second).Should(Succeed())

		By("verifying response")
		Expect(dbResp).NotTo(BeNil())
		Expect(dbResp.Success).To(BeTrue())
		Expect(dbResp.Result).To(Equal(1))
	})
})
