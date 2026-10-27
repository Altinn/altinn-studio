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
// cover. The Aspire package (https://github.com/ivarne-agent/localtest-research/tree/main/localtest/aspire/Altinn.App.Aspire) compares its own app environment
// against the case it names.
type goldenAppEnv struct {
	Cases []goldenAppEnvCase `json:"cases"`
}

type goldenAppEnvCase struct {
	Environment             map[string]string `json:"environment"`
	Name                    string            `json:"name"`
	KestrelURL              string            `json:"kestrelUrl"`
	IngressPort             string            `json:"ingressPort"`
	PublicHost              string            `json:"publicHost,omitempty"`
	AppFrontendAssetBaseURL string            `json:"appFrontendAssetBaseUrl"`
	SecretsDir              string            `json:"secretsDir"`
	KeysDir                 string            `json:"keysDir"`
	Signing                 goldenSigning     `json:"signing"`
	Current                 []string          `json:"current"`
	// Arbeidsflate is set when localtest-v2 runs the arbeidsflate group.
	Arbeidsflate bool `json:"arbeidsflate,omitempty"`
}

// goldenSigning is a case's certificate, as the runner finds it. Empty for a run without localtest-v2.
//
//nolint:tagliatelle // The snapshot's field names are the Go field names of the code that wrote it first.
type goldenSigning struct {
	FullPath   string `json:"FullPath"`
	KeysFolder string `json:"KeysFolder"`
	FileName   string `json:"FileName"`
}

func (g goldenSigning) certificate(arbeidsflate bool) *accessTokenSigning {
	if g.FullPath == "" {
		return nil
	}
	return &accessTokenSigning{
		FullPath: g.FullPath, KeysFolder: g.KeysFolder, FileName: g.FileName, arbeidsflate: arbeidsflate,
	}
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
	// An app container on the localtest-v2 network (onStackNetwork) finds the certificate where the components do.
	container := goldenSigning{
		FullPath:   containerCertificateDir + "/localtest-accesstoken.pfx",
		KeysFolder: containerCertificateDir + "/",
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
			Name: "native-localtest-v2-custom-origin", KestrelURL: "http://127.0.0.1:5005", IngressPort: "18000",
			PublicHost: "origin.test", SecretsDir: goldenSecretsDir, Signing: native,
		},
		{
			Name: "native-localtest-v2-arbeidsflate", KestrelURL: "http://127.0.0.1:5005", IngressPort: "8000",
			SecretsDir: goldenSecretsDir, Signing: native, Arbeidsflate: true,
		},
		{
			Name: "native-localtest-v2-custom-origin-arbeidsflate", KestrelURL: "http://127.0.0.1:5005",
			IngressPort: "18000", PublicHost: "origin.test", SecretsDir: goldenSecretsDir, Signing: native,
			Arbeidsflate: true,
		},
		{
			Name: "container", KestrelURL: "http://0.0.0.0:5005", IngressPort: "8000", SecretsDir: "/mnt/app-secrets",
			KeysDir: ContainerKeysDir, Signing: container,
		},
		{
			Name: "container-arbeidsflate", KestrelURL: "http://0.0.0.0:5005", IngressPort: "8000",
			SecretsDir: "/mnt/app-secrets", KeysDir: ContainerKeysDir, Signing: container, Arbeidsflate: true,
		},
		{
			Name:        "container-localtest",
			KestrelURL:  "http://*:5005",
			IngressPort: "8000",
			SecretsDir:  "/mnt/app-secrets",
			KeysDir:     ContainerKeysDir,
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
			envtopology.NewLocalAt(c.PublicHost, c.IngressPort),
			c.AppFrontendAssetBaseURL,
			c.SecretsDir,
			c.KeysDir,
			c.Signing.certificate(c.Arbeidsflate),
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
