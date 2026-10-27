package localtestv2

import (
	"bytes"
	"io"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/cabundle"
	"altinn.studio/devenv/pkg/cabundle/cabundletest"
	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/types"
	envstack "altinn.studio/studioctl/internal/cmd/env/stack"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/localtestv2"
	"altinn.studio/studioctl/internal/ui"
)

const (
	// testCABundleSource is the CA bundle of the golden file's everything case: a comment line and one certificate.
	// The Aspire package's parity test reads the same file, so its copy has the same name.
	testCABundleSource = "testdata/ca-bundle.pem"
	// testCABundleDir is where the golden file's everything case has the copy of testCABundleSource.
	testCABundleDir = "/home/dev/.altinn-studio/ca-bundle"
)

// newTestEnv is NewEnv on a host without STUDIO_CA_BUNDLE, whatever the machine running the tests has.
func newTestEnv(cfg *config.Config, out *ui.Output, client container.ContainerClient) *Env {
	return withCABundle(NewEnv(cfg, out, client), nil)
}

func withCABundle(e *Env, bundle *envstack.CABundle) *Env {
	e.caBundle = func() *envstack.CABundle { return bundle }
	return e
}

// loadCABundle is the host's CA bundle with the given source, its copy in dir. It sets STUDIO_CA_BUNDLE, so the test
// cannot run in parallel.
func loadCABundle(t *testing.T, source, dir string) *envstack.CABundle {
	t.Helper()
	t.Setenv(cabundle.EnvStudioCABundle, source)
	bundle := envstack.LoadCABundle(ui.NewOutput(io.Discard, io.Discard, false), dir)
	if bundle == nil {
		t.Fatalf("no CA bundle loaded from %s", source)
	}
	return bundle
}

// mountedCABundle is the host path of the CA bundle that volumes mount read-only; "" for none.
func mountedCABundle(volumes []types.VolumeMount) string {
	for _, v := range volumes {
		if v.ContainerPath == cabundle.ContainerPath && v.ReadOnly {
			return v.HostPath
		}
	}
	return ""
}

// env up loads the bundle into the runtime's own directory, through the shared code, once per command: one warning
// for an unusable bundle, however often it is asked for.
func TestEnvLoadsTheCABundleOncePerCommand(t *testing.T) {
	cfg := testConfig(t)
	t.Setenv(cabundle.EnvStudioCABundle, t.TempDir())
	var stderr bytes.Buffer
	env := NewEnv(cfg, ui.NewOutput(&bytes.Buffer{}, &stderr, false), nil)
	for range 3 {
		if got := env.caBundle(); got != nil {
			t.Fatalf("got %+v for a directory", got)
		}
	}
	if n := strings.Count(stderr.String(), cabundle.EnvStudioCABundle); n != 1 {
		t.Errorf("%d warnings: %q", n, stderr.String())
	}

	t.Setenv(cabundle.EnvStudioCABundle, cabundletest.WriteFile(t))
	bundle := NewEnv(cfg, ui.NewOutput(io.Discard, io.Discard, false), nil).caBundle()
	if bundle == nil {
		t.Fatal("no CA bundle loaded")
	}
	host := mountedCABundle(bundle.Mount(map[string]string{}, nil))
	if filepath.Dir(host) != localtestv2.CABundleDir(cfg) {
		t.Errorf("copy at %s, want it in %s", host, localtestv2.CABundleDir(cfg))
	}
}

func TestOnlyTheContainersWithCABundleGetIt(t *testing.T) {
	with := defaultOptions(testCertDir, testFilesDir)
	with.Groups = OptionalGroups()
	with.RelabelBinds = true
	with.CABundle = loadCABundle(t, cabundletest.WriteFile(t), t.TempDir())
	want := mountedCABundle(with.CABundle.Mount(map[string]string{}, nil))
	without := defaultOptions(testCertDir, testFilesDir)
	without.Groups = OptionalGroups()

	var marked []string
	for name, c := range containersOf(t, with) {
		host, variable := mountedCABundle(c.Volumes), envOf(c)[cabundle.EnvStudioCABundle]
		if stack().Containers[name].CABundle {
			marked = append(marked, name)
			if host != want || variable != cabundle.ContainerPath {
				t.Errorf("%s: mounted %q, %s=%q", name, host, cabundle.EnvStudioCABundle, variable)
			}
			// The runtime relabels it as its other bind mounts; the shared Mount leaves that to the runtime.
			for _, v := range c.Volumes {
				if v.ContainerPath == cabundle.ContainerPath && v.SELinuxRelabel != types.SELinuxRelabelShared {
					t.Errorf("%s: the CA bundle's relabel is %q, want shared", name, v.SELinuxRelabel)
				}
			}
		} else if host != "" || variable != "" {
			t.Errorf("%s has the bundle without caBundle", name)
		}
	}
	if !slices.Equal(marked, []string{"pdf3"}) {
		t.Errorf("caBundle containers %v, want pdf3", marked)
	}
	for name, c := range containersOf(t, without) {
		if host, variable := mountedCABundle(
			c.Volumes,
		), envOf(c)[cabundle.EnvStudioCABundle]; host != "" ||
			variable != "" {
			t.Errorf("%s has the bundle without one: %q, %q", name, host, variable)
		}
	}
}

func TestAnUpWithAnotherCABundleChangesTheRunningEnvironment(t *testing.T) {
	cfg := testConfig(t)
	bundle := loadCABundle(t, cabundletest.WriteFile(t), t.TempDir())
	write := func(digest string) {
		t.Helper()
		if err := localtestv2.WriteState(cfg, localtestv2.State{
			CertificateDir: localtestv2.CertificateDir(cfg),
			CABundle:       digest,
		}); err != nil {
			t.Fatal(err)
		}
	}
	withBundle := withCABundle(NewEnv(cfg, nil, nil), bundle)
	write("")
	if changed, err := newTestEnv(cfg, nil, nil).Changed(UpOptions{}); err != nil || changed {
		t.Errorf("none, none: %v, %v", changed, err)
	}
	if changed, err := withBundle.Changed(UpOptions{}); err != nil || !changed {
		t.Errorf("none, then a bundle: %v, %v", changed, err)
	}
	write(bundle.Digest())
	if changed, err := withBundle.Changed(UpOptions{}); err != nil || changed {
		t.Errorf("the same bundle: %v, %v", changed, err)
	}
	if changed, err := newTestEnv(cfg, nil, nil).Changed(UpOptions{}); err != nil || !changed {
		t.Errorf("a bundle, then none: %v, %v", changed, err)
	}
	write("another")
	if changed, err := withBundle.Changed(UpOptions{}); err != nil || !changed {
		t.Errorf("another bundle: %v, %v", changed, err)
	}
}
