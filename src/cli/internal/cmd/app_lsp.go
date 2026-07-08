package cmd

import (
	"context"
	"fmt"
	"os"
	"os/exec"

	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/studioctlserver"
)

// runLsp execs the installed studioctl-server binary in `lsp` mode with the editor's
// stdio passed straight through.
func (c *AppCommand) runLsp(ctx context.Context, args []string) error {
	if len(args) > 0 && (args[0] == "-h" || args[0] == flagHelp || args[0] == helpSubcmd) {
		c.out.Print(c.appLspUsage())
		return nil
	}
	if len(args) > 0 && args[0] == "setup" {
		return c.runLspSetup(ctx, args[1:])
	}

	binary := c.server.cfg.StudioctlServerBinaryPath()
	if _, err := os.Stat(binary); err != nil {
		return fmt.Errorf("%w: %s", studioctlserver.ErrBinaryMissing, binary)
	}

	//nolint:gosec // G204: path comes from resolved studioctl config, not user input.
	host := exec.CommandContext(ctx, binary, "lsp")
	host.Stdin = os.Stdin
	host.Stdout = os.Stdout
	host.Stderr = os.Stderr
	if err := host.Run(); err != nil {
		return fmt.Errorf("run app-config language server: %w", err)
	}
	return nil
}

func (c *AppCommand) appLspUsage() string {
	bin := osutil.CurrentBin()
	return joinLines(
		fmt.Sprintf("Usage: %s app lsp [setup <editor>]", bin),
		"",
		"Run the Altinn app-config language server (LSP) over stdio.",
		"",
		"Subcommands:",
		fmt.Sprintf("  setup <editor>   Configure an editor (run '%s app lsp setup' for the list)", bin),
		"",
		"Options:",
		"  -h, --help   Show this help",
	)
}
