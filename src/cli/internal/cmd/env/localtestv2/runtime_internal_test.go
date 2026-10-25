package localtestv2

import (
	"flag"
	"io"
	"maps"
	"slices"
	"testing"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

func TestTheRuntimesEnvStartsWithTheBoundFlags(t *testing.T) {
	t.Parallel()
	runtime := NewRuntime(&config.Config{DataDir: t.TempDir()})
	fs := flag.NewFlagSet("env up", flag.ContinueOnError)
	runtime.BindUpFlags(fs)
	args := []string{
		"--dev-storage", "--dev-postgres=postgres/Dockerfile", "--with", "receipt", "--without", "arbeidsflate",
		"--host", "runtime.test", "--port", "0", "--minimal", "--latest",
	}
	if err := fs.Parse(args); err != nil {
		t.Fatalf("Parse() error = %v", err)
	}

	env, ok := runtime.Env(nil, ui.NewOutput(io.Discard, io.Discard, false)).(*Env)
	if !ok {
		t.Fatal("Env() is not a *localtestv2.Env")
	}
	got := env.flags
	if want := map[string]string{
		"storage":  "",
		"postgres": "postgres/Dockerfile",
	}; !maps.Equal(
		got.DevComponents,
		want,
	) {
		t.Errorf("DevComponents = %v, want %v", got.DevComponents, want)
	}
	if !slices.Equal(got.With, []string{"receipt"}) || !slices.Equal(got.Without, []string{"arbeidsflate"}) {
		t.Errorf("With, Without = %v, %v", got.With, got.Without)
	}
	if got.PublicHost != "runtime.test" || got.PublicPort == nil || *got.PublicPort != 0 {
		t.Errorf("PublicHost, PublicPort = %q, %v", got.PublicHost, got.PublicPort)
	}
	if !got.Minimal || !got.LatestImages {
		t.Errorf("Minimal, LatestImages = %v, %v", got.Minimal, got.LatestImages)
	}
}

func TestTheRuntimeRefusesAPortThatIsNotANumber(t *testing.T) {
	t.Parallel()
	fs := flag.NewFlagSet("env up", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	NewRuntime(&config.Config{DataDir: t.TempDir()}).BindUpFlags(fs)
	if err := fs.Parse([]string{"--port", "eighty"}); err == nil {
		t.Fatal("--port eighty parsed")
	}
}
