package localtestv2

import (
	"bytes"
	"io"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/localtestv2"
	"altinn.studio/studioctl/internal/ui"
)

// env down removes an app container left on the network, which the network's removal would fail on, and then the
// network itself.
func TestDownRemovesTheAppContainersAndTheNetwork(t *testing.T) {
	t.Parallel()
	f, client := newFakeRuntime()
	cfg := testConfig(t)
	writeTestState(t, cfg, false)
	var out bytes.Buffer
	env := NewEnv(cfg, ui.NewOutput(&out, io.Discard, false), client)
	if err := env.applyResources(
		t.Context(),
		resources(defaultOptions(localtestv2.CertificateDir(cfg), localtestv2.FilesDir(cfg)), nil),
		false,
	); err != nil {
		t.Fatal(err)
	}
	const app = "localtest-app-test-app"
	f.containers[app] = types.ContainerConfig{
		Name:     app,
		Networks: []string{localtestv2.Network},
		Labels:   map[string]string{localtestv2.Label: localtestv2.LabelAppContainer},
	}
	if err := env.Down(t.Context()); err != nil {
		t.Fatalf("Down: %v\n%s", err, out.String())
	}
	if left := f.left(); len(left) != 0 {
		t.Errorf("left after env down: %v", left)
	}
	if !strings.Contains(out.String(), "Removed app container "+app) {
		t.Errorf("output does not name the app container:\n%s", out.String())
	}
}
