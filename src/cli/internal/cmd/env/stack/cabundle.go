package stack

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"altinn.studio/devenv/pkg/cabundle"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

const caBundleFile = "ca-bundle.pem"

// maxSkippedListed caps the skipped certificates one warning lists, so a broken bundle cannot flood the output.
const maxSkippedListed = 3

// CABundle is the host's CA bundle (STUDIO_CA_BUNDLE, such as a TLS-intercepting proxy's CA) as a copy a container
// can mount. A container takes it with Mount; a nil CABundle mounts nothing.
type CABundle struct {
	path string
}

// LoadCABundle reads the bundle STUDIO_CA_BUNDLE names, through devenv's cabundle.FromEnv, and copies its usable
// certificates to dir. It is nil when the variable is unset. Certificates that are malformed or that Go's X.509 parser
// rejects are left out, with one warning listing them. Any error, including a file without a usable certificate, is
// one warning and nil: the environment starts without the bundle.
func LoadCABundle(out *ui.Output, dir string) *CABundle {
	bundle, configured, err := cabundle.FromEnv()
	if !configured {
		return nil
	}
	if err == nil {
		if len(bundle.Skipped) > 0 {
			out.Warning(skippedWarning(bundle))
		}
		path := filepath.Join(dir, caBundleFile)
		if err = writeCABundleCopy(path, bundle.Data); err == nil {
			return &CABundle{path: path}
		}
	}
	out.Warningf("%v; the environment starts without the CA bundle", err)
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
		ReadOnly:       true,
	})
}
