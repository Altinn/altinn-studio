package cmd

import (
	"context"
	"fmt"
	"os"
	"os/exec"

	"altinn.studio/studioctl/internal/config"
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
	if len(args) > 0 {
		return fmt.Errorf("%w: unexpected argument %q", ErrInvalidFlagValue, args[0])
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
	host.Env = os.Environ()
	if os.Getenv(config.EnvAppDistCache) == "" {
		host.Env = append(host.Env, config.EnvAppDistCache+"="+c.server.cfg.AppDistCacheDir())
	}
	if err := host.Run(); err != nil {
		return fmt.Errorf("run app-config language server: %w", err)
	}
	return nil
}

func (c *AppCommand) appLspUsage() string {
	bin := osutil.CurrentBin()
	return joinLines(
		fmt.Sprintf("Usage: %s app lsp", bin),
		"",
		"Language server for Altinn app projects, speaking LSP over stdio.",
		"Editors start it automatically; you normally don't run it yourself.",
		"",
		"Editor setup:",
		"  Rider / JetBrains IDEs:",
		"    Install 'Altinn Studio Language Server' from JetBrains Marketplace.",
		"  VS Code:",
		"    Install 'Altinn Studio Language Server' (altinnstudio.altinn-studio-lsp)",
		"    from the Visual Studio Marketplace.",
		"  Other editors with LSP client support:",
		fmt.Sprintf("    Configure '%s app lsp' as an stdio language server with root marker", bin),
		"    config/applicationmetadata.json.",
		"",
		"Options:",
		"  -h, --help   Show this help",
	)
}
