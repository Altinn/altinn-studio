package install

import "path/filepath"

// Bundle describes the payload needed to install or update studioctl.
type Bundle struct {
	Version              string
	BinaryPath           string
	ResourcesArchivePath string

	installPath string
}

// NewBundle returns an installable bundle for an explicit target path.
func NewBundle(version, binaryPath, resourcesArchivePath, installPath string) Bundle {
	return Bundle{
		Version:              version,
		BinaryPath:           binaryPath,
		ResourcesArchivePath: resourcesArchivePath,
		installPath:          installPath,
	}
}

// InstallPath returns the binary installation target.
func (b Bundle) InstallPath() string {
	return b.installPath
}

// CurrentBundle returns an installable bundle containing the currently running studioctl binary.
func (s *Service) CurrentBundle(resourcesArchivePath, targetDir string) (Bundle, error) {
	binaryPath, err := currentExecutablePath()
	if err != nil {
		return Bundle{}, err
	}
	return Bundle{
		Version:              s.cfg.Version.String(),
		BinaryPath:           binaryPath,
		ResourcesArchivePath: resourcesArchivePath,
		installPath:          filepath.Join(targetDir, installBinaryName()),
	}, nil
}
