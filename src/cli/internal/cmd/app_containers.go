package cmd

import (
	"context"
	"encoding/json"
	"fmt"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/studioctl/internal/appcontainers"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

// AppContainersCommand is a hidden command used by app-manager for container runtime discovery.
type AppContainersCommand struct {
	out *ui.Output
}

// NewAppContainersCommand creates a hidden app-container discovery command.
func NewAppContainersCommand(_ *config.Config, out *ui.Output) *AppContainersCommand {
	return &AppContainersCommand{out: out}
}

// Name returns the command name.
func (c *AppContainersCommand) Name() string { return "__app-containers" }

// Synopsis returns a short description.
func (c *AppContainersCommand) Synopsis() string { return "List app containers" }

// Usage returns the full help text.
func (c *AppContainersCommand) Usage() string { return "" }

// Run executes the command.
func (c *AppContainersCommand) Run(ctx context.Context, _ []string) error {
	client, err := container.Detect(ctx)
	if err != nil {
		return fmt.Errorf("connect to container runtime: %w", err)
	}
	defer func() {
		if cerr := client.Close(); cerr != nil {
			c.out.Verbosef("failed to close container client: %v", cerr)
		}
	}()

	candidates, err := appcontainers.Discover(ctx, client)
	if err != nil {
		return fmt.Errorf("discover app containers: %w", err)
	}

	data, err := json.Marshal(candidates)
	if err != nil {
		return fmt.Errorf("encode app-container candidates: %w", err)
	}
	c.out.Println(string(data))
	return nil
}
