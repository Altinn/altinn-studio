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

	. "github.com/onsi/ginkgo/v2" //nolint:staticcheck // Ginkgo DSL is intentionally dot-imported in test helpers.
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/runtime/serializer"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"

	resourcesv1alpha1 "altinn.studio/operator/api/v1alpha1"
	"altinn.studio/operator/internal/config"
)

const apisPath = "/apis"

// Run executes the provided command within this context.
func Run(cmd *exec.Cmd, dir string) ([]byte, error) {
	var err error
	if dir == "" {
		dir, err = config.TryFindProjectRootByGoMod()
		if err != nil {
			return nil, fmt.Errorf("find project root: %w", err)
		}
	}

	cmd.Dir = dir
	runErr := os.Chdir(cmd.Dir)
	if runErr != nil {
		_, err = fmt.Fprintf(GinkgoWriter, "chdir dir: %s\n", runErr)
		if err != nil {
			return nil, fmt.Errorf("failed to write to GinkgoWriter: %w", err)
		}
		return nil, fmt.Errorf("change directory to %s: %w", cmd.Dir, runErr)
	}

	cmd.Env = append(os.Environ(), "GO111MODULE=on")
	command := strings.Join(cmd.Args, " ")
	_, err = fmt.Fprintf(GinkgoWriter, "running: %s\n", command)
	if err != nil {
		return nil, fmt.Errorf("failed to write to GinkgoWriter: %w", err)
	}
	output, err := cmd.CombinedOutput()
	if err != nil {
		return output, fmt.Errorf("%s failed with error: (%w) %s", command, err, string(output))
	}

	return output, nil
}

// GetNonEmptyLines converts given command output string into individual objects
// according to line breakers, and ignores the empty elements in it.
func GetNonEmptyLines(output string) []string {
	var res []string
	elements := strings.SplitSeq(output, "\n")
	for element := range elements {
		if element != "" {
			res = append(res, element)
		}
	}

	return res
}

// K8sClient provides REST clients for CRDs, core resources, and Flux resources.
type K8sClient struct {
	CRD     *rest.RESTClient
	Core    *rest.RESTClient
	Flux    *rest.RESTClient
	Source  *rest.RESTClient
	CNPG    *rest.RESTClient
	Storage *rest.RESTClient
}

func newRESTClient(
	restConfig *rest.Config,
	codecFactory serializer.CodecFactory,
	apiPath, group, version, resourceName string,
) (*rest.RESTClient, error) {
	cfg := *restConfig
	cfg.GroupVersion = &schema.GroupVersion{Group: group, Version: version}
	cfg.APIPath = apiPath
	cfg.NegotiatedSerializer = codecFactory
	cfg.UserAgent = rest.DefaultKubernetesUserAgent()

	client, err := rest.UnversionedRESTClientFor(&cfg)
	if err != nil {
		return nil, fmt.Errorf("create %s REST client: %w", resourceName, err)
	}

	return client, nil
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
		return nil, fmt.Errorf("load kubeconfig for context %s: %w", contextName, err)
	}

	err = resourcesv1alpha1.AddToScheme(scheme.Scheme)
	if err != nil {
		return nil, fmt.Errorf("register operator API scheme: %w", err)
	}

	codecFactory := serializer.NewCodecFactory(scheme.Scheme)

	crdClient, err := newRESTClient(
		restConfig,
		codecFactory,
		apisPath,
		resourcesv1alpha1.GroupVersion.Group,
		resourcesv1alpha1.GroupVersion.Version,
		"CRD",
	)
	if err != nil {
		return nil, err
	}

	coreClient, err := newRESTClient(restConfig, codecFactory, "/api", "", "v1", "core")
	if err != nil {
		return nil, err
	}

	fluxClient, err := newRESTClient(restConfig, codecFactory, apisPath, "helm.toolkit.fluxcd.io", "v2", "Flux")
	if err != nil {
		return nil, err
	}

	sourceClient, err := newRESTClient(restConfig, codecFactory, apisPath, "source.toolkit.fluxcd.io", "v1", "source")
	if err != nil {
		return nil, err
	}

	cnpgClient, err := newRESTClient(restConfig, codecFactory, apisPath, "postgresql.cnpg.io", "v1", "CNPG")
	if err != nil {
		return nil, err
	}

	storageClient, err := newRESTClient(restConfig, codecFactory, apisPath, "storage.k8s.io", "v1", "storage")
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
		//nolint:gosec // Test snapshots require deterministic output, not cryptographic randomness.
		prng: rand.New(rand.NewChaCha8(seed)),
	}
}

func (r *deterministicRand) Read(p []byte) (n int, err error) {
	const byteRange = 256

	if len(p) == 1 {
		// to work around `randutil.MaybeReadByte`
		// which is used to enforce non-determinism...
		// but here we are just unit/snapshot testing stuff so it's fine
		return 1, nil
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range p {
		//nolint:gosec // UintN(256) is intentionally bounded to a single byte for deterministic test data.
		p[i] = byte(r.prng.UintN(byteRange))
	}
	return len(p), nil
}
