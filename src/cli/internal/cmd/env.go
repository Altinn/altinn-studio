package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/interfaces"
	"altinn.studio/studioctl/internal/localtest"
	"altinn.studio/studioctl/internal/ui"
)

// EnvCommand implements the 'env' subcommand.
type EnvCommand struct {
	cfg *config.Config
	out *ui.Output
}

// NewEnvCommand creates a new env command.
func NewEnvCommand(cfg *config.Config, out *ui.Output) *EnvCommand {
	return &EnvCommand{cfg: cfg, out: out}
}

// Name returns the command name.
func (c *EnvCommand) Name() string { return "env" }

// Synopsis returns a short description.
func (c *EnvCommand) Synopsis() string { return "Manage development environment" }

// Usage returns the full help text.
func (c *EnvCommand) Usage() string {
	return `Usage: studioctl env <subcommand> [options]

Manage development environments.

Subcommands:
  up       Start the environment
  down     Stop the environment
  status   Show environment status
  logs     Stream environment logs

Common options:
  -r, --runtime    Runtime to use (default: localtest)

Options for 'env up':
  -p, --port       Loadbalancer port (default: 8000)
  -d, --detach     Run in background (default: true)
  --monitoring     Start monitoring stack
  --open           Open localtest in browser after starting

Run 'studioctl env <subcommand> --help' for more information.
`
}

// Run executes the command.
func (c *EnvCommand) Run(ctx context.Context, args []string) error {
	if len(args) == 0 {
		c.out.Print(c.Usage())
		return nil
	}

	subCmd := args[0]
	subArgs := args[1:]

	switch subCmd {
	case "up":
		return c.runUp(ctx, subArgs)
	case "down":
		return c.runDown(ctx, subArgs)
	case "status":
		return c.runStatus(ctx, subArgs)
	case "logs":
		return c.runLogs(ctx, subArgs)
	case "-h", flagHelp, helpSubcmd:
		c.out.Print(c.Usage())
		return nil
	default:
		return fmt.Errorf("%w: %s", ErrUnknownSubcommand, subCmd)
	}
}

// getEnv returns the environment implementation for the given runtime.
//
//nolint:ireturn // factory function returns interface by design
func (c *EnvCommand) getEnv(
	runtime string,
	client container.ContainerClient,
) (interfaces.Env, error) {
	switch runtime {
	case "localtest":
		return localtest.NewEnv(c.cfg, c.out, client), nil
	default:
		return nil, fmt.Errorf("%w: %s", ErrUnsupportedRuntime, runtime)
	}
}

// envUpFlags holds parsed flags for the env up command.
type envUpFlags struct {
	runtime     string
	port        int
	detach      bool
	monitoring  bool
	openBrowser bool
}

func (c *EnvCommand) parseUpFlags(args []string) (envUpFlags, bool, error) {
	fs := flag.NewFlagSet("env up", flag.ContinueOnError)
	f := envUpFlags{
		runtime:     "localtest",
		detach:      true,
		monitoring:  false,
		port:        0,
		openBrowser: false,
	}
	fs.StringVar(&f.runtime, "r", "localtest", "Runtime to use")
	fs.StringVar(&f.runtime, "runtime", "localtest", "Runtime to use")
	fs.BoolVar(&f.detach, "d", true, "Run in background")
	fs.BoolVar(&f.detach, "detach", true, "Run in background")
	fs.BoolVar(&f.monitoring, "monitoring", false, "Start monitoring stack")
	fs.IntVar(&f.port, "p", 0, "Loadbalancer port (default: 8000)")
	fs.IntVar(&f.port, "port", 0, "Loadbalancer port (default: 8000)")
	fs.BoolVar(&f.openBrowser, "open", false, "Open localtest in browser after starting")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return f, true, nil // help was shown
		}
		return f, false, fmt.Errorf("parsing flags: %w", err)
	}

	return f, false, nil
}

func (c *EnvCommand) runUp(ctx context.Context, args []string) error {
	flags, helpShown, err := c.parseUpFlags(args)
	if err != nil {
		return err
	}
	if helpShown {
		return nil
	}

	client, err := container.Detect(ctx)
	if err != nil {
		return fmt.Errorf("connect to container runtime: %w", err)
	}
	defer func() {
		if cerr := client.Close(); cerr != nil {
			c.out.Debugf("failed to close container client: %v", cerr)
		}
	}()

	if legacyErr := localtest.CheckForLegacyLocaltest(ctx, client); legacyErr != nil {
		return fmt.Errorf("preflight check: %w", legacyErr)
	}

	status, err := localtest.GetStatus(ctx, client)
	if err != nil {
		return fmt.Errorf("get status: %w", err)
	}
	if status.Running {
		c.out.Println("Localtest already running.")
		return nil
	}

	env, err := c.getEnv(flags.runtime, client)
	if err != nil {
		return err
	}

	if err := env.Up(ctx, interfaces.EnvUpOptions{
		Port:        flags.port,
		Detach:      flags.detach,
		Monitoring:  flags.monitoring,
		OpenBrowser: flags.openBrowser,
	}); err != nil {
		return fmt.Errorf("env up: %w", err)
	}
	return nil
}

// envDownFlags holds parsed flags for the env down command.
type envDownFlags struct {
	runtime string
}

func (c *EnvCommand) parseDownFlags(args []string) (envDownFlags, bool, error) {
	fs := flag.NewFlagSet("env down", flag.ContinueOnError)
	f := envDownFlags{
		runtime: "localtest",
	}
	fs.StringVar(&f.runtime, "r", "localtest", "Runtime to use")
	fs.StringVar(&f.runtime, "runtime", "localtest", "Runtime to use")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return f, true, nil
		}
		return f, false, fmt.Errorf("parsing flags: %w", err)
	}

	return f, false, nil
}

func (c *EnvCommand) runDown(ctx context.Context, args []string) error {
	flags, helpShown, err := c.parseDownFlags(args)
	if err != nil {
		return err
	}
	if helpShown {
		return nil
	}

	client, err := container.Detect(ctx)
	if err != nil {
		return fmt.Errorf("connect to container runtime: %w", err)
	}
	defer func() {
		if cerr := client.Close(); cerr != nil {
			c.out.Debugf("failed to close container client: %v", cerr)
		}
	}()

	status, err := localtest.GetStatus(ctx, client)
	if err != nil {
		return fmt.Errorf("get status: %w", err)
	}
	if !status.Running {
		c.out.Println("Localtest not running.")
		return nil
	}

	env, err := c.getEnv(flags.runtime, client)
	if err != nil {
		return err
	}

	if err := env.Down(ctx); err != nil {
		return fmt.Errorf("env down: %w", err)
	}
	return nil
}

// envStatusFlags holds parsed flags for the env status command.
type envStatusFlags struct {
	runtime    string
	jsonOutput bool
}

func (c *EnvCommand) parseStatusFlags(args []string) (envStatusFlags, bool, error) {
	fs := flag.NewFlagSet("env status", flag.ContinueOnError)
	f := envStatusFlags{
		runtime:    "localtest",
		jsonOutput: false,
	}
	fs.StringVar(&f.runtime, "r", "localtest", "Runtime to use")
	fs.StringVar(&f.runtime, "runtime", "localtest", "Runtime to use")
	fs.BoolVar(&f.jsonOutput, "json", false, "Output as JSON")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return f, true, nil
		}
		return f, false, fmt.Errorf("parsing flags: %w", err)
	}

	return f, false, nil
}

func (c *EnvCommand) runStatus(ctx context.Context, args []string) error {
	flags, helpShown, err := c.parseStatusFlags(args)
	if err != nil {
		return err
	}
	if helpShown {
		return nil
	}

	client, err := container.Detect(ctx)
	if err != nil {
		return fmt.Errorf("connect to container runtime: %w", err)
	}
	defer func() {
		if cerr := client.Close(); cerr != nil {
			c.out.Debugf("failed to close container client: %v", cerr)
		}
	}()

	env, err := c.getEnv(flags.runtime, client)
	if err != nil {
		return err
	}

	status, err := env.Status(ctx)
	if err != nil {
		return fmt.Errorf("get status: %w", err)
	}

	if !status.Running {
		c.out.Printf("%s is not running.\n", flags.runtime)
		return nil
	}

	c.out.Printf("%s is running.\n", flags.runtime)
	c.out.Println("")

	rows := [][]string{
		{"Container", "Status", "Ports"},
	}
	for _, ctr := range status.Containers {
		ports := "-"
		if len(ctr.Ports) > 0 {
			ports = ctr.Ports[0]
		}
		rows = append(rows, []string{ctr.Name, ctr.Status, ports})
	}
	c.out.Table(rows)

	return nil
}

// envLogsFlags holds parsed flags for the env logs command.
type envLogsFlags struct {
	runtime   string
	component string
	follow    bool
}

func (c *EnvCommand) parseLogsFlags(args []string) (envLogsFlags, bool, error) {
	fs := flag.NewFlagSet("env logs", flag.ContinueOnError)
	f := envLogsFlags{
		runtime:   "localtest",
		component: "",
		follow:    true,
	}
	fs.StringVar(&f.runtime, "r", "localtest", "Runtime to use")
	fs.StringVar(&f.runtime, "runtime", "localtest", "Runtime to use")
	fs.StringVar(&f.component, "c", "", "Filter by component")
	fs.StringVar(&f.component, "component", "", "Filter by component")
	fs.BoolVar(&f.follow, "f", true, "Follow log output")
	fs.BoolVar(&f.follow, "follow", true, "Follow log output")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return f, true, nil
		}
		return f, false, fmt.Errorf("parsing flags: %w", err)
	}

	return f, false, nil
}

func (c *EnvCommand) runLogs(ctx context.Context, args []string) error {
	flags, helpShown, err := c.parseLogsFlags(args)
	if err != nil {
		return err
	}
	if helpShown {
		return nil
	}

	client, err := container.Detect(ctx)
	if err != nil {
		return fmt.Errorf("connect to container runtime: %w", err)
	}
	defer func() {
		if cerr := client.Close(); cerr != nil {
			c.out.Debugf("failed to close container client: %v", cerr)
		}
	}()

	env, err := c.getEnv(flags.runtime, client)
	if err != nil {
		return err
	}

	if err := env.Logs(ctx, interfaces.EnvLogsOptions{
		Component: flags.component,
		Follow:    flags.follow,
	}); err != nil {
		return fmt.Errorf("env logs: %w", err)
	}
	return nil
}
