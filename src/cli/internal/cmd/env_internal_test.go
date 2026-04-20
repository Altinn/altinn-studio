package cmd

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container/mock"
	containertypes "altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

func TestEnvUpJSON_AlreadyRunning(t *testing.T) {
	t.Parallel()

	client := mock.New()
	client.ContainerStateFunc = func(context.Context, string) (containertypes.ContainerState, error) {
		return containertypes.ContainerState{Status: "running", Running: true}, nil
	}

	var out bytes.Buffer
	command := &EnvCommand{
		cfg: &config.Config{},
		out: ui.NewOutput(&out, io.Discard, false),
	}
	err := command.runLocaltestUp(context.Background(), client, envUpFlags{
		runtime:    runtimeLocaltest,
		detach:     true,
		jsonOutput: true,
	})
	if err != nil {
		t.Fatalf("runLocaltestUp() error = %v", err)
	}

	var got envUpOutput
	if err := json.Unmarshal([]byte(strings.TrimSpace(out.String())), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if got.Runtime != runtimeLocaltest || !got.Running || got.Started || !got.AlreadyRunning {
		t.Fatalf("output = %+v, want already running result", got)
	}
}

func TestEnvUpJSONRejectsForeground(t *testing.T) {
	t.Parallel()

	command := &EnvCommand{out: ui.NewOutput(io.Discard, io.Discard, false)}
	err := command.runUp(context.Background(), []string{"--json", "--detach=false"})
	if err == nil {
		t.Fatal("runUp() error = nil, want error")
	}
	if !strings.Contains(err.Error(), "--json requires --detach=true") {
		t.Fatalf("runUp() error = %v, want detach/json error", err)
	}
}
