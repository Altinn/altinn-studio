package cmd

import (
	"bytes"
	"errors"
	"io"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container/mock"

	envtypes "altinn.studio/studioctl/internal/cmd/env"
	envlocaltestv2 "altinn.studio/studioctl/internal/cmd/env/localtestv2"
	"altinn.studio/studioctl/internal/ui"
)

func TestParseUpFlagsHostAndPort(t *testing.T) {
	t.Parallel()
	command := testEnvCommand(t, io.Discard)
	args := []string{"-r", envlocaltestv2.Name, "--host", "origin.test", "--port", "0"}
	if _, err := command.parseUpFlags(t.Context(), mock.New(), args); err != nil {
		t.Fatalf("parseUpFlags() = %v", err)
	}
	if _, err := command.parseUpFlags(
		t.Context(),
		mock.New(),
		[]string{"-r", envlocaltestv2.Name, "--port", "eighty"},
	); err == nil {
		t.Fatal("--port eighty parsed")
	}
}

func TestTheLocaltestRuntimeRefusesTheOriginFlags(t *testing.T) {
	t.Parallel()
	command := testEnvCommand(t, io.Discard)
	_, err := command.parseUpFlags(t.Context(), mock.New(), []string{"-r", "localtest", "--host", "origin.test"})
	if !errors.Is(err, ErrInvalidFlagValue) || !strings.Contains(err.Error(), "--host is not supported") {
		t.Fatalf("parseUpFlags() = %v", err)
	}
}

func TestTheStatusNamesTheOrigin(t *testing.T) {
	t.Parallel()
	status := &envtypes.Status{
		Origin: "http://origin.test:18000",
		Containers: []envtypes.ContainerStatus{
			{Name: "localtest-v2-postgres", Image: "", ImageID: "", Status: "running"},
		},
		Running:    true,
		AnyRunning: true,
	}
	var out bytes.Buffer
	if err := (envStatusOutput{Status: status, Runtime: envlocaltestv2.Name, JSONOutput: false}).Print(
		ui.NewOutput(&out, io.Discard, false),
	); err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(out.String(), "localtest-v2 is running.\nOrigin: http://origin.test:18000\n") {
		t.Errorf("status %q", out.String())
	}
}
