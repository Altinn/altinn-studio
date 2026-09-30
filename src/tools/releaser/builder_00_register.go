package main

import (
	"fmt"

	"altinn.studio/releaser/internal"
)

func registerBuilders() error {
	if err := internal.RegisterComponentBuilder("studioctl", newStudioctlBuilder()); err != nil {
		return fmt.Errorf("register studioctl builder: %w", err)
	}
	if err := internal.RegisterComponentBuilder("app", newAppBuilder()); err != nil {
		return fmt.Errorf("register app builder: %w", err)
	}
	return nil
}
