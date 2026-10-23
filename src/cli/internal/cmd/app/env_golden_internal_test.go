package app

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/localtestv2"
)

// envUpdateGolden regenerates the golden file: STUDIOCTL_UPDATE_GOLDEN=1 go test ./internal/cmd/app/.
const envUpdateGolden = "STUDIOCTL_UPDATE_GOLDEN"

//nolint:gochecknoglobals // A test fixture path.
var appEnvGoldenPath = filepath.Join("testdata", "app-environment.golden.json")

// goldenAppEnv is the snapshot of the environment an app is started with, for the option combinations the run tests
// cover. It held the manifest's app section (tasks 21e to 27a) to what the hand-written code built, and holds this code
// to it now; the Aspire package (localtest/aspire/Altinn.App.Aspire) compares its own app environment against the case
// it names.
type goldenAppEnv struct {
	Cases []goldenAppEnvCase `json:"cases"`
}

type goldenAppEnvCase struct {
	Environment             map[string]string `json:"environment"`
	Name                    string            `json:"name"`
	KestrelURL              string            `json:"kestrelUrl"`
	IngressPort             string            `json:"ingressPort"`
	AppFrontendAssetBaseURL string            `json:"appFrontendAssetBaseUrl"`
	SecretsDir              string            `json:"secretsDir"`
	KeysDir                 string            `json:"keysDir"`
	Signing                 goldenSigning     `json:"signing"`
	Current                 []string          `json:"current"`
}

// goldenSigning is a case's certificate, as the runner finds it; empty for a run without localtest-v2.
//
//nolint:tagliatelle // The snapshot's field names are the Go field names of the code that wrote it first.
type goldenSigning struct {
	FullPath   string `json:"FullPath"`
	KeysFolder string `json:"KeysFolder"`
	FileName   string `json:"FileName"`
}

func (g goldenSigning) certificate() *accessTokenSigning {
	if g.FullPath == "" {
		return nil
	}
	signing := accessTokenSigning(g)
	return &signing
}

const (
	goldenSecretsDir = "/home/dev/.altinn-studio/apps/ttd/testapp/secrets"
	goldenCertDir    = "/home/dev/.altinn-studio/localtest-v2/certs"
)

func goldenAppEnvCases() []goldenAppEnvCase {
	native := goldenSigning{
		FullPath:   goldenCertDir + "/localtest-accesstoken.pfx",
		KeysFolder: "/../../.altinn-studio/localtest-v2/certs/",
		FileName:   "localtest-accesstoken.pfx",
	}
	inherited := []string{
		"PATH=/usr/bin",
		"ASPNETCORE_ENVIRONMENT=Staging",
		"STUDIOCTL_APP_RUN=0",
		"RUNTIME_APP_SECRETS_DIR=/elsewhere",
		"RUNTIME_APP_SECRETS_APPCODES_FILENAME=other.json",
		"PlatformSettings__ApiStorageEndpoint=http://storage.example/api/v1/",
		"AccessTokenSettings__AccessTokenSigningKeysFolder=/mine/",
		"AppSettings__AppFrontendAssetBaseUrl=http://localhost:5173",
		"Kestrel__EndPoints__Http__Url=http://127.0.0.1:6000",
		"OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317",
		"PlatformFrontendSettings__ArbeidsflateInboxUrl=",
		"PATH=/second/value/ignored",
		"malformed",
		"=no-key",
	}
	return []goldenAppEnvCase{
		{Name: "native", KestrelURL: "http://127.0.0.1:5005", IngressPort: "8000", SecretsDir: goldenSecretsDir},
		{
			Name: "native-localtest-v2", KestrelURL: "http://127.0.0.1:5005", IngressPort: "8000",
			SecretsDir: goldenSecretsDir, Signing: native,
		},
		{
			Name: "native-inherited", KestrelURL: "http://127.0.0.1:5005", IngressPort: "8000",
			SecretsDir: goldenSecretsDir, Signing: native, Current: inherited,
		},
		{
			Name: "native-frontend-option", KestrelURL: "http://127.0.0.1:5005", IngressPort: "8000",
			AppFrontendAssetBaseURL: "http://localhost:8080/", SecretsDir: goldenSecretsDir, Current: inherited,
		},
		{
			Name: "native-ingress-80", KestrelURL: "http://127.0.0.1:5005", IngressPort: "80",
			SecretsDir: goldenSecretsDir, Signing: native,
		},
		{
			Name: "container", KestrelURL: "http://*:5005", IngressPort: "8000", SecretsDir: "/mnt/app-secrets",
			KeysDir: ContainerKeysDir,
		},
		{
			Name: "container-frontend-option", KestrelURL: "http://*:5005", IngressPort: "8000",
			AppFrontendAssetBaseURL: "http://localhost:8080/", SecretsDir: "/mnt/app-secrets",
		},
	}
}

func TestTheAppEnvironmentMatchesTheGoldenFile(t *testing.T) {
	t.Parallel()
	got := goldenAppEnv{Cases: goldenAppEnvCases()}
	for i, c := range got.Cases {
		entries := newAppRunEnv(
			c.Current,
			c.KestrelURL,
			envtopology.NewLocal(c.IngressPort),
			c.AppFrontendAssetBaseURL,
			c.SecretsDir,
			c.KeysDir,
			c.Signing.certificate(),
		)
		if c.Signing.FullPath != "" && c.Signing.FileName != localtestv2.CertificateFileName {
			t.Fatalf("%s: the certificate file name is not the runtime's", c.Name)
		}
		env := make(map[string]string, len(entries))
		for _, entry := range entries {
			key, value, _ := strings.Cut(entry, "=")
			if _, dup := env[key]; dup {
				t.Fatalf("%s: %s twice", c.Name, key)
			}
			env[key] = value
		}
		got.Cases[i].Environment = env
	}
	data, err := json.MarshalIndent(got, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	data = append(data, '\n')

	if os.Getenv(envUpdateGolden) != "" {
		if writeErr := os.WriteFile(appEnvGoldenPath, data, 0o600); writeErr != nil {
			t.Fatal(writeErr)
		}
		return
	}
	want, err := os.ReadFile(appEnvGoldenPath)
	if err != nil {
		t.Fatalf("read %s (regenerate with %s=1): %v", appEnvGoldenPath, envUpdateGolden, err)
	}
	if !bytes.Equal(want, data) {
		t.Errorf(
			"the app environment differs from %s; review, then regenerate with %s=1 go test ./internal/cmd/app/:\n%s",
			appEnvGoldenPath, envUpdateGolden, data,
		)
	}
}
