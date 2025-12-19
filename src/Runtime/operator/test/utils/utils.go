package utils

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"math/rand/v2"
	"sync"

	resourcesv1alpha1 "altinn.studio/operator/api/v1alpha1"
	"altinn.studio/operator/internal/config"
	. "github.com/onsi/ginkgo/v2" //nolint:revive,staticcheck
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/runtime/serializer"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
)

const apisPath = "/apis"

// Run executes the provided command within this context
func Run(cmd *exec.Cmd, dir string) ([]byte, error) {
	var err error
	if dir == "" {
		dir, err = config.TryFindProjectRootByGoMod()
		if err != nil {
			return nil, err
		}
	}

	cmd.Dir = dir
	if err := os.Chdir(cmd.Dir); err != nil {
		_, err = fmt.Fprintf(GinkgoWriter, "chdir dir: %s\n", err)
		if err != nil {
			return nil, fmt.Errorf("failed to write to GinkgoWriter: %w", err)
		}
	}

	cmd.Env = append(os.Environ(), "GO111MODULE=on")
	command := strings.Join(cmd.Args, " ")
	_, err = fmt.Fprintf(GinkgoWriter, "running: %s\n", command)
	if err != nil {
		return nil, fmt.Errorf("failed to write to GinkgoWriter: %w", err)
	}
	output, err := cmd.CombinedOutput()
	if err != nil {
		return output, fmt.Errorf("%s failed with error: (%v) %s", command, err, string(output))
	}

	return output, nil
}

// GetNonEmptyLines converts given command output string into individual objects
// according to line breakers, and ignores the empty elements in it.
func GetNonEmptyLines(output string) []string {
	var res []string
	elements := strings.Split(output, "\n")
	for _, element := range elements {
		if element != "" {
			res = append(res, element)
		}
	}

	return res
}

// K8sClient provides REST clients for CRDs, core resources, and Flux resources
type K8sClient struct {
	CRD     *rest.RESTClient
	Core    *rest.RESTClient
	Flux    *rest.RESTClient
	Source  *rest.RESTClient
	CNPG    *rest.RESTClient
	Storage *rest.RESTClient
}

// CreateK8sClient returns a client configured for the specified kubectl context.
// contextName should be the kind cluster context (e.g., "kind-runtime-fixture-kind-standard").
func CreateK8sClient(contextName string) (*K8sClient, error) {
	kubeconfig := filepath.Join(homedir.HomeDir(), ".kube", "config")

	restConfig, err := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(
		&clientcmd.ClientConfigLoadingRules{ExplicitPath: kubeconfig},
		&clientcmd.ConfigOverrides{CurrentContext: contextName},
	).ClientConfig()
	if err != nil {
		return nil, err
	}

	err = resourcesv1alpha1.AddToScheme(scheme.Scheme)
	if err != nil {
		return nil, err
	}

	codecFactory := serializer.NewCodecFactory(scheme.Scheme)

	// CRD client
	crdConfig := *restConfig
	crdConfig.GroupVersion = &schema.GroupVersion{
		Group:   resourcesv1alpha1.GroupVersion.Group,
		Version: resourcesv1alpha1.GroupVersion.Version,
	}
	crdConfig.APIPath = apisPath
	crdConfig.NegotiatedSerializer = codecFactory
	crdConfig.UserAgent = rest.DefaultKubernetesUserAgent()

	crdClient, err := rest.UnversionedRESTClientFor(&crdConfig)
	if err != nil {
		return nil, err
	}

	// Core client
	coreConfig := *restConfig
	coreConfig.GroupVersion = &schema.GroupVersion{Group: "", Version: "v1"}
	coreConfig.APIPath = "/api"
	coreConfig.NegotiatedSerializer = codecFactory
	coreConfig.UserAgent = rest.DefaultKubernetesUserAgent()

	coreClient, err := rest.UnversionedRESTClientFor(&coreConfig)
	if err != nil {
		return nil, err
	}

	// Flux client (HelmRelease, Kustomization, etc.)
	fluxConfig := *restConfig
	fluxConfig.GroupVersion = &schema.GroupVersion{
		Group:   "helm.toolkit.fluxcd.io",
		Version: "v2",
	}
	fluxConfig.APIPath = apisPath
	fluxConfig.NegotiatedSerializer = codecFactory
	fluxConfig.UserAgent = rest.DefaultKubernetesUserAgent()

	fluxClient, err := rest.UnversionedRESTClientFor(&fluxConfig)
	if err != nil {
		return nil, err
	}

	// Source client (HelmRepository, etc.)
	sourceConfig := *restConfig
	sourceConfig.GroupVersion = &schema.GroupVersion{
		Group:   "source.toolkit.fluxcd.io",
		Version: "v1",
	}
	sourceConfig.APIPath = apisPath
	sourceConfig.NegotiatedSerializer = codecFactory
	sourceConfig.UserAgent = rest.DefaultKubernetesUserAgent()

	sourceClient, err := rest.UnversionedRESTClientFor(&sourceConfig)
	if err != nil {
		return nil, err
	}

	// CNPG client (Cluster, Database, ImageCatalog)
	cnpgConfig := *restConfig
	cnpgConfig.GroupVersion = &schema.GroupVersion{
		Group:   "postgresql.cnpg.io",
		Version: "v1",
	}
	cnpgConfig.APIPath = apisPath
	cnpgConfig.NegotiatedSerializer = codecFactory
	cnpgConfig.UserAgent = rest.DefaultKubernetesUserAgent()

	cnpgClient, err := rest.UnversionedRESTClientFor(&cnpgConfig)
	if err != nil {
		return nil, err
	}

	// Storage client (StorageClass, etc.)
	storageConfig := *restConfig
	storageConfig.GroupVersion = &schema.GroupVersion{
		Group:   "storage.k8s.io",
		Version: "v1",
	}
	storageConfig.APIPath = apisPath
	storageConfig.NegotiatedSerializer = codecFactory
	storageConfig.UserAgent = rest.DefaultKubernetesUserAgent()

	storageClient, err := rest.UnversionedRESTClientFor(&storageConfig)
	if err != nil {
		return nil, err
	}

	return &K8sClient{
		CRD:     crdClient,
		Core:    coreClient,
		Flux:    fluxClient,
		Source:  sourceClient,
		CNPG:    cnpgClient,
		Storage: storageClient,
	}, nil
}

type deterministicRand struct {
	prng *rand.Rand
	mu   sync.Mutex
}

func NewDeterministicRand() io.Reader {
	// ChaCha8 with a fixed seed for deterministic output
	var seed [32]byte
	seed[0] = 0x13
	seed[1] = 0x37
	return &deterministicRand{
		prng: rand.New(rand.NewChaCha8(seed)),
	}
}

func (r *deterministicRand) Read(p []byte) (n int, err error) {
	if len(p) == 1 {
		// to work around `randutil.MaybeReadByte`
		// which is used to enforce non-determinism...
		// but here we are just unit/snapshot testing stuff so it's fine
		return 1, nil
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range p {
		p[i] = byte(r.prng.UintN(256))
	}
	return len(p), nil
}
