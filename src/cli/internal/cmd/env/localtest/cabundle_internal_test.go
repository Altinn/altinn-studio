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
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

// env up loads the host's STUDIO_CA_BUNDLE and gives pdf3 the copy in the infra directory: the step between
// components.LoadCABundle and pdf3's Mount, which the components tests cover each on its own.
func TestStartGivesPDF3TheHostsCABundle(t *testing.T) {
	t.Setenv(cabundle.EnvStudioCABundle, cabundletest.WriteFile(t))
	t.Setenv(config.EnvInternalDevMode, "")
	dataDir := t.TempDir()
	env := NewEnv(
		&config.Config{DataDir: dataDir, Images: testResetImages()},
		ui.NewOutput(io.Discard, io.Discard, false),
		containermock.New(),
	)

	opts, err := env.buildResourceOptions(t.Context(), "", "", false, testTopology(), envtypes.UpOptions{})
	if err != nil {
		t.Fatalf("buildResourceOptions() error = %v", err)
	}
	pdf3 := mustContainerSpec(t, components.NewManifest(opts).Resources, components.ContainerPDF3)

	infraDir := components.NewPaths(dataDir).InfraDir
	if !slices.ContainsFunc(pdf3.Volumes, func(v containertypes.VolumeMount) bool {
		return filepath.Dir(v.HostPath) == infraDir && v.ContainerPath == cabundle.ContainerPath && v.ReadOnly
	}) {
		t.Fatalf(
			"pdf3 volumes = %+v, want a copy in %s read-only at %s",
			pdf3.Volumes,
			infraDir,
			cabundle.ContainerPath,
		)
	}
	assertEnvValue(t, pdf3.Environment, cabundle.EnvStudioCABundle, cabundle.ContainerPath)
}
