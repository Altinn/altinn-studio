package stack

import (
	"bytes"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/cabundle"
	"altinn.studio/devenv/pkg/cabundle/cabundletest"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/ui"
)

func TestLoadCABundleCopiesTheBundleReadableByEveryone(t *testing.T) {
	source := cabundletest.WriteFile(t)
	t.Setenv(cabundle.EnvStudioCABundle, source)
	dir := filepath.Join(t.TempDir(), "infra")

	var errOut bytes.Buffer
	bundle := LoadCABundle(ui.NewOutput(io.Discard, &errOut, false), dir)
	if bundle == nil || errOut.Len() != 0 {
		t.Fatalf("LoadCABundle() = %v, warned %q; want the bundle without a warning", bundle, errOut.String())
	}

	want, err := os.ReadFile(source)
	if err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(bundle.path)
	if err != nil || !bytes.Equal(got, want) {
		t.Fatalf("copy: %q, %v; want the bundle", got, err)
	}
	if filepath.Dir(bundle.path) != dir {
		t.Errorf("copy at %s, want it in %s", bundle.path, dir)
	}
	info, err := os.Stat(bundle.path)
	if err != nil || info.Mode().Perm()&0o044 != 0o044 {
		t.Errorf("the copy is not readable by everyone: %v, %v", info, err)
	}
}

func TestLoadCABundleRewritesAChangedCopy(t *testing.T) {
	dir := t.TempDir()
	stale := filepath.Join(dir, caBundleFile)
	if err := os.WriteFile(stale, []byte("old"), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv(cabundle.EnvStudioCABundle, cabundletest.WriteFile(t))

	bundle := LoadCABundle(ui.NewOutput(io.Discard, io.Discard, false), dir)
	if bundle == nil {
		t.Fatal("no CA bundle loaded")
	}
	got, err := os.ReadFile(bundle.path)
	if err != nil || string(got) == "old" {
		t.Fatalf("copy: %q, %v; want the new bundle", got, err)
	}
	if info, err := os.Stat(bundle.path); err != nil || info.Mode().Perm()&0o044 != 0o044 {
		t.Errorf("the rewritten copy is not readable by everyone: %v, %v", info, err)
	}
}

func TestLoadCABundleUnsetIsNothing(t *testing.T) {
	t.Setenv(cabundle.EnvStudioCABundle, "")
	dir := t.TempDir()

	var errOut bytes.Buffer
	if bundle := LoadCABundle(ui.NewOutput(io.Discard, &errOut, false), dir); bundle != nil || errOut.Len() != 0 {
		t.Fatalf("LoadCABundle() = %v, warned %q; want nil without a warning", bundle, errOut.String())
	}
	if _, err := os.Stat(filepath.Join(dir, caBundleFile)); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("a copy was written: %v", err)
	}
}

// Every unusable bundle is one warning naming the variable, and no bundle. A set variable naming a missing file
// counts: before cabundle.FromEnv it was taken as unset.
func TestLoadCABundleWarnsOnceAboutAnUnusableBundle(t *testing.T) {
	empty := filepath.Join(t.TempDir(), "empty.pem")
	notPEM := filepath.Join(t.TempDir(), "corporate.pem")
	for path, content := range map[string]string{empty: "", notPEM: "bundle"} {
		if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	for name, source := range map[string]string{
		"empty":       empty,
		"not PEM":     notPEM,
		"missing":     filepath.Join(t.TempDir(), "none.pem"),
		"a directory": t.TempDir(),
	} {
		t.Run(name, func(t *testing.T) {
			t.Setenv(cabundle.EnvStudioCABundle, source)
			dir := t.TempDir()

			var errOut bytes.Buffer
			bundle := LoadCABundle(ui.NewOutput(io.Discard, &errOut, false), dir)
			if bundle != nil {
				t.Fatalf("LoadCABundle() = %v, want nil", bundle)
			}
			warning := errOut.String()
			if strings.Count(strings.TrimSpace(warning), "\n") != 0 ||
				!strings.Contains(warning, cabundle.EnvStudioCABundle) ||
				!strings.Contains(warning, "starts without the CA bundle") {
				t.Errorf("warning %q, want one line naming %s", warning, cabundle.EnvStudioCABundle)
			}
			if _, err := os.Stat(filepath.Join(dir, caBundleFile)); !errors.Is(err, os.ErrNotExist) {
				t.Errorf("a copy was written: %v", err)
			}
		})
	}
}

func TestCABundleMountIsReadOnlyWithTheVariable(t *testing.T) {
	bundle := &CABundle{path: "/data/infra/ca-bundle.pem"}
	env := map[string]string{"TZ": "Europe/Oslo"}
	existing := types.VolumeMount{HostPath: "/data/x", ContainerPath: "/x", Type: types.VolumeMountTypeBind}

	volumes := bundle.Mount(env, []types.VolumeMount{existing})

	if env[cabundle.EnvStudioCABundle] != cabundle.ContainerPath || env["TZ"] != "Europe/Oslo" {
		t.Errorf("env %v, want %s=%s added", env, cabundle.EnvStudioCABundle, cabundle.ContainerPath)
	}
	if len(volumes) != 2 || volumes[0] != existing {
		t.Fatalf("volumes %+v, want the existing one and the bundle", volumes)
	}
	got := volumes[1]
	if got.HostPath != bundle.path || got.ContainerPath != cabundle.ContainerPath || !got.ReadOnly ||
		got.Type != types.VolumeMountTypeBind {
		t.Errorf("mount %+v, want %s read-only at %s", got, bundle.path, cabundle.ContainerPath)
	}
}

func TestNilCABundleMountsNothing(t *testing.T) {
	var bundle *CABundle
	env := map[string]string{}
	if volumes := bundle.Mount(env, nil); volumes != nil || len(env) != 0 {
		t.Errorf("Mount() = %+v with env %v, want nothing", volumes, env)
	}
}
