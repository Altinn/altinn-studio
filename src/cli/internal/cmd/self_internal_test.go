package cmd

import (
	"bytes"
	"context"
	"errors"
	"io"
	"runtime"
	"strings"
	"testing"

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
