// Package cmd implements the studioctl command-line interface.
package cmd

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

// version is set at build time via ldflags.
var version = "dev"

var (
	errMainConfigInit     = errors.New("initialize config")
	errDoctorFallbackInit = errors.New("initialize doctor fallback config")
)

const (
	defaultLogFollow = false
	flagHelp         = "--help"
	flagVersion      = "--version"
	helpSubcmd       = "help"
	versionSubcmd    = "version"
)

// Command represents a subcommand.
type Command interface {
	Name() string
	Synopsis() string
	Usage() string
	Run(ctx context.Context, args []string) error
}

// CLI coordinates command registration and execution.
type CLI struct {
	cfg      *config.Config
	out      *ui.Output
	commands map[string]Command
}

// NewCLI builds a CLI with default command registrations.
func NewCLI(cfg *config.Config) *CLI {
	out := ui.DefaultOutput(cfg.Verbose)
	cli := &CLI{
		cfg:      cfg,
		out:      out,
		commands: make(map[string]Command),
	}

	cli.Register(NewRunCommand(cfg, out))
	cli.Register(NewStopCommand(cfg, out))
	cli.Register(NewEnvCommand(cfg, out))
	cli.Register(NewAuthCommand(cfg, out))
	cli.Register(NewDoctorCommand(cfg, out))
	cli.Register(NewSelfCommand(cfg, out))
	cli.Register(NewAppCommand(cfg, out))
	cli.Register(NewServerCommand(cfg, out))
	cli.Register(NewShellCommand(cfg, out))
	cli.Register(NewAppContainersCommand(cfg, out))

	return cli
}

// Register adds a subcommand by its name.
func (c *CLI) Register(cmd Command) {
	c.commands[cmd.Name()] = cmd
}

// Run executes the selected subcommand and returns a process exit code.
func (c *CLI) Run(ctx context.Context, args []string) int {
	if len(args) == 0 {
		c.printUsage()
		return 0
	}

	cmdName := args[0]

	if cmdName == "-h" || cmdName == flagHelp || cmdName == "help" {
		c.printUsage()
		return 0
	}

	if cmdName == "-V" || cmdName == flagVersion || cmdName == versionSubcmd {
		c.out.Printlnf("%s %s", osutil.CurrentBin(), c.cfg.Version)
		return 0
	}

	cmd, ok := c.commands[cmdName]
	if !ok {
		c.out.Errorf("unknown command: %s", cmdName)
		c.out.Println("")
		c.printUsage()
		return 1
	}

	if err := cmd.Run(ctx, args[1:]); err != nil {
		c.out.Error(err.Error())
		return 1
	}

	return 0
}

func (c *CLI) printUsage() {
	c.out.Printlnf("%s - Altinn Studio CLI", osutil.CurrentBin())
	c.out.Println("")
	c.out.Printlnf("Usage: %s <command> [options]", osutil.CurrentBin())
	c.out.Println("")
	c.out.Println("Commands:")

	maxLen := 0
	for name := range c.commands {
		if len(name) > maxLen {
			maxLen = len(name)
		}
	}

	order := []string{"run", "stop", "env", "auth", "app", "install", "doctor", "self", "server", "shell"}
	for _, name := range order {
		if cmd, ok := c.commands[name]; ok {
			c.out.Printlnf("  %-*s  %s", maxLen+2, name, cmd.Synopsis())
		}
	}

	c.out.Println("")
	c.out.Println("Global Options:")
	c.out.Printlnf("  --home DIR        Override home directory (default: %s)", defaultHomePathForHelp())
	c.out.Println("  --socket-dir DIR  Override socket directory")
	c.out.Println("  -v, --verbose     Verbose output")
	c.out.Println("  -V, --version     Print version")
	c.out.Println("  -h, --help        Print help")
	c.out.Println("")
	c.out.Printlnf("Run '%s <command> --help' for more information on a command.", osutil.CurrentBin())
}

func defaultHomePathForHelp() string {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "<platform-config-dir>/" + config.AppName
	}
	return filepath.Join(configDir, config.AppName)
}

func parseVerboseFlag(arg string) bool {
	switch arg {
	case "-v", "--verbose":
		return true
	}
	return false
}

func parseStringFlag(args []string, i int, name string) (value string, skip int, handled bool, err error) {
	arg := args[i]
	prefix := "--" + name + "="
	if value, found := strings.CutPrefix(arg, prefix); found {
		return value, 0, true, nil
	}
	if arg == "--"+name && i+1 < len(args) {
		nextArg := args[i+1]
		if isKnownGlobalFlag(nextArg) {
			return "", 0, false, fmt.Errorf(
				"flag --%s requires a value, got flag %s: %w",
				name, nextArg, ErrInvalidFlagValue,
			)
		}
		return nextArg, 1, true, nil
	}
	if arg == "--"+name {
		return "", 0, false, fmt.Errorf("flag --%s requires a value: %w", name, ErrInvalidFlagValue)
	}
	return "", 0, false, nil
}

func isKnownGlobalFlag(arg string) bool {
	switch arg {
	case "--home", "--socket-dir", "-v", "--verbose", "-h", flagHelp, "-V", flagVersion:
		return true
	}
	return strings.HasPrefix(arg, "--home=") || strings.HasPrefix(arg, "--socket-dir=")
}

func isPassthroughFlag(arg string) bool {
	return arg == "-h" || arg == flagHelp || arg == "-V" || arg == flagVersion
}

// ParseGlobalFlags extracts global flags and returns remaining args.
func ParseGlobalFlags() (config.Flags, []string, error) {
	var flags config.Flags
	args := os.Args[1:]
	var remaining []string
	verbose := false

	for i := 0; i < len(args); i++ {
		arg := args[i]

		if parseVerboseFlag(arg) {
			verbose = true
			continue
		}

		if val, skip, ok, err := parseStringFlag(args, i, "home"); err != nil {
			return config.Flags{}, nil, fmt.Errorf("parsing --home flag: %w", err)
		} else if ok {
			flags.Home = val
			i += skip
			continue
		}
		if val, skip, ok, err := parseStringFlag(args, i, "socket-dir"); err != nil {
			return config.Flags{}, nil, fmt.Errorf("parsing --socket-dir flag: %w", err)
		} else if ok {
			flags.SocketDir = val
			i += skip
			continue
		}

		if isPassthroughFlag(arg) {
			remaining = append(remaining, arg)
			continue
		}

		if strings.HasPrefix(arg, "-") {
			remaining = append(remaining, arg)
			continue
		}

		remaining = append(remaining, args[i:]...)
		break
	}

	flags.Verbose = verbose
	return flags, remaining, nil
}

func shouldInitializeConfig(args []string) bool {
	if len(args) == 0 {
		return false
	}
	switch args[0] {
	case "-V", flagVersion, versionSubcmd, "-h", flagHelp, helpSubcmd:
		return false
	}
	for _, arg := range args {
		if arg == "-h" || arg == flagHelp {
			return false
		}
	}
	return true
}

func newEphemeralConfig(flags config.Flags, version string) *config.Config {
	var images config.ImagesConfig

	return &config.Config{
		Home:      "",
		SocketDir: "",
		LogDir:    "",
		DataDir:   "",
		BinDir:    "",
		Images:    images,
		Version:   version,
		Verbose:   flags.Verbose,
	}
}

func isDoctorInvocation(args []string) bool {
	return len(args) > 0 && args[0] == "doctor"
}

func initializeMainConfig(flags config.Flags, args []string) (*config.Config, error) {
	if !shouldInitializeConfig(args) {
		return newEphemeralConfig(flags, version), nil
	}

	cfg, err := config.New(flags, version)
	if err == nil {
		return cfg, nil
	}
	if !isDoctorInvocation(args) {
		return nil, fmt.Errorf("%w: %w", errMainConfigInit, err)
	}

	fallbackCfg, fallbackErr := config.NewDoctorFallback(flags, version)
	if fallbackErr != nil {
		return nil, errors.Join(
			fmt.Errorf("%w: %w", errMainConfigInit, err),
			fmt.Errorf("%w: %w", errDoctorFallbackInit, fallbackErr),
		)
	}

	fmt.Fprintf(
		os.Stderr,
		"warning: config initialization failed, running doctor with fallback paths: %v%s",
		err,
		osutil.LineBreak,
	)
	return fallbackCfg, nil
}

// Main is the entry point for studioctl.
func Main() int {
	flags, args, err := ParseGlobalFlags()
	if err != nil {
		fmt.Fprintf(os.Stderr, "error parsing flags: %v%s", err, osutil.LineBreak)
		return 1
	}

	cfg, err := initializeMainConfig(flags, args)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v%s", err, osutil.LineBreak)
		return 1
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	cli := NewCLI(cfg)
	return cli.Run(ctx, args)
}
