//go:build windows

package cmd

import (
	"strings"
	"testing"
)

func TestParseWindowsSelfHelperFlagsRequiresParentHandle(t *testing.T) {
	t.Parallel()

	_, err := parseWindowsSelfHelperFlags([]string{
		"--operation", "update",
		"--target", `C:\Users\me\.local\bin\studioctl.exe`,
	})
	if err == nil {
		t.Fatal("parseWindowsSelfHelperFlags() error = nil, want error")
	}
	if !strings.Contains(err.Error(), "parent-handle is required") {
		t.Fatalf("parseWindowsSelfHelperFlags() error = %v, want parent-handle message", err)
	}
}

func TestParseWindowsSelfHelperFlagsRequiresTarget(t *testing.T) {
	t.Parallel()

	_, err := parseWindowsSelfHelperFlags([]string{
		"--operation", "uninstall",
		"--parent-handle", "1234",
	})
	if err == nil {
		t.Fatal("parseWindowsSelfHelperFlags() error = nil, want error")
	}
	if !strings.Contains(err.Error(), "target is required") {
		t.Fatalf("parseWindowsSelfHelperFlags() error = %v, want target message", err)
	}
}

func TestParseWindowsSelfHelperFlagsParsesUpdate(t *testing.T) {
	t.Parallel()

	got, err := parseWindowsSelfHelperFlags([]string{
		"--operation", "update",
		"--parent-handle", "1234",
		"--target", `C:\Users\me\.local\bin\studioctl.exe`,
		"--source", `C:\Temp\studioctl-download.exe`,
		"--version", "v0.1.0-preview.9",
		"--temp-dir", `C:\Temp\studioctl-self-update`,
	})
	if err != nil {
		t.Fatalf("parseWindowsSelfHelperFlags() error = %v", err)
	}
	if got.operation != "update" {
		t.Fatalf("operation = %q, want update", got.operation)
	}
	if got.parentHandle != 1234 {
		t.Fatalf("parentHandle = %d, want 1234", got.parentHandle)
	}
	if got.source != `C:\Temp\studioctl-download.exe` {
		t.Fatalf("source = %q", got.source)
	}
	if got.version != "v0.1.0-preview.9" {
		t.Fatalf("version = %q", got.version)
	}
}

func TestWindowsPowerShellPathUsesSystemDirectory(t *testing.T) {
	got := windowsPowerShellPath()
	wantSuffix := `\System32\WindowsPowerShell\v1.0\powershell.exe`
	if !strings.HasSuffix(got, wantSuffix) {
		t.Fatalf("windowsPowerShellPath() = %q, want suffix %q", got, wantSuffix)
	}
}
