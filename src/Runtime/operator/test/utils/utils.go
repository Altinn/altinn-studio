package utils

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	resourcesv1alpha1 "altinn.studio/operator/api/v1alpha1"
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
		dir, err = GetProjectDir()
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

// GetProjectDir will return the directory where the project is
func GetProjectDir() (string, error) {
	for {
		if _, err := os.Stat("go.mod"); err == nil {
			if wd, err := os.Getwd(); err != nil {
				return "", err
			} else {
				return wd, nil
			}
		}

		if err := os.Chdir(".."); err != nil {
			return "", err
		}
	}
}

var k8sClient *rest.RESTClient

// GetK8sClient will construct a k8s API client
func GetK8sClient() (*rest.RESTClient, error) {
	if k8sClient != nil {
		return k8sClient, nil
	}

	home := homedir.HomeDir()
	if home == "" {
		return nil, fmt.Errorf("Could not get KUBECONFIG")
	}
	kubeconfig := filepath.Join(home, ".kube", "config")

	config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		return nil, err
	}

	err = resourcesv1alpha1.AddToScheme(scheme.Scheme)
	if err != nil {
		return nil, err
	}

	crdConfig := *config
	crdConfig.ContentConfig.GroupVersion = &schema.GroupVersion{
		Group:   resourcesv1alpha1.GroupVersion.Group,
		Version: resourcesv1alpha1.GroupVersion.Version,
	}
	crdConfig.APIPath = "/apis"
	crdConfig.NegotiatedSerializer = serializer.NewCodecFactory(scheme.Scheme)
	crdConfig.UserAgent = rest.DefaultKubernetesUserAgent()

	k8sClient, err = rest.UnversionedRESTClientFor(&crdConfig)
	if err != nil {
		return nil, err
	}

	return k8sClient, nil
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
