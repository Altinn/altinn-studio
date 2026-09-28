package appsecrets_test

import (
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/studioctl/internal/appsecrets"
)

// wantAppCodesJSON is the file exactly as studioctl provisions it: the operator's shape, with only the
// workflow engine's callback codes, since that is the only callback an app both mints and verifies locally.
const wantAppCodesJSON = `{
  "AppCodes": {
    "WorkflowEngineCallback": [
      {
        "Code": "LOCAL-DEV-ONLY-workflow-engine-callback-secret",
        "ExpiresAt": "2999-01-01T00:00:00Z",
        "Id": "local-dev",
        "IssuedAt": "2020-01-01T00:00:00Z"
      }
    ]
  }
}
`

func TestWriteDevelopmentAppCodes_WritesTheProvisionedShapeForTheOwnerOnly(t *testing.T) {
	t.Parallel()

	dir := filepath.Join(t.TempDir(), "apps", "ttd-app", "secrets")

	if err := appsecrets.WriteDevelopmentAppCodes(dir); err != nil {
		t.Fatalf("WriteDevelopmentAppCodes() error = %v", err)
	}

	path := appsecrets.AppCodesPath(dir)
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile() error = %v", err)
	}
	if string(data) != wantAppCodesJSON {
		t.Fatalf("file =\n%s\nwant\n%s", data, wantAppCodesJSON)
	}
	assertOwnerOnly(t, path, 0o600)
	assertOwnerOnly(t, dir, 0o700)
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("ReadDir() error = %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("directory holds %d entries, want only the app codes file (no temporary left behind)", len(entries))
	}
}

func TestWriteDevelopmentAppCodes_DoesNotRewriteAnUnchangedFile(t *testing.T) {
	t.Parallel()

	// A rewrite would touch the file every run, and the app polls it: an unchanged file must stay untouched.
	dir := t.TempDir()
	if err := appsecrets.WriteDevelopmentAppCodes(dir); err != nil {
		t.Fatalf("WriteDevelopmentAppCodes() error = %v", err)
	}
	path := appsecrets.AppCodesPath(dir)
	before, err := os.Stat(path)
	if err != nil {
		t.Fatalf("Stat() error = %v", err)
	}

	if writeErr := appsecrets.WriteDevelopmentAppCodes(dir); writeErr != nil {
		t.Fatalf("second WriteDevelopmentAppCodes() error = %v", writeErr)
	}

	after, err := os.Stat(path)
	if err != nil {
		t.Fatalf("Stat() after second write error = %v", err)
	}
	if !os.SameFile(before, after) {
		t.Fatal("the file was replaced, want the unchanged content left alone")
	}
	if !after.ModTime().Equal(before.ModTime()) {
		t.Fatalf("modification time = %v, want it unchanged at %v", after.ModTime(), before.ModTime())
	}
}

func TestWriteDevelopmentAppCodes_ReplacesADifferentFile(t *testing.T) {
	t.Parallel()

	// An old or hand-edited file is not what the app libraries need; the run replaces it.
	dir := t.TempDir()
	path := appsecrets.AppCodesPath(dir)
	if err := os.WriteFile(path, []byte(`{"AppCodes":{}}`), 0o600); err != nil {
		t.Fatalf("WriteFile() error = %v", err)
	}

	if err := appsecrets.WriteDevelopmentAppCodes(dir); err != nil {
		t.Fatalf("WriteDevelopmentAppCodes() error = %v", err)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile() error = %v", err)
	}
	if string(data) != wantAppCodesJSON {
		t.Fatalf("file =\n%s\nwant\n%s", data, wantAppCodesJSON)
	}
}

func TestWriteDevelopmentAppCodes_LeavesAStoredMaskinportenClientAlone(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	client, err := appsecrets.ParseMaskinportenClient([]byte(`{
		"clientId": "client-7", "authority": "https://test.maskinporten.no/", "jwk": ` + testJwk + `
	}`))
	if err != nil {
		t.Fatalf("ParseMaskinportenClient() error = %v", err)
	}
	if _, storeErr := appsecrets.StoreMaskinportenClient(dir, client); storeErr != nil {
		t.Fatalf("StoreMaskinportenClient() error = %v", storeErr)
	}

	if writeErr := appsecrets.WriteDevelopmentAppCodes(dir); writeErr != nil {
		t.Fatalf("WriteDevelopmentAppCodes() error = %v", writeErr)
	}

	loaded, err := appsecrets.LoadMaskinportenClient(dir)
	if err != nil {
		t.Fatalf("LoadMaskinportenClient() error = %v", err)
	}
	if loaded.ClientID != "client-7" {
		t.Fatalf("ClientID = %q, want client-7", loaded.ClientID)
	}
}
