//go:build !windows

package cmd

import (
	"context"
	"fmt"

	installpkg "altinn.studio/studioctl/internal/install"
)

func (c *SelfCommand) startWindowsUpdateHelper(installpkg.ResolvedBundle) error {
	return fmt.Errorf("%w: Windows self helper is only available on Windows", ErrInvalidFlagValue)
}

func (c *SelfCommand) startWindowsUninstallHelper() error {
	return fmt.Errorf("%w: Windows self helper is only available on Windows", ErrInvalidFlagValue)
}

func (c *SelfCommand) runWindowsSelfHelper(context.Context, []string) error {
	return fmt.Errorf("%w: Windows self helper is only available on Windows", ErrInvalidFlagValue)
}
