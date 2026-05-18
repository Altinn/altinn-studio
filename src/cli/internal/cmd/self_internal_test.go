package cmd

import (
	"bytes"
	"context"
	"errors"
	"io"
	"runtime"
	"strings"
	"testing"

	selfcmd "altinn.studio/studioctl/internal/cmd/self"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

func TestSelfUninstallConfirmationRequiresYesWithoutTerminal(t *testing.T) {
	command := &SelfCommand{
		out: ui.NewOutput(io.Discard, io.Discard, false),
		interactiveInput: func() (io.Reader, func() error, error) {
			return nil, nil, io.ErrClosedPipe
		},
	}

	proceed, err := command.confirmUninstallIfNeeded(context.Background(), selfUninstallFlags{})
	if err == nil {
		t.Fatal("confirmUninstallIfNeeded() error = nil, want error")
	}
	if !errors.Is(err, ErrInvalidFlagValue) {
		t.Fatalf("confirmUninstallIfNeeded() error = %v, want %v", err, ErrInvalidFlagValue)
	}
	if !strings.Contains(err.Error(), "--yes is required when no terminal input is available") {
		t.Fatalf("confirmUninstallIfNeeded() error = %v, want --yes message", err)
	}
	if proceed {
		t.Fatal("confirmUninstallIfNeeded() proceed = true, want false")
	}
}

func TestSelfUsageHidesInternalSubcommands(t *testing.T) {
	t.Parallel()

	command := &SelfCommand{}

	usage := command.Usage()
	if strings.Contains(usage, selfCompleteInstallSubcmd) {
		t.Fatalf("Usage() includes %s:\n%s", selfCompleteInstallSubcmd, usage)
	}
	if strings.Contains(usage, selfMigrateSubcmd) {
		t.Fatalf("Usage() includes %s:\n%s", selfMigrateSubcmd, usage)
	}
}

func TestInstalledSelfCommandArgsIncludesConfigFlags(t *testing.T) {
	t.Parallel()

	command := &SelfCommand{
		cfg: &config.Config{
			Home:      "/tmp/studioctl-home",
			SocketDir: "/tmp/studioctl-socket",
			Verbose:   true,
		},
	}

	got := command.installedSelfCommandArgs(selfCompleteInstallSubcmd)
	want := []string{
		"--home", "/tmp/studioctl-home",
		"--socket-dir", "/tmp/studioctl-socket",
		"--verbose",
		"self", selfCompleteInstallSubcmd,
	}
	if strings.Join(got, "\x00") != strings.Join(want, "\x00") {
		t.Fatalf("installedSelfCommandArgs() = %#v, want %#v", got, want)
	}
}

func TestSelfUninstallRunRequiresConfirmationBeforePrepare(t *testing.T) {
	if runtime.GOOS == osutil.OSWindows {
		t.Skip("self uninstall exits before confirmation on Windows")
	}
	command := &SelfCommand{
		out: ui.NewOutput(io.Discard, io.Discard, false),
		interactiveInput: func() (io.Reader, func() error, error) {
			return nil, nil, io.ErrClosedPipe
		},
	}

	err := command.runUninstall(context.Background(), nil)
	if err == nil {
		t.Fatal("runUninstall() error = nil, want error")
	}
	if !errors.Is(err, ErrInvalidFlagValue) {
		t.Fatalf("runUninstall() error = %v, want %v", err, ErrInvalidFlagValue)
	}
}

func TestSelfUninstallConfirmationYesSkipsPrompt(t *testing.T) {
	command := &SelfCommand{
		out: ui.NewOutput(io.Discard, io.Discard, false),
		interactiveInput: func() (io.Reader, func() error, error) {
			t.Fatal("interactiveInput() called with --yes")
			return nil, nil, nil
		},
	}

	proceed, err := command.confirmUninstallIfNeeded(
		context.Background(),
		selfUninstallFlags{yes: true},
	)
	if err != nil {
		t.Fatalf("confirmUninstallIfNeeded() error = %v", err)
	}
	if !proceed {
		t.Fatal("confirmUninstallIfNeeded() proceed = false, want true")
	}
}

func TestSelfUninstallConfirmationCancel(t *testing.T) {
	cleanupCalled := false

	var out bytes.Buffer
	command := &SelfCommand{
		out: ui.NewOutput(&out, io.Discard, false),
		interactiveInput: func() (io.Reader, func() error, error) {
			return strings.NewReader("n\n"), func() error {
				cleanupCalled = true
				return nil
			}, nil
		},
	}

	proceed, err := command.confirmUninstallIfNeeded(context.Background(), selfUninstallFlags{})
	if err != nil {
		t.Fatalf("confirmUninstallIfNeeded() error = %v", err)
	}
	if proceed {
		t.Fatal("confirmUninstallIfNeeded() proceed = true, want false")
	}
	if !cleanupCalled {
		t.Fatal("interactive input cleanup was not called")
	}
	got := out.String()
	if !strings.Contains(got, " and delete local data? [y/N]: ") {
		t.Fatalf("output = %q, want confirmation prompt", got)
	}
	if !strings.Contains(got, "Uninstall cancelled") {
		t.Fatalf("output = %q, want cancellation message", got)
	}
}

func TestInstallLocationPickerUsesProvidedInput(t *testing.T) {
	t.Parallel()

	const installDir = "/tmp/studioctl-bin"
	out := ui.NewOutput(io.Discard, io.Discard, false)
	picker := selfcmd.NewPicker(
		out,
		strings.NewReader("\n"),
		[]selfcmd.Candidate{
			{
				Path:        installDir,
				Writable:    true,
				Recommended: true,
			},
		},
	)

	got, err := picker.Run(context.Background())
	if err != nil {
		t.Fatalf("installLocationPicker.Run() error = %v", err)
	}
	if got != installDir {
		t.Fatalf("installLocationPicker.Run() = %q, want %q", got, installDir)
	}
}

func TestDefaultInstallLocation(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		want       string
		candidates []selfcmd.Candidate
		wantOK     bool
	}{
		{
			name: "uses recommended writable candidate",
			candidates: []selfcmd.Candidate{
				{Path: "/not-selected", Writable: true},
				{Path: "/selected", Writable: true, Recommended: true},
			},
			want:   "/selected",
			wantOK: true,
		},
		{
			name: "falls back to first writable candidate",
			candidates: []selfcmd.Candidate{
				{Path: "/not-writable", Writable: false, Recommended: true},
				{Path: "/selected", Writable: true},
			},
			want:   "/selected",
			wantOK: true,
		},
		{
			name: "returns false when no writable candidates exist",
			candidates: []selfcmd.Candidate{
				{Path: "/not-writable", Writable: false, Recommended: true},
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			got, ok := selfcmd.DefaultInstallLocation(tc.candidates)
			if ok != tc.wantOK {
				t.Fatalf("defaultInstallLocation() ok = %v, want %v", ok, tc.wantOK)
			}
			if got != tc.want {
				t.Fatalf("defaultInstallLocation() = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestInstallLocationPathInstructionsWindowsUsesTrailingBackslash(t *testing.T) {
	t.Parallel()
	if runtime.GOOS != osutil.OSWindows {
		t.Skip("windows-specific PATH instructions")
	}

	const dir = `C:\Users\alice\AppData\Roaming\altinn-studio\bin`

	got := selfcmd.LocationPathInstructions(dir)
	if !strings.Contains(got, dir+`\`) {
		t.Fatalf("installLocationPathInstructions() = %q, want trailing backslash for %q", got, dir)
	}
}
