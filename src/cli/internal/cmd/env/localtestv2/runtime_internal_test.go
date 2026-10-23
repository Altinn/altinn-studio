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
		"--dev-storage",
		"--dev-postgres=postgres/Dockerfile",
		"--with",
		"receipt",
		"--without",
		"arbeidsflate",
		"--latest",
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
	if !got.LatestImages {
		t.Error("LatestImages = false, want true")
	}
}
