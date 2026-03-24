// Package shell contains command-specific shell application logic.
package shell

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"altinn.studio/studioctl/internal/osutil"
)

const (
	osWindows = "windows"

	shellBash       = "bash"
	shellZsh        = "zsh"
	shellFish       = "fish"
	shellPowerShell = "powershell"

	powerShellProfileTimeout = 5 * time.Second
)

var (
	// ErrUnsupportedShell indicates an unsupported or unknown shell type.
	ErrUnsupportedShell = errors.New("unsupported shell")
	// ErrBinaryPath indicates failure to resolve the studioctl binary path.
	ErrBinaryPath = errors.New("cannot determine binary path")
	// ErrInvalidAliasName indicates invalid shell alias identifier syntax.
	ErrInvalidAliasName = errors.New("invalid alias name")
)

// AliasStatus describes the result state of alias configuration.
type AliasStatus string

const (
	// AliasStatusDryRun indicates dry-run mode where no file mutation was made.
	AliasStatusDryRun AliasStatus = "dry_run"
	// AliasStatusAlreadyConfigured indicates alias already matches desired line.
	AliasStatusAlreadyConfigured AliasStatus = "already_configured"
	// AliasStatusConflict indicates alias exists with a conflicting value.
	AliasStatusConflict AliasStatus = "conflict"
	// AliasStatusAdded indicates alias line was appended to shell config.
	AliasStatusAdded AliasStatus = "added"
)

// AliasOptions contains inputs for alias configuration.
type AliasOptions struct {
	AliasName string
	Shell     string
	DryRun    bool
}

// AliasResult describes the computed or applied alias outcome.
type AliasResult struct {
	AliasLine     string
	ConfigPath    string
	ExistingLine  string
	ReloadCommand string
	Shell         string
	Status        AliasStatus
}

// Service contains shell application logic.
type Service struct{}

// NewService creates a new shell service.
func NewService() *Service {
	return &Service{}
}

// ConfigureAlias resolves and optionally applies shell alias configuration.
func (s *Service) ConfigureAlias(ctx context.Context, opts AliasOptions) (AliasResult, error) {
	binaryPath, err := getBinaryPath()
	if err != nil {
		return AliasResult{}, fmt.Errorf("%w: %w", ErrBinaryPath, err)
	}

	shell, err := resolveShell(opts.Shell)
	if err != nil {
		return AliasResult{}, err
	}

	configPath, err := getShellConfigPath(ctx, shell)
	if err != nil {
		return AliasResult{}, err
	}

	validateErr := ValidateAliasName(opts.AliasName)
	if validateErr != nil {
		return AliasResult{}, validateErr
	}
	if strings.ContainsAny(binaryPath, "\r\n") {
		return AliasResult{}, fmt.Errorf("%w: binary path contains newline", ErrBinaryPath)
	}

	aliasLine := FormatAliasLine(shell, opts.AliasName, binaryPath)
	result := AliasResult{
		AliasLine:     aliasLine,
		ConfigPath:    configPath,
		ExistingLine:  "",
		ReloadCommand: "",
		Shell:         shell,
		Status:        "",
	}

	if opts.DryRun {
		result.Status = AliasStatusDryRun
		return result, nil
	}

	exists, existingLine, err := aliasExists(configPath, opts.AliasName, shell)
	if err != nil && !os.IsNotExist(err) {
		return AliasResult{}, fmt.Errorf("checking existing alias: %w", err)
	}
	if exists {
		result.ExistingLine = existingLine
		if existingLine == aliasLine {
			result.Status = AliasStatusAlreadyConfigured
			return result, nil
		}
		result.Status = AliasStatusConflict
		return result, nil
	}

	if err := ensureConfigFileExists(configPath); err != nil {
		return AliasResult{}, fmt.Errorf("creating config file: %w", err)
	}
	if err := appendToFile(configPath, aliasLine); err != nil {
		return AliasResult{}, fmt.Errorf("writing alias to %s: %w", configPath, err)
	}

	result.ReloadCommand = getReloadCommand(shell, configPath)
	result.Status = AliasStatusAdded
	return result, nil
}

func resolveShell(override string) (string, error) {
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
	resolved, err := filepath.EvalSymlinks(exe)
	if err != nil {
		return "", fmt.Errorf("resolving symlinks: %w", err)
	}
	return resolved, nil
}

func detectShell() string {
	if runtime.GOOS == osWindows {
		return shellPowerShell
	}

	shellPath := os.Getenv("SHELL")
	if shellPath == "" {
		return ""
	}

	switch filepath.Base(shellPath) {
	case shellBash:
		return shellBash
	case shellZsh:
		return shellZsh
	case shellFish:
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

func getPowerShellProfilePath(ctx context.Context) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, powerShellProfileTimeout)
	defer cancel()

	if output, err := exec.CommandContext(ctx, "pwsh", "-NoProfile", "-Command", "echo $PROFILE").Output(); err == nil {
		if profile := strings.TrimSpace(string(output)); profile != "" {
			return profile, nil
		}
	}

	if output, err := exec.CommandContext(ctx, "powershell", "-NoProfile", "-Command", "echo $PROFILE").
		Output(); err == nil {
		if profile := strings.TrimSpace(string(output)); profile != "" {
			return profile, nil
		}
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("getting home directory: %w", err)
	}
	return filepath.Join(home, "Documents", "PowerShell", "Microsoft.PowerShell_profile.ps1"), nil
}

// ValidateAliasName verifies the alias identifier format.
func ValidateAliasName(name string) error {
	if name == "" {
		return fmt.Errorf("%w: empty", ErrInvalidAliasName)
	}
	if !isASCIIAlpha(name[0]) && name[0] != '_' {
		return fmt.Errorf("%w: %q", ErrInvalidAliasName, name)
	}
	for i := 1; i < len(name); i++ {
		c := name[i]
		if !isASCIIAlphaNum(c) && c != '_' {
			return fmt.Errorf("%w: %q", ErrInvalidAliasName, name)
		}
	}
	return nil
}

func isASCIIAlpha(c byte) bool {
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
}

func isASCIIAlphaNum(c byte) bool {
	return isASCIIAlpha(c) || (c >= '0' && c <= '9')
}

func quotePOSIXSingle(s string) string {
	if !strings.Contains(s, "'") {
		return "'" + s + "'"
	}
	var b strings.Builder
	b.Grow(len(s) + 2)
	b.WriteByte('\'')
	for i := range len(s) {
		if s[i] == '\'' {
			b.WriteString("'\"'\"'")
			continue
		}
		b.WriteByte(s[i])
	}
	b.WriteByte('\'')
	return b.String()
}

func quotePowerShellSingle(s string) string {
	return "'" + strings.ReplaceAll(s, "'", "''") + "'"
}

// FormatAliasLine creates a shell-specific alias declaration.
func FormatAliasLine(shell, aliasName, binaryPath string) string {
	switch shell {
	case shellBash, shellZsh:
		return fmt.Sprintf("alias %s=%s", aliasName, quotePOSIXSingle(binaryPath))
	case shellFish:
		return fmt.Sprintf("alias %s %s", aliasName, quotePOSIXSingle(binaryPath))
	case shellPowerShell:
		return fmt.Sprintf("Set-Alias -Name %s -Value %s", aliasName, quotePowerShellSingle(binaryPath))
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
	if err := os.MkdirAll(dir, osutil.DirPermDefault); err != nil {
		return fmt.Errorf("creating directory %s: %w", dir, err)
	}

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
	file, err := os.OpenFile(path, os.O_APPEND|os.O_RDWR, osutil.FilePermDefault)
	if err != nil {
		return fmt.Errorf("opening file for append: %w", err)
	}
	defer file.Close() //nolint:errcheck // best-effort close after write

	stat, err := file.Stat()
	if err != nil {
		return fmt.Errorf("getting file info: %w", err)
	}

	prefix := ""
	if stat.Size() > 0 {
		buf := make([]byte, 1)
		if _, readErr := file.ReadAt(buf, stat.Size()-1); readErr == nil && buf[0] != '\n' {
			prefix = "\n"
		} else if readErr != nil {
			prefix = "\n"
		}
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
