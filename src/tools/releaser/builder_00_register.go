package main

import (
	"fmt"

	"altinn.studio/releaser/internal"
)

func registerBuilders() error {
	if err := internal.RegisterComponentBuilder("studioctl", newStudioctlBuilder()); err != nil {
		return fmt.Errorf("register studioctl builder: %w", err)
	}
	return nil
}
