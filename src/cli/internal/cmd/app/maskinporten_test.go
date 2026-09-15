package app_test

import (
	"path/filepath"
	"testing"

	appsvc "altinn.studio/studioctl/internal/cmd/app"
	"altinn.studio/studioctl/internal/config"
)

func TestStoreMaskinportenClient_RoundTrips(t *testing.T) {
	t.Parallel()

	appPath := t.TempDir()
	writeAppMetadata(t, appPath, `{"id":"ttd/test-app"}`)
	home := t.TempDir()
	service := appsvc.NewService(&config.Config{Home: home, Version: config.NewVersion("test-version")})

	stored, err := service.StoreMaskinportenClient(appsvc.MaskinportenClientRequest{
		AppPath: appPath,
		Input: []byte(`{"clientId":"client-1","authority":"https://test.maskinporten.no/","jwk":` +
			`{"kty":"RSA","use":"sig","kid":"k1","alg":"RS256","n":"m","e":"AQAB","d":"private",` +
			`"p":"p","q":"q","qi":"qi","dp":"dp","dq":"dq"}}`),
	})
	if err != nil {
		t.Fatalf("StoreMaskinportenClient() error = %v", err)
	}
	if stored.AppID != "ttd/test-app" || stored.ClientID != "client-1" || stored.Environment != "test" ||
		stored.KeyID != "k1" {
		t.Fatalf("stored = %+v, want ttd/test-app client-1 test k1", stored)
	}
	if stored.Path != filepath.Join(home, "apps", "ttd", "test-app", "secrets", "maskinporten-settings.json") {
		t.Fatalf("Path = %q, want the file in the app's secrets directory", stored.Path)
	}

	shown, err := service.ShowMaskinportenClient(appPath)
	if err != nil {
		t.Fatalf("ShowMaskinportenClient() error = %v", err)
	}
	if shown != stored {
		t.Fatalf("shown = %+v, want %+v", shown, stored)
	}

	removal, err := service.RemoveMaskinportenClient(appPath)
	if err != nil || !removal.Removed {
		t.Fatalf("RemoveMaskinportenClient() = %+v, %v; want removed", removal, err)
	}
	if _, err := service.ShowMaskinportenClient(appPath); err == nil {
		t.Fatal("ShowMaskinportenClient() after remove error = nil, want an error")
	}
}
