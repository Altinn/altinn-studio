package appsecrets

import (
	"fmt"
	"os"
	"runtime"

	"altinn.studio/studioctl/internal/osutil"
)

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
	EnvMaskinportenFileName = "RUNTIME_APP_SECRETS_MASKINPORTEN_FILENAME"

	// EnvAppCodesFileName names the app's callback verification codes inside that directory.
	EnvAppCodesFileName = "RUNTIME_APP_SECRETS_APPCODES_FILENAME"

	// MaskinportenFileName is what studioctl calls the Maskinporten client file - the name the operator uses
	// in a cluster, for a file with the same content.
	MaskinportenFileName = "maskinporten-settings.json"

	// AppCodesFileName is what studioctl calls the app codes file, on the same terms.
	AppCodesFileName = "app-codes.json"

	// ContainerDir is where studioctl mounts the secrets directory when the app runs in a container, matching
	// the platform's own mount point so that a container run resembles a deployed app.
	ContainerDir = "/mnt/app-secrets"
)

// EnsureDir creates an app's secrets directory and leaves it readable by its owner alone. Every caller that
// writes a file there, or hands the directory's name to an app, goes through here, so the directory is never
// assumed to exist and never assumed to be private.
//
// The directory is owner-only because the file names in it are information of their own: they say which
// integrations an app has credentials provisioned for, which on a shared machine is nobody else's business.
// The files themselves are owner-only too, written through osutil.WriteFileAtomic. Creating the directory is
// not enough to get that: MkdirAll leaves an existing directory's mode alone, so a directory an older
// studioctl created, or a developer made by hand under the default umask, would stay listable by everyone.
// Its mode is therefore checked and tightened on every run, which also repairs one that was widened later.
//
// On Windows the permission bits mean nothing: the directory inherits the ACL of the profile it is created
// under, while every file in it is given the protected owner-only DACL by osutil.SecureFile. SecureFile is
// deliberately not applied to the directory - it is a file-only call that rejects a directory path, and the
// single access entry it sets is not inheritable, so pointing it at the directory would protect the
// directory without protecting anything later created inside it.
//
// Where the directory is belongs to config.AppSecretsDir, which is what keeps an app id from escaping the
// studioctl home: it rejects an id whose segments are empty, "." or "..", or carry a path separator.
func EnsureDir(dir string) error {
	if err := os.MkdirAll(dir, osutil.DirPermOwnerOnly); err != nil {
		return fmt.Errorf("create the app secrets directory %s: %w", dir, err)
	}
	if runtime.GOOS == osutil.OSWindows {
		return nil
	}
	info, err := os.Stat(dir)
	if err != nil {
		return fmt.Errorf("read the app secrets directory %s: %w", dir, err)
	}
	if info.Mode().Perm()&^os.FileMode(osutil.DirPermOwnerOnly) == 0 {
		return nil
	}
	if err := os.Chmod(dir, osutil.DirPermOwnerOnly); err != nil {
		return fmt.Errorf("restrict the app secrets directory %s to its owner: %w", dir, err)
	}
	return nil
}
