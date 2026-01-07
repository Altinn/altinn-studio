package cmd

import (
	"bufio"
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/perm"
	"altinn.studio/studioctl/internal/ui"
)

// Shell types.
const (
	shellBash       = "bash"
	shellZsh        = "zsh"
	shellFish       = "fish"
	shellPowerShell = "powershell"
)

// Sentinel errors.
var (
	ErrUnsupportedShell = errors.New("unsupported shell")
	ErrBinaryPath       = errors.New("cannot determine binary path")
)

// ShellCommand implements the 'shell' subcommand.
type ShellCommand struct {
	cfg *config.Config
	out *ui.Output
}

// NewShellCommand creates a new shell command.
func NewShellCommand(cfg *config.Config, out *ui.Output) *ShellCommand {
	return &ShellCommand{cfg: cfg, out: out}
}

// Name returns the command name.
func (c *ShellCommand) Name() string { return "shell" }

// Synopsis returns a short description.
func (c *ShellCommand) Synopsis() string { return "Shell integration (alias, completions)" }

// Usage returns the full help text.
func (c *ShellCommand) Usage() string {
	return `Usage: studioctl shell <subcommand> [options]

Configure shell integration for studioctl.

Subcommands:
  alias    Configure a shell alias for studioctl

Run 'studioctl shell <subcommand> --help' for more information.
`
}

// Run executes the command.
func (c *ShellCommand) Run(ctx context.Context, args []string) error {
	if len(args) == 0 {
		c.out.Print(c.Usage())
		return nil
	}

	subCmd := args[0]
	subArgs := args[1:]

	switch subCmd {
	case "alias":
		return c.runAlias(ctx, subArgs)
	case "-h", flagHelp, helpSubcmd:
		c.out.Print(c.Usage())
		return nil
	default:
		return fmt.Errorf("%w: %s", ErrUnknownSubcommand, subCmd)
	}
}

type aliasFlags struct {
	aliasName string
	shell     string
	dryRun    bool
}

func (c *ShellCommand) runAlias(ctx context.Context, args []string) error {
	flags, showHelp, err := c.parseAliasFlags(args)
	if err != nil {
		return err
	}
	if showHelp {
		c.out.Print(c.aliasUsage())
		return nil
	}

	// Get binary path
	binaryPath, err := getBinaryPath()
	if err != nil {
		return fmt.Errorf("%w: %w", ErrBinaryPath, err)
	}

	// Detect or validate shell
	shell, err := c.resolveShell(flags.shell)
	if err != nil {
		return err
	}

	// Get config file path
	configPath, err := getShellConfigPath(ctx, shell)
	if err != nil {
		return err
	}

	// Generate alias line
	aliasLine := formatAliasLine(shell, flags.aliasName, binaryPath)

	if flags.dryRun {
		c.out.Printf("Shell:       %s\n", shell)
		c.out.Printf("Config file: %s\n", configPath)
		c.out.Printf("Alias line:  %s\n", aliasLine)
		return nil
	}

	// Check if alias already exists
	exists, existingLine, err := aliasExists(configPath, flags.aliasName, shell)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("checking existing alias: %w", err)
	}

	if exists {
		if existingLine == aliasLine {
			c.out.Success("Alias already configured in " + configPath)
			return nil
		}
		c.out.Warning(fmt.Sprintf("Alias '%s' already exists with different value:", flags.aliasName))
		c.out.Printf("  Existing: %s\n", existingLine)
		c.out.Printf("  New:      %s\n", aliasLine)
		c.out.Println("Remove the existing alias manually if you want to update it.")
		return nil
	}

	// Create config file if it doesn't exist
	if err := ensureConfigFileExists(configPath); err != nil {
		return fmt.Errorf("creating config file: %w", err)
	}

	// Append alias to config file
	if err := appendToFile(configPath, aliasLine); err != nil {
		return fmt.Errorf("writing alias to %s: %w", configPath, err)
	}

	c.out.Success(fmt.Sprintf("Added alias '%s' to %s", flags.aliasName, configPath))
	c.out.Println("")
	c.out.Println("To use the alias, reload your shell configuration:")
	c.out.Printf("  %s\n", getReloadCommand(shell, configPath))

	return nil
}

func (c *ShellCommand) aliasUsage() string {
	return `Usage: studioctl shell alias [options]

Configure a shell alias for studioctl.

Options:
  -a, --alias NAME   Alias name (default: "s")
  -s, --shell SHELL  Shell type: bash, zsh, fish, powershell (auto-detected if not specified)
  --dry-run          Print what would be added without modifying files
  -h                 Show this help

Supported shells:
  bash        ~/.bashrc
  zsh         ~/.zshrc
  fish        ~/.config/fish/config.fish
  powershell  $PROFILE (Windows PowerShell profile)

Examples:
  studioctl shell alias              # Add 's' alias to detected shell
  studioctl shell alias -a studio    # Use 'studio' as alias name
  studioctl shell alias --dry-run    # Preview changes without modifying files
  studioctl shell alias -s zsh       # Force zsh shell type
`
}

func (c *ShellCommand) parseAliasFlags(args []string) (aliasFlags, bool, error) {
	fs := flag.NewFlagSet("shell alias", flag.ContinueOnError)
	f := aliasFlags{
		aliasName: "s",
		shell:     "",
		dryRun:    false,
	}

	fs.StringVar(&f.aliasName, "a", "s", "Alias name")
	fs.StringVar(&f.aliasName, "alias", "s", "Alias name")
	fs.StringVar(&f.shell, "s", "", "Shell type")
	fs.StringVar(&f.shell, "shell", "", "Shell type")
	fs.BoolVar(&f.dryRun, "dry-run", false, "Preview changes")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return f, true, nil
		}
		return f, false, fmt.Errorf("parsing flags: %w", err)
	}

	return f, false, nil
}

func (c *ShellCommand) resolveShell(override string) (string, error) {
	if override != "" {
		shell := strings.ToLower(override)
		if !isValidShell(shell) {
			return "", fmt.Errorf("%w: %s (supported: bash, zsh, fish, powershell)", ErrUnsupportedShell, override)
		}
		return shell, nil
	}

	shell := detectShell()
	if shell == "" {
		return "", fmt.Errorf("%w: could not auto-detect shell, use -s/--shell flag", ErrUnsupportedShell)
	}
	return shell, nil
}

func getBinaryPath() (string, error) {
	exe, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("getting executable path: %w", err)
	}
	// Resolve symlinks to get the actual binary path
	resolved, err := filepath.EvalSymlinks(exe)
	if err != nil {
		return "", fmt.Errorf("resolving symlinks: %w", err)
	}
	return resolved, nil
}

func detectShell() string {
	// On Windows, default to PowerShell
	if runtime.GOOS == osWindows {
		return shellPowerShell
	}

	// On Unix-like systems, check SHELL env var
	shellPath := os.Getenv("SHELL")
	if shellPath == "" {
		return ""
	}

	shellName := filepath.Base(shellPath)
	switch shellName {
	case "bash":
		return shellBash
	case "zsh":
		return shellZsh
	case "fish":
		return shellFish
	default:
		return ""
	}
}

func isValidShell(shell string) bool {
	switch shell {
	case shellBash, shellZsh, shellFish, shellPowerShell:
		return true
	default:
		return false
	}
}

func getShellConfigPath(ctx context.Context, shell string) (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("getting home directory: %w", err)
	}

	switch shell {
	case shellBash:
		return filepath.Join(home, ".bashrc"), nil
	case shellZsh:
		return filepath.Join(home, ".zshrc"), nil
	case shellFish:
		return filepath.Join(home, ".config", "fish", "config.fish"), nil
	case shellPowerShell:
		return getPowerShellProfilePath(ctx)
	default:
		return "", fmt.Errorf("%w: %s", ErrUnsupportedShell, shell)
	}
}

const powerShellProfileTimeout = 5 * time.Second

func getPowerShellProfilePath(ctx context.Context) (string, error) {
	// Query PowerShell for the actual $PROFILE path.
	// Try PowerShell Core (pwsh) first, fall back to Windows PowerShell.
	ctx, cancel := context.WithTimeout(ctx, powerShellProfileTimeout)
	defer cancel()

	// Try PowerShell Core first (preferred on modern systems)
	if output, err := exec.CommandContext(ctx, "pwsh", "-NoProfile", "-Command", "echo $PROFILE").Output(); err == nil {
		if profile := strings.TrimSpace(string(output)); profile != "" {
			return profile, nil
		}
	}

	// Fall back to Windows PowerShell
	if output, err := exec.CommandContext(ctx, "powershell", "-NoProfile", "-Command", "echo $PROFILE").
		Output(); err == nil {
		if profile := strings.TrimSpace(string(output)); profile != "" {
			return profile, nil
		}
	}

	// Fallback to default PowerShell Core path
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("getting home directory: %w", err)
	}

	return filepath.Join(home, "Documents", "PowerShell", "Microsoft.PowerShell_profile.ps1"), nil
}

func formatAliasLine(shell, aliasName, binaryPath string) string {
	switch shell {
	case shellBash, shellZsh:
		return fmt.Sprintf("alias %s='%s'", aliasName, binaryPath)
	case shellFish:
		return fmt.Sprintf("alias %s '%s'", aliasName, binaryPath)
	case shellPowerShell:
		return fmt.Sprintf("Set-Alias -Name %s -Value '%s'", aliasName, binaryPath)
	default:
		return ""
	}
}

func aliasExists(configPath, aliasName, shell string) (bool, string, error) {
	//nolint:gosec // path is constructed from known safe sources
	file, err := os.Open(configPath)
	if err != nil {
		return false, "", fmt.Errorf("opening config file: %w", err)
	}
	defer file.Close() //nolint:errcheck // best-effort close on read

	// Build pattern to match alias declaration
	var prefix string
	switch shell {
	case shellBash, shellZsh:
		prefix = "alias " + aliasName + "="
	case shellFish:
		prefix = "alias " + aliasName + " "
	case shellPowerShell:
		prefix = "Set-Alias -Name " + aliasName + " "
	}

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if strings.HasPrefix(line, prefix) {
			return true, line, nil
		}
	}

	if err := scanner.Err(); err != nil {
		return false, "", fmt.Errorf("scanning config file: %w", err)
	}
	return false, "", nil
}

func ensureConfigFileExists(path string) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, perm.DirPermDefault); err != nil {
		return fmt.Errorf("creating directory %s: %w", dir, err)
	}

	// Check if file exists
	if _, err := os.Stat(path); os.IsNotExist(err) {
		//nolint:gosec // path is constructed from known safe sources
		file, err := os.Create(path)
		if err != nil {
			return fmt.Errorf("creating config file: %w", err)
		}
		if err := file.Close(); err != nil {
			return fmt.Errorf("closing config file: %w", err)
		}
	}

	return nil
}

func appendToFile(path, line string) error {
	//nolint:gosec // path is constructed from known safe sources
	file, err := os.OpenFile(path, os.O_APPEND|os.O_WRONLY, perm.FilePermDefault)
	if err != nil {
		return fmt.Errorf("opening file for append: %w", err)
	}
	defer file.Close() //nolint:errcheck // best-effort close after write

	// Check if file ends with newline
	stat, err := file.Stat()
	if err != nil {
		return fmt.Errorf("getting file info: %w", err)
	}

	// Add newline before alias if file is not empty and doesn't end with newline
	prefix := ""
	if stat.Size() > 0 {
		// Read last byte to check for newline
		buf := make([]byte, 1)
		if _, readErr := file.ReadAt(buf, stat.Size()-1); readErr == nil && buf[0] != '\n' {
			prefix = "\n"
		}
		// Add extra newline for spacing
		prefix += "\n"
	}

	if _, err := file.WriteString(prefix + line + "\n"); err != nil {
		return fmt.Errorf("writing to file: %w", err)
	}
	return nil
}

func getReloadCommand(shell, configPath string) string {
	switch shell {
	case shellBash, shellZsh, shellFish:
		return "source " + configPath
	case shellPowerShell:
		return ". " + configPath
	default:
		return "Restart your shell"
	}
}
