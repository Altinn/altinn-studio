// Package install contains studioctl installation, update, and packaging helpers.
package install

import (
	"context"
	"fmt"

	"altinn.studio/studioctl/internal/config"
)

// Service contains studioctl install and update logic.
type Service struct {
	cfg          *config.Config
	installHooks func(context.Context) error
}

// BinaryInstallOptions contains callbacks invoked during binary installation.
type BinaryInstallOptions struct {
	BeforeInstallBinary func(path string)
	AfterInstallBinary  func(BundleInstallResult)
}

// BundleInstallResult describes a completed bundle installation.
type BundleInstallResult struct {
	BinaryPath             string
	BinaryAlreadyInstalled bool
}

// NewService creates a new install service.
func NewService(cfg *config.Config, installHooks ...func(context.Context) error) *Service {
	var hooks func(context.Context) error
	if len(installHooks) > 0 {
		hooks = installHooks[0]
	}
	return &Service{
		cfg:          cfg,
		installHooks: hooks,
	}
}

// InstallBundleBinary installs the bundle binary.
func (s *Service) InstallBundleBinary(
	bundle Bundle,
	opts BinaryInstallOptions,
) (BundleInstallResult, error) {
	if opts.BeforeInstallBinary != nil {
		opts.BeforeInstallBinary(bundle.installPath)
	}

	installedPath, alreadyInstalled, err := bundle.installBinary()
	if err != nil {
		return BundleInstallResult{}, fmt.Errorf("install binary: %w", err)
	}
	result := BundleInstallResult{
		BinaryPath:             installedPath,
		BinaryAlreadyInstalled: alreadyInstalled,
	}
	if opts.AfterInstallBinary != nil {
		opts.AfterInstallBinary(result)
	}

	return result, nil
}
