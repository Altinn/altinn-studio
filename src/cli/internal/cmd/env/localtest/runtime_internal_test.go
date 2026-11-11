package localtest

import (
	"flag"
	"io"
	"testing"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

func TestTheRuntimesEnvStartsWithTheBoundFlags(t *testing.T) {
	t.Parallel()
	runtime := NewRuntime(&config.Config{DataDir: t.TempDir()})
	fs := flag.NewFlagSet("env up", flag.ContinueOnError)
	runtime.BindUpFlags(fs)
	if err := fs.Parse([]string{"--dev-workflow-engine", "--pgadmin"}); err != nil {
		t.Fatalf("Parse() error = %v", err)
	}

	env, ok := runtime.Env(nil, ui.NewOutput(io.Discard, io.Discard, false)).(*Env)
	if !ok {
		t.Fatal("Env() is not a *localtest.Env")
	}
	if !env.flags.DevWorkflowEngine || !env.flags.PgAdmin || env.flags.Monitoring {
		t.Fatalf("flags = %+v, want --dev-workflow-engine and --pgadmin", env.flags)
	}
}
