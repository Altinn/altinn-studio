package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"

	"altinn.studio/devenv/pkg/container"
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	envlocaltest "altinn.studio/studioctl/internal/cmd/env/localtest"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

const runtimeLocaltest = "localtest"

// EnvCommand implements the 'env' subcommand.
type EnvCommand struct {
	cfg *config.Config
	out *ui.Output
}

type envUpOutput struct {
	Runtime        string `json:"runtime"`
	Running        bool   `json:"running"`
	Started        bool   `json:"started"`
	AlreadyRunning bool   `json:"alreadyRunning"`
	JSONOutput     bool   `json:"-"`
}

func (o envUpOutput) Print(out *ui.Output) error {
	if o.JSONOutput {
		return printJSONOutput(out, "env up", o)
	}
	if o.AlreadyRunning {
		out.Printlnf("%s already running.", o.Runtime)
	}
	return nil
}

type envDownOutput struct {
	Runtime        string `json:"runtime"`
	Stopped        bool   `json:"stopped"`
	AlreadyStopped bool   `json:"alreadyStopped"`
	JSONOutput     bool   `json:"-"`
}

func (o envDownOutput) Print(out *ui.Output) error {
	if o.JSONOutput {
		return printJSONOutput(out, "env down", o)
	}
	if o.AlreadyStopped {
		out.Printlnf("%s is already stopped.", o.Runtime)
	}
	return nil
}

type envStatusOutput struct {
	Status     *envlocaltest.Status `json:"-"`
	Runtime    string               `json:"-"`
	JSONOutput bool                 `json:"-"`
}

func (o envStatusOutput) Print(out *ui.Output) error {
	if o.JSONOutput {
		return printJSONOutput(out, "env status", o.Status)
	}
	if !o.Status.AnyRunning {
		out.Printlnf("%s is not running.", o.Runtime)
		return nil
	}
	if !o.Status.Running {
		out.Printlnf("%s is running with issues.", o.Runtime)
		out.Println("")
		renderLocaltestStatus(out, o.Status)
		return nil
	}
	out.Printlnf("%s is running.", o.Runtime)
	out.Println("")
	renderLocaltestStatus(out, o.Status)
	return nil
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
	return joinLines(
		fmt.Sprintf("Usage: %s env <subcommand> [options]", osutil.CurrentBin()),
		"",
		"Manage development environments.",
		"",
		"Subcommands:",
		"  up       Start the environment",
		"  down     Stop the environment",
		"  status   Show environment status",
		"  logs     Stream environment logs",
		"",
		"Common options:",
		"  -r, --runtime    Runtime to use (default: localtest)",
		"",
		"Options for 'env up':",
		"  -d, --detach     Run in background (default: true)",
		"  --monitoring     Start monitoring stack",
		"  --open           Open localtest in browser after starting",
		"",
		fmt.Sprintf("Run '%s env <subcommand> --help' for more information.", osutil.CurrentBin()),
	)
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
) (envtypes.Env, error) {
	return c.getEnvWithOutput(runtime, client, c.out)
}

//nolint:ireturn // factory helper returns interface by design
func (c *EnvCommand) getEnvWithOutput(
	runtime string,
	client container.ContainerClient,
	out *ui.Output,
) (envtypes.Env, error) {
	switch runtime {
	case runtimeLocaltest:
		return envlocaltest.NewEnv(c.cfg, out, client), nil
	default:
		return nil, fmt.Errorf("%w: %s", ErrUnsupportedRuntime, runtime)
	}
}

func (c *EnvCommand) withContainerClient(
	ctx context.Context,
	run func(client container.ContainerClient) error,
) error {
	client, err := container.Detect(ctx)
	if err != nil {
		return fmt.Errorf("connect to container runtime: %w", err)
	}
	defer func() {
		if cerr := client.Close(); cerr != nil {
			c.out.Verbosef("failed to close container client: %v", cerr)
		}
	}()

	return run(client)
}

// envUpFlags holds parsed flags for the env up command.
type envUpFlags struct {
	runtime     string
	detach      bool
	monitoring  bool
	openBrowser bool
	jsonOutput  bool
}

func (c *EnvCommand) parseUpFlags(args []string) (envUpFlags, bool, error) {
	fs := flag.NewFlagSet("env up", flag.ContinueOnError)
	var f envUpFlags
	fs.StringVar(&f.runtime, "r", runtimeLocaltest, "Runtime to use")
	fs.StringVar(&f.runtime, "runtime", runtimeLocaltest, "Runtime to use")
	fs.BoolVar(&f.detach, "d", true, "Run in background")
	fs.BoolVar(&f.detach, "detach", true, "Run in background")
	fs.BoolVar(&f.monitoring, "monitoring", false, "Start monitoring stack")
	fs.BoolVar(&f.openBrowser, "open", false, "Open localtest in browser after starting")
	fs.BoolVar(&f.jsonOutput, "json", false, "Output as JSON")

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
	if flags.jsonOutput && !flags.detach {
		return fmt.Errorf("%w: --json requires --detach=true", ErrInvalidFlagValue)
	}

	return c.withContainerClient(ctx, func(client container.ContainerClient) error {
		switch flags.runtime {
		case runtimeLocaltest:
			return c.runLocaltestUp(ctx, client, flags)
		default:
			return fmt.Errorf("%w: %s", ErrUnsupportedRuntime, flags.runtime)
		}
	})
}

func (c *EnvCommand) runLocaltestUp(
	ctx context.Context,
	client container.ContainerClient,
	flags envUpFlags,
) error {
	env := envlocaltest.NewEnv(c.cfg, commandOutput(c.out, flags.jsonOutput), client)

	preflightErr := env.Preflight(ctx)
	if preflightErr != nil {
		return fmt.Errorf("preflight check: %w", preflightErr)
	}

	status, err := env.Status(ctx)
	if err != nil {
		return fmt.Errorf("get status: %w", err)
	}
	if status.Running {
		return envUpOutput{
			Runtime:        runtimeLocaltest,
			Running:        true,
			Started:        false,
			AlreadyRunning: true,
			JSONOutput:     flags.jsonOutput,
		}.Print(c.out)
	}

	if err := env.Up(ctx, envtypes.UpOptions{
		Detach:      flags.detach,
		Monitoring:  flags.monitoring,
		OpenBrowser: flags.openBrowser,
	}); err != nil {
		return fmt.Errorf("env up: %w", err)
	}
	return envUpOutput{
		Runtime:        runtimeLocaltest,
		Running:        true,
		Started:        true,
		AlreadyRunning: false,
		JSONOutput:     flags.jsonOutput,
	}.Print(c.out)
}

// envDownFlags holds parsed flags for the env down command.
type envDownFlags struct {
	runtime    string
	jsonOutput bool
}

func (c *EnvCommand) parseDownFlags(args []string) (envDownFlags, bool, error) {
	fs := flag.NewFlagSet("env down", flag.ContinueOnError)
	var f envDownFlags
	fs.StringVar(&f.runtime, "r", runtimeLocaltest, "Runtime to use")
	fs.StringVar(&f.runtime, "runtime", runtimeLocaltest, "Runtime to use")
	fs.BoolVar(&f.jsonOutput, "json", false, "Output as JSON")

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

	return c.withContainerClient(ctx, func(client container.ContainerClient) error {
		env, err := c.getEnvWithOutput(flags.runtime, client, commandOutput(c.out, flags.jsonOutput))
		if err != nil {
			return err
		}
		if err := env.Down(ctx); err != nil {
			if errors.Is(err, envtypes.ErrAlreadyStopped) {
				return envDownOutput{
					Runtime:        flags.runtime,
					Stopped:        false,
					AlreadyStopped: true,
					JSONOutput:     flags.jsonOutput,
				}.Print(c.out)
			}
			return fmt.Errorf("env down: %w", err)
		}
		return envDownOutput{
			Runtime:        flags.runtime,
			Stopped:        true,
			AlreadyStopped: false,
			JSONOutput:     flags.jsonOutput,
		}.Print(c.out)
	})
}

// envStatusFlags holds parsed flags for the env status command.
type envStatusFlags struct {
	runtime    string
	jsonOutput bool
}

func (c *EnvCommand) parseStatusFlags(args []string) (envStatusFlags, bool, error) {
	fs := flag.NewFlagSet("env status", flag.ContinueOnError)
	var f envStatusFlags
	fs.StringVar(&f.runtime, "r", runtimeLocaltest, "Runtime to use")
	fs.StringVar(&f.runtime, "runtime", runtimeLocaltest, "Runtime to use")
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

	return c.withContainerClient(ctx, func(client container.ContainerClient) error {
		switch flags.runtime {
		case runtimeLocaltest:
			return c.runLocaltestStatus(ctx, client, flags.jsonOutput)
		default:
			return fmt.Errorf("%w: %s", ErrUnsupportedRuntime, flags.runtime)
		}
	})
}

func (c *EnvCommand) runLocaltestStatus(
	ctx context.Context,
	client container.ContainerClient,
	jsonOutput bool,
) error {
	env := envlocaltest.NewEnv(c.cfg, c.out, client)
	status, err := env.Status(ctx)
	if err != nil {
		return fmt.Errorf("get status: %w", err)
	}

	return envStatusOutput{
		Runtime:    runtimeLocaltest,
		Status:     status,
		JSONOutput: jsonOutput,
	}.Print(c.out)
}

func renderLocaltestStatus(out *ui.Output, status *envlocaltest.Status) {
	rows := make([][]string, 1, len(status.Containers)+1)
	rows[0] = []string{"Container", "Status"}

	for _, ctr := range status.Containers {
		rows = append(rows, []string{ctr.Name, ctr.Status})
	}
	out.Table(rows)
}

// envLogsFlags holds parsed flags for the env logs command.
type envLogsFlags struct {
	runtime    string
	component  string
	follow     bool
	jsonOutput bool
}

func (c *EnvCommand) parseLogsFlags(args []string) (envLogsFlags, bool, error) {
	fs := flag.NewFlagSet("env logs", flag.ContinueOnError)
	var f envLogsFlags
	fs.StringVar(&f.runtime, "r", runtimeLocaltest, "Runtime to use")
	fs.StringVar(&f.runtime, "runtime", runtimeLocaltest, "Runtime to use")
	fs.StringVar(&f.component, "c", "", "Filter by component")
	fs.StringVar(&f.component, "component", "", "Filter by component")
	fs.BoolVar(&f.follow, "f", true, "Follow log output")
	fs.BoolVar(&f.follow, "follow", true, "Follow log output")
	fs.BoolVar(&f.jsonOutput, "json", false, "Output as newline-delimited JSON")

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

	return c.withContainerClient(ctx, func(client container.ContainerClient) error {
		env, err := c.getEnv(flags.runtime, client)
		if err != nil {
			return err
		}

		if err := env.Logs(ctx, envtypes.LogsOptions{
			Component: flags.component,
			Follow:    flags.follow,
			JSON:      flags.jsonOutput,
		}); err != nil {
			return fmt.Errorf("env logs: %w", err)
		}
		return nil
	})
}

func silentOutput() *ui.Output {
	return ui.NewOutput(io.Discard, io.Discard, false)
}

func commandOutput(out *ui.Output, jsonOutput bool) *ui.Output {
	if jsonOutput {
		return silentOutput()
	}
	return out
}
