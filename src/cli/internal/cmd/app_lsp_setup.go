package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"altinn.studio/studioctl/internal/osutil"
)

func (c *AppCommand) runLspSetup(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("app lsp setup", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	var printOnly bool
	fs.BoolVar(&printOnly, "print", false, "Print configuration without applying changes")

	var editor string
	if len(args) > 0 && !strings.HasPrefix(args[0], "-") {
		editor = strings.ToLower(args[0])
		args = args[1:]
	}
	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			c.out.Print(c.appLspSetupUsage())
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}
	rest := fs.Args()
	if editor == "" && len(rest) > 0 {
		editor = strings.ToLower(rest[0])
		rest = rest[1:]
	}
	if len(rest) > 0 {
		return fmt.Errorf("%w: unexpected argument %q", ErrInvalidFlagValue, rest[0])
	}

	switch editor {
	case "":
		c.out.Print(c.appLspSetupUsage())
		return nil
	case "vscode", "code", "code-server", "codium":
		return c.setupVSCode(ctx, printOnly)
	case "nvim", "neovim":
		c.out.Print(nvimConfigSnippet())
		return nil
	case "helix", "hx":
		c.out.Print(helixConfigSnippet())
		return nil
	case "rider", "jetbrains", "intellij":
		c.out.Print(riderSetupInstructions())
		return nil
	default:
		return fmt.Errorf("%w: %s (supported: vscode, nvim, helix, rider)", ErrInvalidFlagValue, editor)
	}
}

func (c *AppCommand) setupVSCode(ctx context.Context, printOnly bool) error {
	vsix := c.server.cfg.VSCodeExtensionVsixPath()
	if _, err := os.Stat(vsix); err != nil {
		c.out.Warninglnf("The bundled VS Code extension is not present at %s.", vsix)
		c.out.Println("It ships in the studioctl resources archive when the build host has npm.")
		c.out.Println("Reinstall studioctl from a build with npm available, or build it from source:")
		c.out.Println("  (in src/cli/studioctl-lsp/vscode)  npm install && npm run compile && npx @vscode/vsce package")
		return fmt.Errorf("bundled VS Code extension missing: %w", err)
	}

	vscodeBinaries := []string{"code", "code-server", "codium", "code-insiders"}
	found := make([]string, 0, len(vscodeBinaries))
	for _, bin := range vscodeBinaries {
		if _, err := exec.LookPath(bin); err == nil {
			found = append(found, bin)
		}
	}

	if printOnly || len(found) == 0 {
		if len(found) == 0 && !printOnly {
			c.out.Warninglnf("No VS Code CLI found on PATH (looked for: %s).", strings.Join(vscodeBinaries, ", "))
		}
		c.out.Println("Install the bundled Altinn App Config extension with:")
		c.out.Printlnf("  code --install-extension %s --force", vsix)
		c.out.Println("Substitute 'code-server' or 'codium' for 'code' as appropriate.")
		return nil
	}

	for _, bin := range found {
		c.out.Verbosef("Installing the bundled extension via %s", bin)
		//nolint:gosec // G204: bin is from the fixed vscodeBinaries allowlist, resolved via LookPath.
		install := exec.CommandContext(ctx, bin, "--install-extension", vsix, "--force")
		install.Stdout = os.Stdout
		install.Stderr = os.Stderr
		if err := install.Run(); err != nil {
			return fmt.Errorf("install extension via %s: %w", filepath.Base(bin), err)
		}
		c.out.Successf("Installed the Altinn App Config extension in %s", bin)
	}
	return nil
}

func nvimConfigSnippet() string {
	bin := osutil.CurrentBin()
	return joinLines(
		"-- Altinn app-config LSP (Neovim 0.11+).",
		"-- Add to your editor config and restart Neovim.",
		"vim.lsp.config('studioctl_appconfig', {",
		fmt.Sprintf("  cmd = { '%s', 'app', 'lsp' },", bin),
		"  filetypes = { 'json', 'jsonc', 'xml', 'cs' },",
		"  -- Root at the app: the directory that contains App/ (App/config must resolve under it).",
		"  root_markers = { 'App' },",
		"})",
		"vim.lsp.enable('studioctl_appconfig')",
		"",
	)
}

func helixConfigSnippet() string {
	bin := osutil.CurrentBin()
	return joinLines(
		"# Altinn app-config LSP for Helix.",
		"# Add to ~/.config/helix/languages.toml and restart Helix.",
		"[language-server.studioctl-appconfig]",
		fmt.Sprintf("command = %q", bin),
		`args = ["app", "lsp"]`,
		"",
		"[[language]]",
		`name = "json"`,
		`language-servers = ["studioctl-appconfig"]`,
		"",
		"[[language]]",
		`name = "c-sharp"`,
		`language-servers = ["omnisharp", "studioctl-appconfig"]`,
		"",
	)
}

func riderSetupInstructions() string {
	bin := osutil.CurrentBin()
	return joinLines(
		"Altinn app-config LSP for JetBrains IDEs (Rider, IntelliJ, ...).",
		"",
		"JetBrains IDEs have no built-in way to register a custom language server,",
		"so use the LSP4IJ plugin:",
		"",
		"1. Install 'LSP4IJ' ( https://plugins.jetbrains.com/plugin/23257-lsp4ij ) from Settings > Plugins > Marketplace.",
		"2. Open the 'Language Servers' tool window (View > Tool Windows > Language Servers),",
		"   click '+' to create a new user-defined server, and fill in:",
		"     Name:    Altinn App Config",
		fmt.Sprintf("     Command: %s app lsp", bin),
		"3. In the Mappings tab, add file name patterns (leave language/file type empty):",
		"     *.json",
		"     *.xml",
		"     *.bpmn",
		"     **/App/models/*.cs",
		"4. Apply, then open a file under an app's App/ directory to start the server.",
		"",
	)
}

func (c *AppCommand) appLspSetupUsage() string {
	bin := osutil.CurrentBin()
	return joinLines(
		fmt.Sprintf("Usage: %s app lsp setup <editor> [--print]", bin),
		"",
		"Configure an editor to use the Altinn app-config language server.",
		fmt.Sprintf("Every editor launches the shared server via '%s app lsp'.", bin),
		"",
		"Editors:",
		"  vscode    Install the extension (auto-detects code / code-server / codium)",
		"  nvim      Print a Neovim (0.11+) vim.lsp config snippet",
		"  helix     Print a Helix languages.toml snippet",
		"  rider     Print LSP4IJ setup instructions for JetBrains IDEs",
		"",
		"Options:",
		"      --print   Print instructions/config without applying changes",
		"  -h, --help    Show this help",
	)
}
