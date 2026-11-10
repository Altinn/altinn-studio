package cmd

import (
	"bytes"
	"io"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container/mock"

	envtypes "altinn.studio/studioctl/internal/cmd/env"
	envlocaltestv2 "altinn.studio/studioctl/internal/cmd/env/localtestv2"
	"altinn.studio/studioctl/internal/ui"
)

func TestParseUpFlagsMinimal(t *testing.T) {
	t.Parallel()
	command := testEnvCommand(t, io.Discard)
	if _, err := command.parseUpFlags(
		t.Context(),
		mock.New(),
		[]string{"-r", envlocaltestv2.Name, "--minimal"},
	); err != nil {
		t.Fatalf("parseUpFlags() = %v", err)
	}
}

func TestTheUsageNamesMinimal(t *testing.T) {
	t.Parallel()
	var out bytes.Buffer
	command := testEnvCommand(t, &out)
	if err := command.runUp(t.Context(), []string{"--help"}); err != nil {
		t.Fatalf("runUp(--help) = %v", err)
	}
	if !strings.Contains(out.String(), "--minimal") {
		t.Fatalf("usage without --minimal:\n%s", out.String())
	}
}

func TestTheStatusOfMinimalModeNamesTheModeAndTheEmulatedServices(t *testing.T) {
	t.Parallel()
	status := &envtypes.Status{
		Mode: "minimal",
		Emulated: []string{
			"register", "profile", "authentication", "authorization", "access-management",
			"events", "resource-registry", "notifications", "pdf3",
		},
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
	text := out.String()
	if !strings.HasPrefix(text, "localtest-v2 is running (minimal mode)\n") {
		t.Errorf("first line of %q", text)
	}
	const emulated = "register, profile, authentication, authorization, access-management,\n" +
		"events, resource-registry, notifications, pdf3: emulated in localtest\n"
	if !strings.HasSuffix(text, emulated) {
		t.Errorf("status %q does not end with %q", text, emulated)
	}

	status.Mode, status.Emulated = "", nil
	out.Reset()
	if err := (envStatusOutput{Status: status, Runtime: envlocaltestv2.Name, JSONOutput: false}).Print(
		ui.NewOutput(&out, io.Discard, false),
	); err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(out.String(), "localtest-v2 is running.\n") || strings.Contains(out.String(), "emulated") {
		t.Errorf("default stack status %q", out.String())
	}
}
