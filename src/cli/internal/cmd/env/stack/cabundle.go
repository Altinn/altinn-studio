package stack

import (
	"bytes"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"altinn.studio/devenv/pkg/cabundle"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

// The copy's name is caBundlePrefix, the first caBundleDigestLength hex digits of the bundle's digest, and
// caBundleSuffix, so a changed bundle changes the mount of every container that takes it, and the runtime recreates
// them. A copy is never rewritten under a running container.
const (
	caBundlePrefix       = "ca-bundle-"
	caBundleSuffix       = ".pem"
	caBundleDigestLength = 16
)

// maxSkippedListed caps the skipped certificates one warning lists, so a broken bundle cannot flood the output.
const maxSkippedListed = 3

// CABundle is the host's CA bundle (STUDIO_CA_BUNDLE, such as a TLS-intercepting proxy's CA) as a copy a container
// can mount. A container takes it with Mount, and a nil CABundle mounts nothing.
type CABundle struct {
	path   string
	digest string
}

// LoadCABundle reads the bundle STUDIO_CA_BUNDLE names, through devenv's cabundle.FromEnv, and copies its usable
// certificates to dir, named by their digest. The copies of other bundles in dir are removed. It is nil when the
// variable is unset. Certificates that are malformed or that Go's X.509 parser rejects are left out, with one warning
// listing them. Any error, including a file without a usable certificate, is one warning and nil: the environment
// starts without the bundle.
func LoadCABundle(out *ui.Output, dir string) *CABundle {
	bundle, configured, err := cabundle.FromEnv()
	var loaded *CABundle
	if configured && err == nil {
		if len(bundle.Skipped) > 0 {
			out.Warning(skippedWarning(bundle))
		}
		path := filepath.Join(dir, caBundlePrefix+bundle.Digest[:caBundleDigestLength]+caBundleSuffix)
		if err = writeCABundleCopy(path, bundle.Data); err == nil {
			loaded = &CABundle{path: path, digest: bundle.Digest}
		}
	}
	if configured && err != nil {
		out.Warningf("%v; the environment starts without the CA bundle", err)
	}
	if removeErr := removeOtherCopies(dir, loaded); removeErr != nil {
		out.Warningf("remove an old copy of the CA bundle: %v", removeErr)
	}
	return loaded
}

// Digest is the SHA-256 of the certificates the containers trust, hex, for a runtime to record what it started
// with. It is "" for no bundle.
func (b *CABundle) Digest() string {
	if b == nil {
		return ""
	}
	return b.digest
}

// removeOtherCopies removes every copy of a CA bundle in dir but the loaded one's: a changed bundle's old copy, and
// every copy once there is no bundle.
func removeOtherCopies(dir string, loaded *CABundle) error {
	copies, err := filepath.Glob(filepath.Join(dir, caBundlePrefix+"*"+caBundleSuffix))
	if err != nil {
		return fmt.Errorf("list the CA bundle's copies: %w", err)
	}
	for _, path := range copies {
		if loaded != nil && path == loaded.path {
			continue
		}
		if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
			return fmt.Errorf("remove %s: %w", filepath.Base(path), err)
		}
	}
	return nil
}

// skippedWarning names the certificates of the bundle that the environment does not trust, the first few by line.
func skippedWarning(bundle *cabundle.Bundle) string {
	listed := bundle.Skipped
	more := ""
	if len(listed) > maxSkippedListed {
		more = fmt.Sprintf("; and %d more", len(listed)-maxSkippedListed)
		listed = listed[:maxSkippedListed]
	}
	noun := "certificate"
	if len(bundle.Skipped) > 1 {
		noun = "certificates"
	}
	return fmt.Sprintf("%s (%s): skipping %d unusable %s, the environment trusts the rest: %s%s",
		cabundle.EnvStudioCABundle, bundle.HostPath, len(bundle.Skipped), noun, strings.Join(listed, "; "), more)
}

// writeCABundleCopy writes the copy, readable by everyone, unless it holds the content already. A copy, not the
// file: a container's user can read it whatever the original's mode, it lies under the data directory that Docker
// Desktop shares, and SELinux relabelling touches the copy, never a system file.
func writeCABundleCopy(path string, content []byte) error {
	if err := os.MkdirAll(filepath.Dir(path), osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create the CA bundle's directory: %w", err)
	}
	existing, err := os.ReadFile(path) //nolint:gosec // The path is under studioctl's own data directory.
	if err != nil || !bytes.Equal(existing, content) {
		if err = os.WriteFile(path, content, osutil.FilePermDefault); err != nil {
			return fmt.Errorf("copy the CA bundle: %w", err)
		}
	}
	if err := os.Chmod(path, osutil.FilePermDefault); err != nil {
		return fmt.Errorf("make the CA bundle's copy readable: %w", err)
	}
	return nil
}

// Mount gives a container that trusts STUDIO_CA_BUNDLE the bundle: it sets the variable in env to the path where the
// copy is mounted read-only, and returns volumes with that mount. The runtime relabels it for SELinux like its other
// bind mounts. Without a bundle, env and volumes are unchanged.
func (b *CABundle) Mount(env map[string]string, volumes []types.VolumeMount) []types.VolumeMount {
	if b == nil {
		return volumes
	}
	env[cabundle.EnvStudioCABundle] = cabundle.ContainerPath
	return append(volumes, types.VolumeMount{
		HostPath:       b.path,
		ContainerPath:  cabundle.ContainerPath,
		Type:           types.VolumeMountTypeBind,
		SELinuxRelabel: types.SELinuxRelabelNone,
		Options:        "",
		ReadOnly:       true,
	})
}
