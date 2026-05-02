package localtest

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

const testBlockName = "studioctl localtest"

func TestInspectHostsContentInstalled(t *testing.T) {
	t.Parallel()

	content := strings.Join([]string{
		"# BEGIN studioctl localtest",
		"127.0.0.1 local.altinn.cloud",
		"127.0.0.1 pdf.local.altinn.cloud",
		"# END studioctl localtest",
		"",
	}, "\n")

	status, err := inspectHostsContent(
		content,
		testBlockName,
		"127.0.0.1",
		[]string{"local.altinn.cloud", "pdf.local.altinn.cloud"},
	)
	if err != nil {
		t.Fatalf("inspectHostsContent() error = %v", err)
	}
	if status.State != HostsStateInstalled {
		t.Fatalf("State = %q, want %q", status.State, HostsStateInstalled)
	}
	if !status.Managed {
		t.Fatal("Managed = false, want true")
	}
}

func TestInspectHostsContentPresentOutsideManagedBlock(t *testing.T) {
	t.Parallel()

	content := "127.0.0.1 local.altinn.cloud pdf.local.altinn.cloud\n"

	status, err := inspectHostsContent(
		content,
		testBlockName,
		"127.0.0.1",
		[]string{"local.altinn.cloud", "pdf.local.altinn.cloud"},
	)
	if err != nil {
		t.Fatalf("inspectHostsContent() error = %v", err)
	}
	if status.State != HostsStatePresent {
		t.Fatalf("State = %q, want %q", status.State, HostsStatePresent)
	}
	if status.Managed {
		t.Fatal("Managed = true, want false")
	}
}

func TestInspectHostsContentPresentWithDuplicateOutsideManagedBlock(t *testing.T) {
	t.Parallel()

	content := strings.Join([]string{
		"127.0.0.1 local.altinn.cloud",
		"",
		"# BEGIN studioctl localtest",
		"127.0.0.1 local.altinn.cloud",
		"127.0.0.1 pdf.local.altinn.cloud",
		"# END studioctl localtest",
		"",
	}, "\n")

	status, err := inspectHostsContent(
		content,
		testBlockName,
		"127.0.0.1",
		[]string{"local.altinn.cloud", "pdf.local.altinn.cloud"},
	)
	if err != nil {
		t.Fatalf("inspectHostsContent() error = %v", err)
	}
	if status.State != HostsStatePresent {
		t.Fatalf("State = %q, want %q", status.State, HostsStatePresent)
	}
	if !status.Managed {
		t.Fatal("Managed = false, want true")
	}
}

func TestInspectHostsContentConflict(t *testing.T) {
	t.Parallel()

	content := "10.0.0.1 local.altinn.cloud\n127.0.0.1 pdf.local.altinn.cloud\n"

	status, err := inspectHostsContent(
		content,
		testBlockName,
		"127.0.0.1",
		[]string{"local.altinn.cloud", "pdf.local.altinn.cloud"},
	)
	if err != nil {
		t.Fatalf("inspectHostsContent() error = %v", err)
	}
	if status.State != HostsStateConflict {
		t.Fatalf("State = %q, want %q", status.State, HostsStateConflict)
	}
	if len(status.Conflicts) != 1 || status.Conflicts[0].Host != "local.altinn.cloud" {
		t.Fatalf("Conflicts = %+v, want local.altinn.cloud conflict", status.Conflicts)
	}
}

func TestInspectHostsContentAllowsDualStackLoopback(t *testing.T) {
	t.Parallel()

	content := "127.0.0.1 local.altinn.cloud\n::1 local.altinn.cloud\n"

	status, err := inspectHostsContent(
		content,
		testBlockName,
		"127.0.0.1",
		[]string{"local.altinn.cloud"},
	)
	if err != nil {
		t.Fatalf("inspectHostsContent() error = %v", err)
	}
	if status.State != HostsStatePresent {
		t.Fatalf("State = %q, want %q", status.State, HostsStatePresent)
	}
	if len(status.Conflicts) != 0 {
		t.Fatalf("Conflicts = %+v, want none", status.Conflicts)
	}
}

func TestEnsureManagedHostsContentAppendsManagedBlock(t *testing.T) {
	t.Parallel()

	original := "127.0.0.1 localhost\n"
	updated, changed, err := ensureManagedHostsContent(
		original,
		testBlockName,
		"127.0.0.1",
		[]string{"local.altinn.cloud", "pdf.local.altinn.cloud"},
	)
	if err != nil {
		t.Fatalf("ensureManagedHostsContent() error = %v", err)
	}
	if !changed {
		t.Fatal("changed = false, want true")
	}
	wantBlock := strings.Join([]string{
		"# BEGIN studioctl localtest",
		"127.0.0.1 local.altinn.cloud",
		"127.0.0.1 pdf.local.altinn.cloud",
		"# END studioctl localtest",
		"",
	}, "\n")
	if !strings.Contains(updated, wantBlock) {
		t.Fatalf("updated content missing managed block:\n%s", updated)
	}
	if !strings.Contains(updated, "127.0.0.1 localhost\n") {
		t.Fatalf("updated content lost existing entries:\n%s", updated)
	}
}

func TestEnsureManagedHostsContentPreservesDuplicatesOutsideManagedBlock(t *testing.T) {
	t.Parallel()

	original := strings.Join([]string{
		"127.0.0.1 localhost local.altinn.cloud",
		"127.0.0.1 pdf.local.altinn.cloud # keep note",
		"",
		"# BEGIN studioctl localtest",
		"127.0.0.1 local.altinn.cloud",
		"127.0.0.1 pdf.local.altinn.cloud",
		"# END studioctl localtest",
		"",
	}, "\n")

	updated, changed, err := ensureManagedHostsContent(
		original,
		testBlockName,
		"127.0.0.1",
		[]string{"local.altinn.cloud", "pdf.local.altinn.cloud"},
	)
	if err != nil {
		t.Fatalf("ensureManagedHostsContent() error = %v", err)
	}
	if changed {
		t.Fatal("changed = true, want false")
	}
	if updated != original {
		t.Fatalf("updated = %q, want original %q", updated, original)
	}
}

func TestEnsureManagedHostsContentWithoutManagedBlockPreservesUnrelatedEntries(t *testing.T) {
	t.Parallel()

	original := strings.Join([]string{
		"127.0.0.1 localhost",
		"127.0.1.1 myhost",
		"127.0.0.1 local.altinn.cloud",
		"",
	}, "\n")

	updated, changed, err := ensureManagedHostsContent(
		original,
		testBlockName,
		"127.0.0.1",
		[]string{"local.altinn.cloud", "pdf.local.altinn.cloud"},
	)
	if err != nil {
		t.Fatalf("ensureManagedHostsContent() error = %v", err)
	}
	if !changed {
		t.Fatal("changed = false, want true")
	}
	if !strings.Contains(updated, "127.0.0.1 localhost\n") {
		t.Fatalf("updated content lost localhost entry:\n%s", updated)
	}
	if !strings.Contains(updated, "127.0.1.1 myhost\n") {
		t.Fatalf("updated content lost unrelated entry:\n%s", updated)
	}
	if !strings.Contains(updated, "127.0.0.1 local.altinn.cloud\n") {
		t.Fatalf("updated content missing local.altinn.cloud entry:\n%s", updated)
	}
}

func TestEnsureManagedHostsContentRejectsConflicts(t *testing.T) {
	t.Parallel()

	_, _, err := ensureManagedHostsContent(
		"10.0.0.1 local.altinn.cloud\n",
		testBlockName,
		"127.0.0.1",
		[]string{"local.altinn.cloud"},
	)
	if err == nil {
		t.Fatal("ensureManagedHostsContent() error = nil, want conflict")
	}
	if !errors.Is(err, ErrHostsConflict) {
		t.Fatalf("error = %v, want ErrHostsConflict", err)
	}
}

func TestEnsureManagedHostsContentAcceptsDualStackLoopback(t *testing.T) {
	t.Parallel()

	original := "::1 local.altinn.cloud\n"
	updated, changed, err := ensureManagedHostsContent(
		original,
		testBlockName,
		"127.0.0.1",
		[]string{"local.altinn.cloud"},
	)
	if err != nil {
		t.Fatalf("ensureManagedHostsContent() error = %v", err)
	}
	if !changed {
		t.Fatal("changed = false, want true")
	}
	want := strings.Join([]string{
		"::1 local.altinn.cloud",
		"",
		"# BEGIN studioctl localtest",
		"127.0.0.1 local.altinn.cloud",
		"# END studioctl localtest",
		"",
	}, "\n")
	if updated != want {
		t.Fatalf("updated = %q, want %q", updated, want)
	}
}

func TestRemoveManagedHostsContent(t *testing.T) {
	t.Parallel()

	content := strings.Join([]string{
		"127.0.0.1 localhost",
		"",
		"# BEGIN studioctl localtest",
		"127.0.0.1 local.altinn.cloud",
		"# END studioctl localtest",
		"",
	}, "\n")

	updated, changed, err := removeManagedHostsContent(content, testBlockName)
	if err != nil {
		t.Fatalf("removeManagedHostsContent() error = %v", err)
	}
	if !changed {
		t.Fatal("changed = false, want true")
	}
	if updated != "127.0.0.1 localhost\n" {
		t.Fatalf("updated = %q, want %q", updated, "127.0.0.1 localhost\n")
	}
}

func TestRemoveManagedHostsContentPreservesCRLF(t *testing.T) {
	t.Parallel()

	content := strings.Join([]string{
		"127.0.0.1 localhost",
		"",
		"# BEGIN studioctl localtest",
		"127.0.0.1 local.altinn.cloud",
		"# END studioctl localtest",
		"",
	}, "\r\n")

	updated, changed, err := removeManagedHostsContent(content, testBlockName)
	if err != nil {
		t.Fatalf("removeManagedHostsContent() error = %v", err)
	}
	if !changed {
		t.Fatal("changed = false, want true")
	}
	if updated != "127.0.0.1 localhost\r\n" {
		t.Fatalf("updated = %q, want %q", updated, "127.0.0.1 localhost\r\n")
	}
}

func TestInspectHostsContentRejectsMalformedManagedBlock(t *testing.T) {
	t.Parallel()

	_, err := inspectHostsContent(
		"# BEGIN studioctl localtest\n127.0.0.1 local.altinn.cloud\n",
		testBlockName,
		"127.0.0.1",
		[]string{"local.altinn.cloud"},
	)
	if err == nil {
		t.Fatal("inspectHostsContent() error = nil, want malformed block error")
	}
	if !errors.Is(err, ErrMalformedManagedHostsBlock) {
		t.Fatalf("error = %v, want ErrMalformedManagedHostsBlock", err)
	}
}

func TestWriteHostsBackupAllocatesNextPath(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "hosts")
	if err := os.WriteFile(path+".studioctl.bak", []byte("existing"), 0o644); err != nil {
		t.Fatalf("os.WriteFile() error = %v", err)
	}
	if err := os.WriteFile(path+".studioctl.1.bak", []byte("existing"), 0o644); err != nil {
		t.Fatalf("os.WriteFile() error = %v", err)
	}
	if err := os.WriteFile(path+".studioctl.4.bak", []byte("existing"), 0o644); err != nil {
		t.Fatalf("os.WriteFile() error = %v", err)
	}

	backupPath, err := writeHostsBackup(path, "new", 0o644)
	if err != nil {
		t.Fatalf("writeHostsBackup() error = %v", err)
	}
	want := path + ".studioctl.5.bak"
	if backupPath != want {
		t.Fatalf("backupPath = %q, want %q", backupPath, want)
	}

	content, err := os.ReadFile(backupPath)
	if err != nil {
		t.Fatalf("os.ReadFile() error = %v", err)
	}
	if string(content) != "new" {
		t.Fatalf("content = %q, want %q", string(content), "new")
	}
}

func TestWriteHostsFileAtomicReplacesExistingFile(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "hosts")
	if err := os.WriteFile(path, []byte("old"), 0o644); err != nil {
		t.Fatalf("os.WriteFile() error = %v", err)
	}

	if err := writeHostsFileAtomic(path, "new", 0o600); err != nil {
		t.Fatalf("writeHostsFileAtomic() error = %v", err)
	}

	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("os.ReadFile() error = %v", err)
	}
	if string(content) != "new" {
		t.Fatalf("content = %q, want %q", string(content), "new")
	}

	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("os.Stat() error = %v", err)
	}
	if runtime.GOOS != windowsGOOS {
		if info.Mode().Perm() != 0o600 {
			t.Fatalf("perm = %o, want %o", info.Mode().Perm(), 0o600)
		}
	}
}
