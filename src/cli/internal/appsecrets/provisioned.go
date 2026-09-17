package appsecrets

// The platform's contract for provisioned secrets, in one place.
//
// A deployed app is told where its secrets are and what every file in that directory is called, and it is
// told through these environment variables: the operator's configuration map sets them for a cluster (see
// infra/runtime/apps-config/base/apps-runtime-common-env.yaml), and studioctl sets them for a local run,
// because studioctl is the platform for a local run. The app libraries require all of them and fall back to
// nothing, deliberately - a location they had guessed would read nothing at all the day the writer moved it.
//
// studioctl advertises every name here, including files no tenant of its own writes yet, so that the app it
// starts is given the same complete contract a deployed app is given.
const (
	// EnvSecretsDir names the directory the app's secrets are provisioned into.
	EnvSecretsDir = "RUNTIME_APP_SECRETS_DIR" //nolint:gosec // G101: the name of a variable, not a credential.

	// EnvMaskinportenFileName names the app's Maskinporten client inside that directory.
	EnvMaskinportenFileName = "RUNTIME_APP_MASKINPORTEN_SECRETS_FILENAME"

	// EnvAppCodesFileName names the app's callback verification codes inside that directory.
	EnvAppCodesFileName = "RUNTIME_APP_APPCODES_SECRETS_FILENAME"

	// MaskinportenFileName is what studioctl calls the Maskinporten client file - the name the operator uses
	// in a cluster, for a file with the same content.
	MaskinportenFileName = "maskinporten-settings.json"

	// AppCodesFileName is what studioctl calls the app codes file, on the same terms.
	AppCodesFileName = "app-codes.json"

	// ContainerDir is where studioctl mounts the secrets directory when the app runs in a container, matching
	// the platform's own mount point so that a container run resembles a deployed app.
	ContainerDir = "/mnt/app-secrets"
)
