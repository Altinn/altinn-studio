package localtest

import (
	"io"
	"path/filepath"
	"slices"
	"testing"

	"altinn.studio/devenv/pkg/cabundle"
	"altinn.studio/devenv/pkg/cabundle/cabundletest"
	containermock "altinn.studio/devenv/pkg/container/mock"
	containertypes "altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

// env up loads the host's STUDIO_CA_BUNDLE and gives pdf3 the copy in the infra directory: the step between
// stack.LoadCABundle and pdf3's Mount, which the stack and components tests each cover only on their side.
func TestStartGivesPDF3TheHostsCABundle(t *testing.T) {
	t.Setenv(cabundle.EnvStudioCABundle, cabundletest.WriteFile(t))
	t.Setenv(config.EnvInternalDevMode, "")
	dataDir := t.TempDir()
	env := NewEnv(
		&config.Config{DataDir: dataDir, Images: testResetImages()},
		ui.NewOutput(io.Discard, io.Discard, false),
		containermock.New(),
	)

	opts, err := env.buildResourceOptions(t.Context(), "", "", false, testTopology(), defaultUpOptions())
	if err != nil {
		t.Fatalf("buildResourceOptions() error = %v", err)
	}
	pdf3 := mustContainerSpec(t, components.NewManifest(opts).Resources, components.ContainerPDF3)

	copyPath := filepath.Join(components.NewPaths(dataDir).InfraDir, "ca-bundle.pem")
	if !slices.ContainsFunc(pdf3.Volumes, func(v containertypes.VolumeMount) bool {
		return v.HostPath == copyPath && v.ContainerPath == cabundle.ContainerPath && v.ReadOnly
	}) {
		t.Fatalf("pdf3 volumes = %+v, want %s read-only at %s", pdf3.Volumes, copyPath, cabundle.ContainerPath)
	}
	assertEnvValue(t, pdf3.Environment, cabundle.EnvStudioCABundle, cabundle.ContainerPath)
}
