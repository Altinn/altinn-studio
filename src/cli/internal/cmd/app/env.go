package app

import (
	"sort"
	"strings"

	"altinn.studio/studioctl/internal/envtopology"
)

type appEnv struct {
	values map[string]string
}

func newAppRunEnv(current []string, kestrelURL string, topology envtopology.Local) []string {
	env := newAppEnv(current)
	env.addRunDefaults(kestrelURL, topology)
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

func (e appEnv) addRunDefaults(kestrelURL string, topology envtopology.Local) {
	endpoints := newAppEndpointConfig(topology)

	e.setDefault("ASPNETCORE_ENVIRONMENT", "Development")
	e.setDefault("Kestrel__EndPoints__Http__Url", kestrelURL)
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
