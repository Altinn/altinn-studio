package components

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/envtopology"
)

func caBundleOptions(t *testing.T, caBundle []byte) *Options {
	t.Helper()
	return &Options{
		Paths:    NewPaths(t.TempDir()),
		Topology: envtopology.NewLocal("8000"),
		CABundle: caBundle,
	}
}

func pdf3Resource(t *testing.T, manifest *Manifest) *resource.Container {
	t.Helper()
	for _, res := range manifest.Resources {
		if c, ok := res.(*resource.Container); ok && c.Name == ContainerPDF3 {
			return c
		}
	}
	t.Fatal("manifest has no pdf3 container")
	return nil
}

func TestReadCABundle(t *testing.T) {
	path := filepath.Join(t.TempDir(), "corporate.pem")
	if err := os.WriteFile(path, []byte("bundle"), 0o600); err != nil {
		t.Fatal(err)
	}
	got, err := ReadCABundle(func(string) string { return path })
	if err != nil || string(got) != "bundle" {
		t.Fatalf("readable: %q, %v", got, err)
	}
	for name, value := range map[string]string{"unset": "", "no such file": filepath.Join(t.TempDir(), "none.pem")} {
		if got, err := ReadCABundle(func(string) string { return value }); err != nil || got != nil {
			t.Errorf("%s: %q, %v; want nil without an error", name, got, err)
		}
	}
	// A directory exists but cannot be read as a file.
	dir := t.TempDir()
	if got, err := ReadCABundle(func(string) string { return dir }); err == nil || got != nil ||
		!strings.Contains(err.Error(), CABundleVariable+"="+dir) {
		t.Errorf("unreadable: %q, %v; want nil with an error naming the variable", got, err)
	}
}

func TestPDF3MountsTheCABundleReadOnly(t *testing.T) {
	opts := caBundleOptions(t, []byte("bundle"))
	manifest := NewManifest(opts)
	pdf3 := pdf3Resource(t, manifest)

	copyPath := CABundlePath(opts.Paths.InfraDir)
	var mounted bool
	for _, v := range pdf3.Volumes {
		if v.ContainerPath == caBundleContainerPath {
			mounted = v.HostPath == copyPath && v.ReadOnly
		}
	}
	if !mounted {
		t.Errorf("pdf3 volumes %+v, want %s read-only at %s", pdf3.Volumes, copyPath, caBundleContainerPath)
	}
	want := CABundleVariable + "=" + caBundleContainerPath
	found := false
	for _, entry := range pdf3.Env {
		found = found || entry == want
	}
	if !found {
		t.Errorf("pdf3 env %v lacks %s", pdf3.Env, want)
	}

	if err := manifest.Prepare(t.Context()); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(copyPath)
	if err != nil || string(data) != "bundle" {
		t.Fatalf("copy: %q, %v", data, err)
	}
	if info, err := os.Stat(copyPath); err != nil || info.Mode().Perm()&0o044 != 0o044 {
		t.Errorf("the copy is not readable by everyone: %v, %v", info, err)
	}
}

func TestOnlyPDF3GetsTheCABundle(t *testing.T) {
	opts := caBundleOptions(t, []byte("bundle"))
	opts.IncludeMonitoring = true
	opts.IncludePgAdmin = true
	for _, res := range NewManifest(opts).Resources {
		c, ok := res.(*resource.Container)
		if !ok || c.Name == ContainerPDF3 {
			continue
		}
		for _, entry := range c.Env {
			if strings.HasPrefix(entry, CABundleVariable+"=") {
				t.Errorf("%s has %s", c.Name, entry)
			}
		}
		for _, v := range c.Volumes {
			if v.ContainerPath == caBundleContainerPath {
				t.Errorf("%s mounts the CA bundle", c.Name)
			}
		}
	}
}

func TestWithoutACABundleNothingChanges(t *testing.T) {
	opts := caBundleOptions(t, nil)
	manifest := NewManifest(opts)
	pdf3 := pdf3Resource(t, manifest)
	if len(pdf3.Volumes) != 0 {
		t.Errorf("pdf3 volumes %+v, want none", pdf3.Volumes)
	}
	for _, entry := range pdf3.Env {
		if strings.HasPrefix(entry, CABundleVariable+"=") {
			t.Errorf("pdf3 has %s", entry)
		}
	}
	for _, p := range manifest.Preparations {
		if p.Name == "pdf3 CA bundle" {
			t.Error("a preparation copies a CA bundle that is not there")
		}
	}
	if err := manifest.Prepare(t.Context()); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(CABundlePath(opts.Paths.InfraDir)); !os.IsNotExist(err) {
		t.Errorf("a copy was written: %v", err)
	}
}
