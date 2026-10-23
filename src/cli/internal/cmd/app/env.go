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

// accessTokenSigning is the certificate an app signs its platform access tokens with. The localtest
// runtime never checked those tokens, so a run against it has none (nil); the localtest-v2 components
// validate them, so a run against that runtime gets the shared test certificate.
//
// Two generations of Altinn.Common.AccessTokenClient read the settings differently: 3.x (app-lib v8)
// opens FullPath, and 1.x (the v9 backend) concatenates the parent of the working directory, KeysFolder
// and FileName without separators, so KeysFolder is a path that resolves from there.
type accessTokenSigning struct {
	FullPath   string
	KeysFolder string
	FileName   string
}

// newAppRunEnv builds the environment an app is started with. secretsDir is required - every run is given a
// secrets directory, and the caller has created it by now; keysDir is set only where studioctl decides where
// the data-protection keys go; signing is set only while localtest-v2 is up.
func newAppRunEnv(
	current []string,
	kestrelURL string,
	topology envtopology.Local,
	appFrontendAssetBaseUrl string,
	secretsDir string,
	keysDir string,
	signing *accessTokenSigning,
) []string {
	env := newAppEnv(current)
	env.addRunDefaults(kestrelURL, topology, appFrontendAssetBaseUrl, secretsDir, keysDir, signing)
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
	signing *accessTokenSigning,
) {
	endpoints := newAppEndpointConfig(topology)

	e.values["STUDIOCTL_APP_RUN"] = "1"
	// Where the app's secrets are and what every file in that directory is called, named for the app exactly
	// as the platform names them for a deployed app - the same variables the operator's configuration map
	// sets in every environment (infra/runtime/apps-config/base/apps-runtime-common-env.yaml), because
	// studioctl is the platform for a local run. All three are set on every run: the app libraries require
	// them and fall back to nothing, and the directory is there by the time a spec is built, holding the
	// callback verification codes studioctl provisions for every local run. The Maskinporten client stored
	// with `studioctl app maskinporten set` lands under the name advertised here, and a client stored while
	// the app runs is picked up without a restart. None of the three is taken from the inherited
	// environment: the contract is studioctl's to state, not the shell's.
	e.values[appsecrets.EnvSecretsDir] = secretsDir
	e.values[appsecrets.EnvMaskinportenFileName] = appsecrets.MaskinportenFileName
	e.values[appsecrets.EnvAppCodesFileName] = appsecrets.AppCodesFileName
	// Where the app persists its data-protection keys, which is the one part a run can leave unsaid: a
	// native run keeps the app libraries' default, the developer's own home directory, and only a container
	// run is told a directory, the one studioctl mounts for it, as the platform tells a deployed app.
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
	if signing != nil {
		e.setDefault("AccessTokenSettings__AccessTokenSigningCertificateFullPath", signing.FullPath)
		e.setDefault("AccessTokenSettings__AccessTokenSigningKeysFolder", signing.KeysFolder)
		e.setDefault("AccessTokenSettings__AccessTokenSigningCertificateFileName", signing.FileName)
		e.addArbeidsflateLinks(topology)
	}
}

// addArbeidsflateLinks points the app frontend's inbox, dialog, profile and parties links at the local
// Arbeidsflate, which only localtest-v2 has. The app frontend
// reads them from app-lib's PlatformFrontendSettings in the bootstrap response; on a local host it uses a
// configured link and falls back to the localtest start page otherwise, so without these "back to inbox"
// is the start page. AccessManagementChangeAndRedirectUrl stays unset: the stack's Access Management does not
// serve reportee/changeandredirect (it is the UI backend's), so the links go to the inbox without a party
// switch. The other members (login, logout, all forms, access management, help) keep the start page.
func (e appEnv) addArbeidsflateLinks(topology envtopology.Local) {
	arbeidsflate := topology.PublicBaseURL(envtopology.ComponentArbeidsflate)
	e.setDefault("PlatformFrontendSettings__ArbeidsflateInboxUrl", arbeidsflate+"/")
	e.setDefault("PlatformFrontendSettings__ArbeidsflateDialogUrl", arbeidsflate+"/inbox/{dialogId}")
	e.setDefault("PlatformFrontendSettings__ArbeidsflateProfileUrl", arbeidsflate+"/profile")
	e.setDefault("PlatformFrontendSettings__ArbeidsflatePartiesUrl", arbeidsflate+"/profile/parties")
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
