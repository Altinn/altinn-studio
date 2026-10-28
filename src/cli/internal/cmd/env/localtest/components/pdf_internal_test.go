package components

import (
	"io"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/cabundle"
	"altinn.studio/devenv/pkg/cabundle/cabundletest"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/cmd/env/stack"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/ui"
)

func caBundleOptions(t *testing.T, withBundle bool) *Options {
	t.Helper()
	paths := NewPaths(t.TempDir())
	var bundle *stack.CABundle
	if withBundle {
		t.Setenv(cabundle.EnvStudioCABundle, cabundletest.WriteFile(t))
		bundle = stack.LoadCABundle(ui.NewOutput(io.Discard, io.Discard, false), paths.InfraDir)
		if bundle == nil {
			t.Fatal("no CA bundle loaded")
		}
	}
	return &Options{
		Paths:    paths,
		Topology: envtopology.NewLocal("8000"),
		CABundle: bundle,
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

func TestPDF3TakesTheCABundle(t *testing.T) {
	pdf3 := pdf3Resource(t, NewManifest(caBundleOptions(t, true)))

	var mounted bool
	for _, v := range pdf3.Volumes {
		mounted = mounted || v.ContainerPath == cabundle.ContainerPath && v.ReadOnly
	}
	if !mounted {
		t.Errorf("pdf3 volumes %+v, want the CA bundle read-only at %s", pdf3.Volumes, cabundle.ContainerPath)
	}
	want := cabundle.EnvStudioCABundle + "=" + cabundle.ContainerPath
	found := false
	for _, entry := range pdf3.Env {
		found = found || entry == want
	}
	if !found {
		t.Errorf("pdf3 env %v lacks %s", pdf3.Env, want)
	}
}

func TestOnlyPDF3GetsTheCABundle(t *testing.T) {
	opts := caBundleOptions(t, true)
	opts.IncludeMonitoring = true
	opts.IncludePgAdmin = true
	for _, res := range NewManifest(opts).Resources {
		c, ok := res.(*resource.Container)
		if !ok || c.Name == ContainerPDF3 {
			continue
		}
		for _, entry := range c.Env {
			if strings.HasPrefix(entry, cabundle.EnvStudioCABundle+"=") {
				t.Errorf("%s has %s", c.Name, entry)
			}
		}
		for _, v := range c.Volumes {
			if v.ContainerPath == cabundle.ContainerPath {
				t.Errorf("%s mounts the CA bundle", c.Name)
			}
		}
	}
}

func TestWithoutACABundlePDF3IsUnchanged(t *testing.T) {
	pdf3 := pdf3Resource(t, NewManifest(caBundleOptions(t, false)))
	if len(pdf3.Volumes) != 0 {
		t.Errorf("pdf3 volumes %+v, want none", pdf3.Volumes)
	}
	for _, entry := range pdf3.Env {
		if strings.HasPrefix(entry, cabundle.EnvStudioCABundle+"=") {
			t.Errorf("pdf3 has %s", entry)
		}
	}
}
