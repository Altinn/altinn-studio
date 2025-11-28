package utils

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	resourcesv1alpha1 "altinn.studio/operator/api/v1alpha1"
	"altinn.studio/operator/internal/config"
	. "github.com/onsi/ginkgo/v2" //nolint:golint,revive
	"golang.org/x/exp/rand"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/runtime/serializer"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
)

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
		fmt.Fprintf(GinkgoWriter, "chdir dir: %s\n", err)
	}

	cmd.Env = append(os.Environ(), "GO111MODULE=on")
	command := strings.Join(cmd.Args, " ")
	fmt.Fprintf(GinkgoWriter, "running: %s\n", command)
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

// K8sClient provides REST clients for both CRDs and core resources
type K8sClient struct {
	CRD  *rest.RESTClient
	Core *rest.RESTClient
}

// CreateK8sClient returns a client configured for the specified kubectl context.
// contextName should be the kind cluster context (e.g., "kind-runtime-fixture-kind-standard").
func CreateK8sClient(contextName string) (*K8sClient, error) {
	kubeconfig := filepath.Join(homedir.HomeDir(), ".kube", "config")

	config, err := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(
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
	crdConfig := *config
	crdConfig.ContentConfig.GroupVersion = &schema.GroupVersion{
		Group:   resourcesv1alpha1.GroupVersion.Group,
		Version: resourcesv1alpha1.GroupVersion.Version,
	}
	crdConfig.APIPath = "/apis"
	crdConfig.NegotiatedSerializer = codecFactory
	crdConfig.UserAgent = rest.DefaultKubernetesUserAgent()

	crdClient, err := rest.UnversionedRESTClientFor(&crdConfig)
	if err != nil {
		return nil, err
	}

	// Core client
	coreConfig := *config
	coreConfig.ContentConfig.GroupVersion = &schema.GroupVersion{Group: "", Version: "v1"}
	coreConfig.APIPath = "/api"
	coreConfig.NegotiatedSerializer = codecFactory
	coreConfig.UserAgent = rest.DefaultKubernetesUserAgent()

	coreClient, err := rest.UnversionedRESTClientFor(&coreConfig)
	if err != nil {
		return nil, err
	}

	return &K8sClient{CRD: crdClient, Core: coreClient}, nil
}

type deterministicRand struct {
	prng *rand.Rand
}

func NewDeterministicRand() io.Reader {
	return &deterministicRand{
		prng: rand.New(rand.NewSource(1337)),
	}
}

func (r *deterministicRand) Read(p []byte) (n int, err error) {
	if len(p) == 1 {
		// to work around `randutil.MaybeReadByte`
		// which is used to enforce non-determinism...
		// but here we are just unit/snapshot testing stuff so it's fine
		return 1, nil
	}

	return r.prng.Read(p)
}
