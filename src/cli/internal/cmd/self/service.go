// Package self contains command-specific self-management application logic.
package self

import (
	"context"
	"errors"
	"fmt"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/install"
)

// Service contains self command logic.
type Service struct {
	dataDir string
	home    string
	version string
}

// NewService creates a new self command service.
func NewService(cfg *config.Config) *Service {
	return &Service{
		dataDir: cfg.DataDir,
		home:    cfg.Home,
		version: cfg.Version,
	}
}

// InstallBinaryResult contains binary install outcome.
type InstallBinaryResult struct {
	InstalledPath    string
	AlreadyInstalled bool
}

// InstallResourcesResult contains resources install outcome.
type InstallResourcesResult struct {
	ConfigError      error
	AlreadyInstalled bool
	ConfigCreated    bool
}

// DetectCandidates discovers install directories.
func (s *Service) DetectCandidates() []Candidate {
	return DetectCandidates(nil)
}

// InstallBinary installs studioctl to the target path.
func (s *Service) InstallBinary(targetPath string) (InstallBinaryResult, error) {
	installedPath, err := Install(targetPath)
	if err != nil {
		if errors.Is(err, ErrAlreadyInstalled) {
			return InstallBinaryResult{
				InstalledPath:    targetPath,
				AlreadyInstalled: true,
			}, nil
		}
		return InstallBinaryResult{}, fmt.Errorf("install binary: %w", err)
	}

	return InstallBinaryResult{
		InstalledPath:    installedPath,
		AlreadyInstalled: false,
	}, nil
}

// IsInPath reports whether the target directory is on PATH.
func (s *Service) IsInPath(dir string, candidates []Candidate) bool {
	for _, cand := range candidates {
		if cand.Path == dir {
			return cand.InPath
		}
	}
	return false
}

// PathInstructions returns platform-specific PATH setup instructions.
func (s *Service) PathInstructions(dir string) string {
	return PathInstructions(dir)
}

// InstallResources installs localtest resources if needed.
func (s *Service) InstallResources(ctx context.Context) (InstallResourcesResult, error) {
	if s.ResourcesInstalled() {
		return InstallResourcesResult{
			ConfigError:      nil,
			AlreadyInstalled: true,
			ConfigCreated:    false,
		}, nil
	}

	opts := install.Options{
		DataDir: s.dataDir,
		Version: s.version,
		Force:   false,
	}
	if err := install.Install(ctx, opts); err != nil {
		return InstallResourcesResult{}, fmt.Errorf("install resources: %w", err)
	}

	configCreated := false
	var configErr error
	if err := config.Install(s.home, false); err == nil {
		configCreated = true
	} else {
		configErr = err
	}

	return InstallResourcesResult{
		ConfigError:      configErr,
		AlreadyInstalled: false,
		ConfigCreated:    configCreated,
	}, nil
}

// ResourcesInstalled reports whether localtest resources are already installed.
func (s *Service) ResourcesInstalled() bool {
	return install.IsInstalled(s.dataDir, s.version)
}
