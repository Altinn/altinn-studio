package app

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
	"altinn.studio/studioctl/internal/envtopology"
)

// envUpdateGolden regenerates the golden file: STUDIOCTL_UPDATE_GOLDEN=1 go test ./internal/cmd/app/.
const envUpdateGolden = "STUDIOCTL_UPDATE_GOLDEN"

//nolint:gochecknoglobals // A test fixture path.
var appEnvGoldenPath = filepath.Join("testdata", "app-environment.golden.json")

// goldenAppEnv is the snapshot of the environment an app is started with, for the option combinations the run
// tests cover.
type goldenAppEnv struct {
	Cases []goldenAppEnvCase `json:"cases"`
}

type goldenAppEnvCase struct {
	Environment map[string]string `json:"environment"`
	// OTLP is where the run reaches the environment's collector, and nil while no collector runs.
	OTLP                    *goldenOTLP `json:"otlp"`
	Name                    string      `json:"name"`
	KestrelURL              string      `json:"kestrelUrl"`
	IngressPort             string      `json:"ingressPort"`
	AppFrontendAssetBaseURL string      `json:"appFrontendAssetBaseUrl"`
	SecretsDir              string      `json:"secretsDir"`
	KeysDir                 string      `json:"keysDir"`
	Current                 []string    `json:"current"`
}

type goldenOTLP struct {
	Endpoint string `json:"endpoint"`
	Protocol string `json:"protocol"`
}

func (g *goldenOTLP) destination() *envtopology.OTLPDestination {
	if g == nil {
		return nil
	}
	return &envtopology.OTLPDestination{Endpoint: g.Endpoint, Protocol: g.Protocol}
}

const goldenSecretsDir = "/home/dev/.altinn-studio/apps/ttd/testapp/secrets"

func goldenAppEnvCases() []goldenAppEnvCase {
	// The localtest runtime's collector, as `env up --monitoring` runs it.
	collector := components.OTLPCollector(envtopology.NewLocal("8000"))
	native := &goldenOTLP{Endpoint: collector.Host.Endpoint, Protocol: collector.Host.Protocol}
	container := &goldenOTLP{Endpoint: collector.Network.Endpoint, Protocol: collector.Network.Protocol}
	inherited := []string{
		"PATH=/usr/bin",
		"ASPNETCORE_ENVIRONMENT=Staging",
		"STUDIOCTL_APP_RUN=0",
		"RUNTIME_APP_SECRETS_DIR=/elsewhere",
		"RUNTIME_APP_SECRETS_APPCODES_FILENAME=other.json",
		"PlatformSettings__ApiStorageEndpoint=http://storage.example/api/v1/",
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
			Name: "native-collector", KestrelURL: "http://127.0.0.1:5005", IngressPort: "8000",
			SecretsDir: goldenSecretsDir, OTLP: native,
		},
		{
			Name: "native-inherited", KestrelURL: "http://127.0.0.1:5005", IngressPort: "8000",
			SecretsDir: goldenSecretsDir, Current: inherited,
		},
		{
			Name: "native-inherited-collector", KestrelURL: "http://127.0.0.1:5005", IngressPort: "8000",
			SecretsDir: goldenSecretsDir, Current: inherited, OTLP: native,
		},
		{
			Name: "native-frontend-option", KestrelURL: "http://127.0.0.1:5005", IngressPort: "8000",
			AppFrontendAssetBaseURL: "http://localhost:8080/", SecretsDir: goldenSecretsDir, Current: inherited,
		},
		{
			Name:        "native-ingress-80",
			KestrelURL:  "http://127.0.0.1:5005",
			IngressPort: "80",
			SecretsDir:  goldenSecretsDir,
		},
		{
			Name: "container", KestrelURL: "http://*:5005", IngressPort: "8000", SecretsDir: "/mnt/app-secrets",
			KeysDir: ContainerKeysDir,
		},
		{
			Name: "container-collector", KestrelURL: "http://*:5005", IngressPort: "8000",
			SecretsDir: "/mnt/app-secrets", KeysDir: ContainerKeysDir, OTLP: container,
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
			c.OTLP.destination(),
		)
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
