package appsecrets_test

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"

	"altinn.studio/studioctl/internal/appsecrets"
)

// appCodesGoldenPath holds the bytes WriteDevelopmentAppCodes writes. The Aspire package
// (localtest/aspire/Altinn.App.Aspire) writes the same file for an app it runs and compares its bytes with this one.
//
//nolint:gochecknoglobals // A test fixture path.
var appCodesGoldenPath = filepath.Join("testdata", "app-codes.golden.json")

func TestTheDevelopmentAppCodesMatchTheGoldenFile(t *testing.T) {
	t.Parallel()
	dir := filepath.Join(t.TempDir(), "secrets")
	if err := appsecrets.WriteDevelopmentAppCodes(dir); err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(appsecrets.AppCodesPath(dir))
	if err != nil {
		t.Fatal(err)
	}
	if os.Getenv("STUDIOCTL_UPDATE_GOLDEN") != "" {
		if writeErr := os.WriteFile(appCodesGoldenPath, got, 0o600); writeErr != nil {
			t.Fatal(writeErr)
		}
		return
	}
	want, err := os.ReadFile(appCodesGoldenPath)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got, want) {
		t.Errorf("the app codes differ from %s:\n%s", appCodesGoldenPath, got)
	}
}
