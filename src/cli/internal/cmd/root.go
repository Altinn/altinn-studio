// Package cmd implements the studioctl command-line interface.
package cmd

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/ui"
)

// version is set at build time via ldflags.
var version = "dev"

const (
	// flagHelp is the long-form help flag.
	flagHelp = "--help"
	// helpSubcmd is the help subcommand name.
	helpSubcmd = "help"
)

// Command represents a subcommand.
type Command interface {
	Name() string
	Synopsis() string
	Usage() string
	Run(ctx context.Context, args []string) error
}

// CLI is the main command-line interface.
type CLI struct {
	cfg      *config.Config
	out      *ui.Output
	commands map[string]Command
}

// NewCLI creates a new CLI instance.
func NewCLI(cfg *config.Config) *CLI {
	out := ui.DefaultOutput(cfg.Verbose, cfg.Debug)
	cli := &CLI{
		cfg:      cfg,
		out:      out,
		commands: make(map[string]Command),
	}

	// Register commands
	cli.Register(NewRunCommand(cfg, out))
	cli.Register(NewEnvCommand(cfg, out))
	cli.Register(NewAuthCommand(cfg, out))
	cli.Register(NewDoctorCommand(cfg, out))
	cli.Register(NewSelfCommand(cfg, out))
	cli.Register(NewAppCommand(cfg, out))
	cli.Register(NewServersCommand(cfg, out))
	cli.Register(NewShellCommand(cfg, out))

	return cli
}

// Register adds a command to the CLI.
func (c *CLI) Register(cmd Command) {
	c.commands[cmd.Name()] = cmd
}

// Run executes the CLI with the given arguments.
func (c *CLI) Run(ctx context.Context, args []string) int {
	if len(args) == 0 {
		c.printUsage()
		return 0
	}

	cmdName := args[0]

	// Handle special flags
	if cmdName == "-h" || cmdName == flagHelp || cmdName == "help" {
		c.printUsage()
		return 0
	}

	if cmdName == "-V" || cmdName == "--version" || cmdName == "version" {
		c.out.Printf("studioctl %s\n", c.cfg.Version)
		return 0
	}

	// Find and run command
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
	c.out.Printf("studioctl - Altinn Studio CLI\n\n")
	c.out.Printf("Usage: studioctl <command> [options]\n\n")
	c.out.Printf("Commands:\n")

	// Calculate max command name length for alignment
	maxLen := 0
	for name := range c.commands {
		if len(name) > maxLen {
			maxLen = len(name)
		}
	}

	// Print commands in a reasonable order
	order := []string{"run", "env", "auth", "app", "install", "doctor", "self", "servers", "shell"}
	for _, name := range order {
		if cmd, ok := c.commands[name]; ok {
			c.out.Printf("  %-*s  %s\n", maxLen+2, name, cmd.Synopsis())
		}
	}

	c.out.Printf("\nGlobal Options:\n")
	c.out.Printf("  --home DIR        Override home directory (default: ~/.altinn-studio)\n")
	c.out.Printf("  --socket-dir DIR  Override socket directory\n")
	c.out.Printf("  -v, --verbose     Verbose output\n")
	c.out.Printf("  -vv, --debug      Debug output\n")
	c.out.Printf("  -V, --version     Print version\n")
	c.out.Printf("  -h, --help        Print help\n")
	c.out.Printf("\nRun 'studioctl <command> --help' for more information on a command.\n")
}

// parseVerboseFlag handles -v, --verbose, -vv, --debug, and combined -vvv style flags.
// Returns the new verbose count and whether the flag was handled.
func parseVerboseFlag(arg string, currentCount int) (int, bool) {
	switch arg {
	case "-v", "--verbose":
		return currentCount + 1, true
	case "-vv", "--debug":
		return 2, true
	}
	// Handle combined short flags like -vvv
	if strings.HasPrefix(arg, "-") && !strings.HasPrefix(arg, "--") {
		trimmed := strings.TrimLeft(arg, "-")
		if trimmed != "" && strings.Count(trimmed, "v") == len(trimmed) {
			return len(trimmed), true
		}
	}
	return currentCount, false
}

// parseStringFlag handles --name value and --name=value style flags.
// Returns the value, skip count (0 or 1), and whether the flag was handled.
func parseStringFlag(args []string, i int, name string) (value string, skip int, handled bool) {
	arg := args[i]
	prefix := "--" + name + "="
	if value, found := strings.CutPrefix(arg, prefix); found {
		return value, 0, true
	}
	if arg == "--"+name && i+1 < len(args) {
		return args[i+1], 1, true
	}
	return "", 0, false
}

// isPassthroughFlag returns true for flags that should be passed to remaining args.
func isPassthroughFlag(arg string) bool {
	return arg == "-h" || arg == flagHelp || arg == "-V" || arg == "--version"
}

// ParseGlobalFlags parses global flags from os.Args and returns remaining args.
func ParseGlobalFlags() (config.Flags, []string, error) {
	var flags config.Flags
	args := os.Args[1:]
	var remaining []string
	verboseCount := 0

	for i := 0; i < len(args); i++ {
		arg := args[i]

		// Try verbose flags first
		if newCount, ok := parseVerboseFlag(arg, verboseCount); ok {
			verboseCount = newCount
			continue
		}

		// Try string flags
		if val, skip, ok := parseStringFlag(args, i, "home"); ok {
			flags.Home = val
			i += skip
			continue
		}
		if val, skip, ok := parseStringFlag(args, i, "socket-dir"); ok {
			flags.SocketDir = val
			i += skip
			continue
		}

		// Passthrough flags (help, version)
		if isPassthroughFlag(arg) {
			remaining = append(remaining, arg)
			continue
		}

		// Unknown short flag - pass through
		if strings.HasPrefix(arg, "-") {
			remaining = append(remaining, arg)
			continue
		}

		// Non-flag arg: end of global flags, preserve rest
		remaining = append(remaining, args[i:]...)
		break
	}

	flags.Verbose = verboseCount
	return flags, remaining, nil
}

// Main is the entry point for studioctl.
func Main() int {
	flags, args, err := ParseGlobalFlags()
	if err != nil {
		fmt.Fprintf(os.Stderr, "error parsing flags: %v\n", err)
		return 1
	}

	cfg, err := config.New(flags, version)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error initializing config: %v\n", err)
		return 1
	}

	// Create context that cancels on interrupt (Ctrl+C) or termination signal
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	cli := NewCLI(cfg)
	return cli.Run(ctx, args)
}
