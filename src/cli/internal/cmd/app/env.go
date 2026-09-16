package app

import (
	"sort"
	"strings"

	"altinn.studio/studioctl/internal/appsecrets"
	"altinn.studio/studioctl/internal/envtopology"
)

// EnvKeysDirectory is the environment variable the app libraries read their data-protection keys
// directory from.
const EnvKeysDirectory = "ALTINN_KEYS_DIRECTORY"

type appEnv struct {
	values map[string]string
}

func newAppRunEnv(
	current []string,
	kestrelURL string,
	topology envtopology.Local,
	appFrontendAssetBaseUrl string,
	secretsDir string,
	keysDir string,
) []string {
	env := newAppEnv(current)
	env.addRunDefaults(kestrelURL, topology, appFrontendAssetBaseUrl, secretsDir, keysDir)
	return env.entries()
}

func newAppEnv(current []string) appEnv {
	values := make(map[string]string, len(current)+16)
	for _, entry := range current {
		key, value, ok := strings.Cut(entry, "=")
		if !ok || key == "" {
			continue
		}
		if _, exists := values[key]; !exists {
			values[key] = value
		}
	}
	return appEnv{values: values}
}

func (e appEnv) addRunDefaults(
	kestrelURL string,
	topology envtopology.Local,
	appFrontendAssetBaseUrl string,
	secretsDir string,
	keysDir string,
) {
	endpoints := newAppEndpointConfig(topology)

	e.values["STUDIOCTL_APP_RUN"] = "1"
	// The app's secrets directory, provisioned by studioctl the way the operator provisions /mnt/app-secrets
	// in a cluster. It holds the Maskinporten client stored with `studioctl app maskinporten set`; the app
	// libraries honor the variable on the localtest platform only. Always named, even before anything is
	// stored, so that a client stored while the app runs is picked up without a restart - and never taken
	// from the inherited environment: where the secrets live is studioctl's decision, not the shell's.
	if secretsDir != "" {
		e.values[appsecrets.EnvSecretsDir] = secretsDir
	}
	// Where the app persists its data-protection keys. A native run uses the developer's home directory, as
	// the app libraries default to; a container run is told the directory studioctl mounts for it, as the
	// platform tells a deployed app.
	if keysDir != "" {
		e.values[EnvKeysDirectory] = keysDir
	}
	e.setDefault("ASPNETCORE_ENVIRONMENT", "Development")
	e.setDefault("Kestrel__EndPoints__Http__Url", kestrelURL)
	if appFrontendAssetBaseUrl != "" {
		e.values["AppSettings__AppFrontendAssetBaseUrl"] = appFrontendAssetBaseUrl
	}
	e.setDefault("AppSettings__OpenIdWellKnownEndpoint", endpoints.platform+"/authentication/api/v1/openid/")
	e.setDefault("GeneralSettings__ExternalAppBaseUrl", topology.AppBaseURL())
	e.setDefault("GeneralSettings__HostName", topology.AppHostName())
	e.setDefault("OTEL_EXPORTER_OTLP_ENDPOINT", topology.OTelURL())
	e.setDefault("PlatformSettings__ApiStorageEndpoint", endpoints.platform+"/storage/api/v1/")
	e.setDefault("PlatformSettings__ApiRegisterEndpoint", endpoints.platform+"/register/api/v1/")
	e.setDefault("PlatformSettings__ApiProfileEndpoint", endpoints.platform+"/profile/api/v1/")
	e.setDefault("PlatformSettings__ApiAuthenticationEndpoint", endpoints.platform+"/authentication/api/v1/")
	e.setDefault("PlatformSettings__ApiAuthorizationEndpoint", endpoints.platform+"/authorization/api/v1/")
	e.setDefault("PlatformSettings__ApiEventsEndpoint", endpoints.platform+"/events/api/v1/")
	e.setDefault("PlatformSettings__ApiPdf2Endpoint", endpoints.pdf)
	e.setDefault("PlatformSettings__ApiNotificationEndpoint", endpoints.platform+"/notifications/api/v1/")
	e.setDefault("PlatformSettings__ApiCorrespondenceEndpoint", endpoints.platform+"/correspondence/api/v1/")
	e.setDefault("PlatformSettings__ApiAccessManagementEndpoint", endpoints.platform+"/accessmanagement/api/v1/")
	e.setDefault("PlatformSettings__ApiWorkflowEngineEndpoint", endpoints.workflowEngine)

	// Workflow engine callbacks are authenticated with an app-minted JWT signed by a
	// WorkflowEngineCallback app-code. In the cloud the operator provisions these codes; locally we
	// supply a single fixed dev code so the app can both sign (at enqueue) and validate (on callback).
	// The app both mints and verifies the token, so this value never has to match anything else.
	e.setDefault("AppCodes__WorkflowEngineCallback__0__Id", "local-dev")
	e.setDefault("AppCodes__WorkflowEngineCallback__0__Code", "LOCAL-DEV-ONLY-workflow-engine-callback-secret")
	e.setDefault("AppCodes__WorkflowEngineCallback__0__IssuedAt", "2020-01-01T00:00:00Z")
	e.setDefault("AppCodes__WorkflowEngineCallback__0__ExpiresAt", "2999-01-01T00:00:00Z")
}

func (e appEnv) setDefault(key, value string) {
	if _, exists := e.values[key]; exists {
		return
	}
	e.values[key] = value
}

func (e appEnv) entries() []string {
	keys := make([]string, 0, len(e.values))
	for key := range e.values {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	entries := make([]string, 0, len(keys))
	for _, key := range keys {
		entries = append(entries, key+"="+e.values[key])
	}
	return entries
}
