package cmd

import (
	"cmp"
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"strings"

	"altinn.studio/devenv/pkg/container"
	envtypes "altinn.studio/studioctl/internal/cmd/env"
	envlocaltest "altinn.studio/studioctl/internal/cmd/env/localtest"
	envregistry "altinn.studio/studioctl/internal/cmd/env/registry"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

const envStatusSubcommand = authStatusSubcommand

var (
	errNoHostsFileTarget = errors.New("no hosts file target available")
	errResetUnsupported  = errors.New("reset is not supported for runtime")
)

// undefinedFlagPrefix starts the error flag.FlagSet.Parse returns for a flag the set does not define. The flag package
// does not export that error, so its text is matched. TestUndefinedFlagErrorText fails if the text changes.
const undefinedFlagPrefix = "flag provided but not defined: -"

// EnvCommand implements the 'env' subcommand.
type EnvCommand struct {
	hostsFileTargets func() ([]osutil.HostsTarget, error)
	// containerClient connects to the container runtime.
	containerClient func(ctx context.Context) (container.ContainerClient, error)
	// newRuntimes lists the runtimes for one command, the default first. When nil, the registry's are used.
	newRuntimes func(cfg *config.Config) []envtypes.Runtime
	cfg         *config.Config
	out         *ui.Output
}

type envUpOutput struct {
	Runtime string `json:"runtime"`
	// Warnings are what the environment warned about on stderr, such as an unusable STUDIO_CA_BUNDLE.
	Warnings       []string `json:"warnings,omitempty"`
	Running        bool     `json:"running"`
	Started        bool     `json:"started"`
	AlreadyRunning bool     `json:"alreadyRunning"`
	JSONOutput     bool     `json:"-"`
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
	Status     *envtypes.Status `json:"-"`
	Runtime    string           `json:"-"`
	JSONOutput bool             `json:"-"`
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
		renderEnvStatus(out, o.Status)
		return nil
	}
	out.Printlnf("%s is running.", o.Runtime)
	out.Println("")
	renderEnvStatus(out, o.Status)
	return nil
}

type envResetOutput struct {
	Runtime    string `json:"runtime"`
	Reset      bool   `json:"reset"`
	JSONOutput bool   `json:"-"`
}

type envHostsFlags struct {
	runtime    string
	jsonOutput bool
}

type envHostsStatusHostOutput struct {
	Detail string `json:"detail,omitempty"`
	Host   string `json:"host"`
	State  string `json:"state"`
}

type envHostsStatusOutput struct {
	Path     string                     `json:"path,omitempty"`
	Runtime  string                     `json:"runtime"`
	Hosts    []envHostsStatusHostOutput `json:"hosts"`
	Warnings []string                   `json:"warnings,omitempty"`
}

type envHostsMutationTargetOutput struct {
	Error  string                        `json:"error,omitempty"`
	Label  string                        `json:"label"`
	Path   string                        `json:"path"`
	Result envlocaltest.HostsWriteResult `json:"result"`
}

type envHostsMutationOutput struct {
	Runtime  string                         `json:"runtime"`
	Targets  []envHostsMutationTargetOutput `json:"targets"`
	Warnings []string                       `json:"warnings,omitempty"`
}

func (o envResetOutput) Print(out *ui.Output) error {
	if o.JSONOutput {
		return printJSONOutput(out, "env reset", o)
	}
	return nil
}

// NewEnvCommand creates a new env command.
func NewEnvCommand(cfg *config.Config, out *ui.Output) *EnvCommand {
	return &EnvCommand{
		hostsFileTargets: osutil.LocalHostsFileTargets,
		containerClient:  container.Detect,
		newRuntimes:      envregistry.Runtimes,
		cfg:              cfg,
		out:              out,
	}
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
		"  hosts    Manage localtest hosts-file entries",
		"  reset    Delete persisted environment data",
		"  status   Show environment status",
		"  logs     Stream environment logs",
		"",
		"Common options:",
		c.runtimeUsage(),
		"",
		"Options for 'env up':",
		"  -d, --detach     Run in background (default: true)",
		"  --open           Open the environment in the browser after starting",
		c.runtimeUpUsage(),
		"",
		"Options for 'env reset':",
		"  -y, --yes        Skip confirmation prompt",
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
	case "hosts":
		return c.runHosts(subArgs)
	case "reset":
		return c.runReset(ctx, subArgs)
	case envStatusSubcommand:
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

// runtimeUsage is the -r help line, naming every runtime.
func (c *EnvCommand) runtimeUsage() string {
	return fmt.Sprintf(
		"  -r, --runtime    Runtime: %s (default: the one running, else %s)",
		strings.Join(c.runtimeNames(), " or "), c.defaultRuntime(),
	)
}

// hostsRuntimeUsage is the -r help line of the hosts commands, which do not ask which runtime runs: every runtime
// shares the hostnames, and -r only names the output.
func (c *EnvCommand) hostsRuntimeUsage() string {
	return fmt.Sprintf(
		"  -r, --runtime    Runtime: %s (default: %s)",
		strings.Join(c.runtimeNames(), " or "), c.defaultRuntime(),
	)
}

// runtimeUpUsage is the help of every runtime's own env up flags, a section each.
func (c *EnvCommand) runtimeUpUsage() string {
	var lines []string
	for _, runtime := range c.runtimes() {
		lines = append(lines, "", fmt.Sprintf("Options for the %s runtime:", runtime.Name()))
		lines = append(lines, runtime.UpUsage()...)
	}
	return strings.Join(lines, osutil.LineBreak)
}

// runtimes are the runtimes for one command, the default first.
func (c *EnvCommand) runtimes() []envtypes.Runtime {
	return c.newRuntimes(c.cfg)
}

func (c *EnvCommand) runtimeNames() []string {
	runtimes := c.runtimes()
	names := make([]string, 0, len(runtimes))
	for _, runtime := range runtimes {
		names = append(names, runtime.Name())
	}
	return names
}

// defaultRuntime is the runtime an env command acts on when none is named and none is running.
func (c *EnvCommand) defaultRuntime() string {
	return c.runtimes()[0].Name()
}

// runtime looks a runtime up by name.
//
//nolint:ireturn // runtimes are handed out by interface
func (c *EnvCommand) runtime(name string) (envtypes.Runtime, error) {
	for _, runtime := range c.runtimes() {
		if runtime.Name() == name {
			return runtime, nil
		}
	}
	return nil, fmt.Errorf(
		"%w: %s (one of %s)", ErrUnsupportedRuntime, name, strings.Join(c.runtimeNames(), ", "),
	)
}

// containerConnection is one command's connection to the container runtime, made once and used by every step of the
// command. A failed connection is kept rather than returned at once, so that the command can still name its runtime
// and reject its arguments before it needs the container runtime.
type containerConnection struct {
	client container.ContainerClient
	err    error
}

// connectContainerRuntime connects to the container runtime for one command. The caller closes the connection.
func (c *EnvCommand) connectContainerRuntime(ctx context.Context) containerConnection {
	client, err := c.containerClient(ctx)
	if err != nil {
		c.out.Verbosef("connect to container runtime: %v", err)
		return containerConnection{client: nil, err: fmt.Errorf("connect to container runtime: %w", err)}
	}
	return containerConnection{client: client, err: nil}
}

// closeContainerRuntime closes a connection made by connectContainerRuntime.
func (c *EnvCommand) closeContainerRuntime(conn containerConnection) {
	if conn.client == nil {
		return
	}
	if err := conn.client.Close(); err != nil {
		c.out.Verbosef("failed to close container client: %v", err)
	}
}

// resolveRuntime fills an omitted -r: only one runtime runs at a time, so the commands act on the one that is running,
// and on the default runtime when none is, or when there is no container runtime to ask (client is nil).
func (c *EnvCommand) resolveRuntime(
	ctx context.Context,
	client container.ContainerClient,
	requested string,
) (string, error) {
	if requested != "" {
		return requested, nil
	}
	if client == nil {
		return c.defaultRuntime(), nil
	}
	runtime, err := envtypes.ResolveRuntime(ctx, c.defaultRuntime(), c.envs(client))
	if err != nil {
		return "", fmt.Errorf("resolve runtime: %w", err)
	}
	return runtime, nil
}

// envTarget is what an env command acts on: the runtime's environment on the command's container connection.
type envTarget struct {
	env     envtypes.Env
	conn    containerConnection
	runtime string
}

// target connects to the container runtime and returns the environment of the requested runtime, else of the one
// running. It refuses an unknown runtime before it reports a failed connection, and the caller closes the connection
// whether or not it returns an error.
func (c *EnvCommand) target(ctx context.Context, requested string, out *ui.Output) (envTarget, error) {
	target := envTarget{env: nil, conn: c.connectContainerRuntime(ctx), runtime: ""}
	name, err := c.resolveRuntime(ctx, target.conn.client, requested)
	if err != nil {
		return target, err
	}
	if target.env, err = c.env(name, target.conn.client, out); err != nil {
		return target, err
	}
	target.runtime = name
	return target, nil
}

// resolvedHostsFlags parses hosts flags and fills an omitted runtime with the default one. The runtime only names the
// output, as every runtime shares the hostnames, so the container runtime is not asked which one runs.
func (c *EnvCommand) resolvedHostsFlags(name string, args []string) (envHostsFlags, bool, error) {
	flags, helpShown, err := parseEnvHostsFlags(name, args)
	if err != nil || helpShown {
		return flags, helpShown, err
	}
	flags.runtime = cmp.Or(flags.runtime, c.defaultRuntime())
	if _, err := c.runtime(flags.runtime); err != nil {
		return flags, false, err
	}
	return flags, false, nil
}

// envs are every runtime's environment, for the questions asked across them: which one is running.
func (c *EnvCommand) envs(client container.ContainerClient) []envtypes.Env {
	runtimes := c.runtimes()
	envs := make([]envtypes.Env, 0, len(runtimes))
	for _, runtime := range runtimes {
		envs = append(envs, runtime.Env(client, c.out))
	}
	return envs
}

// env returns the named runtime's environment, with the runtime's default flags. client is nil when there is no
// container runtime. Such an environment is only inspected, not used.
//
//nolint:ireturn // environments are handed out by interface
func (c *EnvCommand) env(name string, client container.ContainerClient, out *ui.Output) (envtypes.Env, error) {
	runtime, err := c.runtime(name)
	if err != nil {
		return nil, err
	}
	return runtime.Env(client, out), nil
}

// envUpFlags holds parsed flags for the env up command: the shared ones, and the runtime whose own flags were bound.
type envUpFlags struct {
	runtime envtypes.Runtime
	// runtimeFlag is the parsed -r value, which must name the runtime whose flags were bound.
	runtimeFlag string
	// runtimeResolved is set when -r was omitted and the runtime was resolved from the running containers, which
	// already found that no other runtime runs.
	runtimeResolved bool
	detach          bool
	openBrowser     bool
	jsonOutput      bool
}

func (c *EnvCommand) upUsage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s env up [options]", osutil.CurrentBin()),
		"",
		"Start a local environment.",
		"",
		"Options:",
		c.runtimeUsage(),
		"  -d, --detach     Run in background (default: true)",
		"  --open           Open the environment in the browser after starting",
		"  --json           Output as JSON",
		c.runtimeUpUsage(),
	)
}

// sharedUpFlags is the env up flag set with the flags every runtime takes.
func sharedUpFlags(f *envUpFlags) *flag.FlagSet {
	fs := flag.NewFlagSet("env up", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	fs.StringVar(&f.runtimeFlag, "r", "", "Runtime to use")
	fs.StringVar(&f.runtimeFlag, "runtime", "", "Runtime to use")
	fs.BoolVar(&f.detach, "d", true, "Run in background")
	fs.BoolVar(&f.detach, "detach", true, "Run in background")
	fs.BoolVar(&f.openBrowser, "open", false, "Open the environment in the browser after starting")
	fs.BoolVar(&f.jsonOutput, "json", false, "Output as JSON")
	return fs
}

// parseUpFlags parses env up's arguments in two steps: -r names the runtime, which then adds its own flags to the
// shared ones. Two runtimes may therefore have a flag of the same name, each with its own meaning. Without -r, client
// is asked which runtime runs. A nil client means there is no container runtime to ask.
func (c *EnvCommand) parseUpFlags(
	ctx context.Context,
	client container.ContainerClient,
	args []string,
) (envUpFlags, error) {
	var f envUpFlags
	requested, err := runtimeArg(args)
	if err != nil {
		return f, err
	}
	name, err := c.resolveRuntime(ctx, client, requested)
	if err != nil {
		return f, err
	}
	if f.runtime, err = c.runtime(name); err != nil {
		return f, err
	}
	fs := sharedUpFlags(&f)
	f.runtime.BindUpFlags(fs)
	if err := fs.Parse(args); err != nil {
		return f, c.upFlagError(f.runtime, err)
	}
	// The flag package stops at the first argument that is not a flag, where runtimeArg reads on.
	if fs.NArg() > 0 {
		return f, fmt.Errorf("%w: env up takes no arguments, got %q", ErrInvalidFlagValue, fs.Arg(0))
	}
	// runtimeArg reads -r without the flag package. Refuse a reading the parse does not share.
	if f.runtimeFlag != requested {
		return f, conflictingRuntimesError(requested, f.runtimeFlag)
	}
	// Only a resolution that asked the container runtime found that no other runtime runs.
	f.runtimeResolved = requested == "" && client != nil
	return f, nil
}

// upFlagError names the runtime a flag belongs to when the chosen runtime does not have it, rather than only saying
// that the flag is not defined: `env up --with dialogporten` while localtest is the runtime in use, say.
func (c *EnvCommand) upFlagError(chosen envtypes.Runtime, err error) error {
	name, undefined := strings.CutPrefix(err.Error(), undefinedFlagPrefix)
	if !undefined {
		return fmt.Errorf("parsing flags: %w", err)
	}
	var owners []string
	for _, runtime := range c.runtimes() {
		if runtime.Name() == chosen.Name() {
			continue
		}
		fs := flag.NewFlagSet(runtime.Name(), flag.ContinueOnError)
		runtime.BindUpFlags(fs)
		if fs.Lookup(name) != nil {
			owners = append(owners, runtime.Name())
		}
	}
	if len(owners) == 0 {
		return fmt.Errorf("parsing flags: %w", err)
	}
	return fmt.Errorf(
		"%w: --%s is not supported by the %s runtime (it is %s's); pick the runtime with -r",
		ErrInvalidFlagValue, name, chosen.Name(), strings.Join(owners, " and "),
	)
}

// helpRequested reports whether args ask for help.
func helpRequested(args []string) bool {
	for _, arg := range args {
		if arg == "--" {
			return false
		}
		switch arg {
		case "-h", "--h", "-help", flagHelp:
			return true
		}
	}
	return false
}

// runtimeArg is the value of -r or --runtime in args, empty when there is none. It refuses two different values: the
// flag package would keep the last, after the first had picked the runtime flags to bind.
func runtimeArg(args []string) (string, error) {
	var runtime string
	for i, arg := range args {
		if arg == "--" {
			break
		}
		name, value, hasValue := strings.Cut(strings.TrimLeft(arg, "-"), "=")
		if !strings.HasPrefix(arg, "-") || (name != "r" && name != "runtime") {
			continue
		}
		if !hasValue {
			if i+1 >= len(args) {
				break
			}
			value = args[i+1]
		}
		if runtime != "" && value != runtime {
			return "", conflictingRuntimesError(runtime, value)
		}
		runtime = value
	}
	return runtime, nil
}

// conflictingRuntimesError refuses -r given as two different runtimes.
func conflictingRuntimesError(first, second string) error {
	return fmt.Errorf("%w: -r is given as both %q and %q; give it once", ErrInvalidFlagValue, first, second)
}

func (c *EnvCommand) runUp(ctx context.Context, args []string) error {
	if helpRequested(args) {
		c.out.Print(c.upUsage())
		return nil
	}
	conn := c.connectContainerRuntime(ctx)
	defer c.closeContainerRuntime(conn)

	flags, err := c.parseUpFlags(ctx, conn.client, args)
	if err != nil {
		return err
	}
	if flags.jsonOutput && !flags.detach {
		return fmt.Errorf("%w: --json requires --detach=true", ErrInvalidFlagValue)
	}
	if conn.err != nil {
		return conn.err
	}
	return c.up(ctx, conn.client, flags)
}

// up starts the parsed runtime's environment on client, unless another runtime runs.
func (c *EnvCommand) up(ctx context.Context, client container.ContainerClient, flags envUpFlags) error {
	name := flags.runtime.Name()
	if !flags.runtimeResolved {
		if err := c.ensureNoOtherRuntimeActive(ctx, client, name); err != nil {
			return err
		}
	}
	// With --json, the environment's warnings go to stderr and into the JSON, as env hosts does.
	envOut := c.out
	if flags.jsonOutput {
		envOut = c.out.ForJSON()
	}
	env := flags.runtime.Env(client, envOut)
	result, err := env.Up(ctx, envtypes.UpOptions{Detach: flags.detach, OpenBrowser: flags.openBrowser})
	if err != nil {
		return fmt.Errorf("env up: %w", err)
	}
	return envUpOutput{
		Runtime:        name,
		Warnings:       envOut.Warnings(),
		Running:        true,
		Started:        !result.AlreadyRunning,
		AlreadyRunning: result.AlreadyRunning,
		JSONOutput:     flags.jsonOutput,
	}.Print(c.out)
}

// ensureNoOtherRuntimeActive refuses `env up` while another runtime runs.
func (c *EnvCommand) ensureNoOtherRuntimeActive(
	ctx context.Context,
	client container.ContainerClient,
	runtime string,
) error {
	if err := envtypes.EnsureNoOtherActive(ctx, runtime, c.envs(client)); err != nil {
		return fmt.Errorf("preflight check: %w", err)
	}
	return nil
}

// envDownFlags holds parsed flags for the env down command.
type envDownFlags struct {
	runtime    string
	jsonOutput bool
}

func (c *EnvCommand) parseDownFlags(args []string) (envDownFlags, bool, error) {
	fs := flag.NewFlagSet("env down", flag.ContinueOnError)
	var f envDownFlags
	fs.StringVar(&f.runtime, "r", "", "Runtime to use")
	fs.StringVar(&f.runtime, "runtime", "", "Runtime to use")
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

	target, err := c.target(ctx, flags.runtime, commandOutput(c.out, flags.jsonOutput))
	defer c.closeContainerRuntime(target.conn)
	if err != nil {
		return err
	}
	if target.conn.err != nil {
		return target.conn.err
	}
	if err := target.env.Down(ctx); err != nil {
		if errors.Is(err, envtypes.ErrAlreadyStopped) {
			return envDownOutput{
				Runtime:        target.runtime,
				Stopped:        false,
				AlreadyStopped: true,
				JSONOutput:     flags.jsonOutput,
			}.Print(c.out)
		}
		return fmt.Errorf("env down: %w", err)
	}
	return envDownOutput{
		Runtime:        target.runtime,
		Stopped:        true,
		AlreadyStopped: false,
		JSONOutput:     flags.jsonOutput,
	}.Print(c.out)
}

// envResetFlags holds parsed flags for the env reset command.
type envResetFlags struct {
	runtime    string
	yes        bool
	jsonOutput bool
}

func (c *EnvCommand) parseResetFlags(args []string) (envResetFlags, bool, error) {
	fs := flag.NewFlagSet("env reset", flag.ContinueOnError)
	var f envResetFlags
	fs.StringVar(&f.runtime, "r", "", "Runtime to use")
	fs.StringVar(&f.runtime, "runtime", "", "Runtime to use")
	fs.BoolVar(&f.yes, "y", false, "Skip confirmation prompt")
	fs.BoolVar(&f.yes, "yes", false, "Skip confirmation prompt")
	fs.BoolVar(&f.jsonOutput, "json", false, "Output as JSON")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return f, true, nil
		}
		return f, false, fmt.Errorf("parsing flags: %w", err)
	}

	return f, false, nil
}

func (c *EnvCommand) runReset(ctx context.Context, args []string) error {
	flags, helpShown, err := c.parseResetFlags(args)
	if err != nil {
		return err
	}
	if helpShown {
		return nil
	}
	if flags.jsonOutput && !flags.yes {
		return fmt.Errorf("%w: --json requires --yes", ErrInvalidFlagValue)
	}
	// A named runtime without reset is refused before connecting. An omitted one is known once the containers are.
	if flags.runtime != "" {
		env, envErr := c.env(flags.runtime, nil, silentOutput())
		if envErr != nil {
			return envErr
		}
		if _, ok := env.(envtypes.Resetter); !ok {
			return fmt.Errorf("%w: %s", errResetUnsupported, flags.runtime)
		}
	}

	target, err := c.target(ctx, flags.runtime, commandOutput(c.out, flags.jsonOutput))
	defer c.closeContainerRuntime(target.conn)
	if err != nil {
		return err
	}
	flags.runtime = target.runtime
	resetter, ok := target.env.(envtypes.Resetter)
	if !ok {
		return fmt.Errorf("%w: %s", errResetUnsupported, flags.runtime)
	}
	if target.conn.err != nil {
		return target.conn.err
	}
	if proceed, err := c.confirmResetIfNeeded(ctx, flags); err != nil {
		return err
	} else if !proceed {
		return nil
	}

	if err := resetter.Reset(ctx); err != nil {
		return fmt.Errorf("env reset: %w", err)
	}
	return envResetOutput{
		Runtime:    flags.runtime,
		Reset:      true,
		JSONOutput: flags.jsonOutput,
	}.Print(c.out)
}

func (c *EnvCommand) confirmResetIfNeeded(ctx context.Context, flags envResetFlags) (bool, error) {
	if flags.yes {
		return true, nil
	}

	input, cleanup, err := ui.InteractiveInput()
	if err != nil {
		return false, fmt.Errorf(
			"%w: --yes is required when no terminal input is available",
			ErrInvalidFlagValue,
		)
	}
	defer func() {
		if cleanupErr := cleanup(); cleanupErr != nil {
			c.out.Verbosef("failed to close terminal input: %v", cleanupErr)
		}
	}()

	confirmed, err := ui.Confirm(
		ctx,
		c.out,
		input,
		fmt.Sprintf("Delete persisted %s environment data? [y/N]: ", flags.runtime),
	)
	if err != nil {
		return false, fmt.Errorf("confirm reset: %w", err)
	}
	if !confirmed {
		c.out.Println("Reset cancelled")
		return false, nil
	}

	return true, nil
}

// envStatusFlags holds parsed flags for the env status command.
type envStatusFlags struct {
	runtime    string
	jsonOutput bool
}

func (c *EnvCommand) parseStatusFlags(args []string) (envStatusFlags, bool, error) {
	fs := flag.NewFlagSet("env status", flag.ContinueOnError)
	var f envStatusFlags
	fs.StringVar(&f.runtime, "r", "", "Runtime to use")
	fs.StringVar(&f.runtime, "runtime", "", "Runtime to use")
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

	target, err := c.target(ctx, flags.runtime, c.out)
	defer c.closeContainerRuntime(target.conn)
	if err != nil {
		return err
	}
	if target.conn.err != nil {
		return target.conn.err
	}
	status, err := target.env.Status(ctx)
	if err != nil {
		return fmt.Errorf("get status: %w", err)
	}
	return envStatusOutput{
		Runtime:    target.runtime,
		Status:     status,
		JSONOutput: flags.jsonOutput,
	}.Print(c.out)
}

func renderEnvStatus(out *ui.Output, status *envtypes.Status) {
	table := ui.NewTable(
		ui.NewColumn("Container"),
		ui.NewColumn("Status"),
		ui.NewColumn("Image"),
	)
	for _, ctr := range status.Containers {
		table.Row(ui.Text(ctr.Name), ui.Text(ctr.Status), ui.Text(containerImageCell(ctr)))
	}
	out.RenderTable(table)
}

// containerImageCell renders what a container is running: its build, and the reference it was
// started from when studioctl could confirm that reference still resolves to that build.
func containerImageCell(ctr envtypes.ContainerStatus) string {
	if ctr.ImageID == "" {
		return "-"
	}
	build := config.ShortImageID(ctr.ImageID)
	if ctr.Image == "" {
		return build
	}
	return ctr.Image + " (" + build + ")"
}

func (c *EnvCommand) hostsUsage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s env hosts <subcommand> [options]", osutil.CurrentBin()),
		"",
		"Manage localtest hosts-file entries.",
		"",
		"Subcommands:",
		"  add       Add studioctl-managed localtest hosts entries",
		"  status    Show localtest hosts-file status",
		"  remove    Remove studioctl-managed localtest hosts entries",
		"",
		"Options:",
		c.hostsRuntimeUsage(),
		"  --json           Output as JSON",
		"",
		fmt.Sprintf("Run '%s env hosts <subcommand> --help' for more information.", osutil.CurrentBin()),
	)
}

func parseEnvHostsFlags(name string, args []string) (envHostsFlags, bool, error) {
	fs := flag.NewFlagSet(name, flag.ContinueOnError)
	var f envHostsFlags
	fs.StringVar(&f.runtime, "r", "", "Runtime to use")
	fs.StringVar(&f.runtime, "runtime", "", "Runtime to use")
	fs.BoolVar(&f.jsonOutput, "json", false, "Output as JSON")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return f, true, nil
		}
		return f, false, fmt.Errorf("parsing flags: %w", err)
	}
	return f, false, nil
}

func (c *EnvCommand) runHosts(args []string) error {
	if len(args) == 0 {
		c.out.Print(c.hostsUsage())
		return nil
	}

	subCmd := args[0]
	subArgs := args[1:]

	switch subCmd {
	case "add":
		return c.runHostsAdd(subArgs)
	case envStatusSubcommand:
		return c.runHostsStatus(subArgs)
	case "remove":
		return c.runHostsRemove(subArgs)
	case "-h", flagHelp, helpSubcmd:
		c.out.Print(c.hostsUsage())
		return nil
	default:
		return fmt.Errorf("%w: %s", ErrUnknownSubcommand, subCmd)
	}
}

func (c *EnvCommand) runHostsAdd(args []string) error {
	flags, helpShown, err := c.resolvedHostsFlags("env hosts add", args)
	if err != nil {
		return err
	}
	if helpShown {
		return nil
	}
	targets, spec, err := c.localtestHostsSpec()
	if err != nil {
		return err
	}
	addWarnings := localtestHostsAddWarnings()
	printHostWarnings(c.out, addWarnings)

	output := envHostsMutationOutput{
		Runtime:  flags.runtime,
		Targets:  make([]envHostsMutationTargetOutput, 0, len(targets)),
		Warnings: addWarnings,
	}

	for _, target := range targets {
		result, ensureErr := envlocaltest.EnsureManagedHosts(target.Path, spec.blockName, spec.address, spec.hostnames)
		if ensureErr == nil {
			output.Targets = append(output.Targets, envHostsMutationTargetOutput{
				Error:  "",
				Label:  target.Label,
				Path:   target.Path,
				Result: result,
			})
			if flags.jsonOutput {
				continue
			}
			if result.Changed {
				c.out.Successf("Added hosts entries to %s", target.Path)
				c.out.Printlnf("Backup saved to %s", result.BackupPath)
			} else {
				c.out.Printlnf("Managed localtest hosts entries already present in %s", target.Path)
			}
			continue
		}

		if handled := printOptionalHostWarning(c.out, target, "add", ensureErr); handled {
			output.Targets = append(output.Targets, envHostsMutationTargetOutput{
				Error: humanHostsError(target, "add", ensureErr).Error(),
				Label: target.Label,
				Path:  target.Path,
				Result: envlocaltest.HostsWriteResult{
					BackupPath: "",
					Changed:    false,
				},
			})
			continue
		}
		return formatHostsCommandError(target, "add", ensureErr)
	}

	if flags.jsonOutput {
		return printJSONOutput(c.out, "env hosts add", output)
	}
	return nil
}

func (c *EnvCommand) runHostsStatus(args []string) error {
	flags, helpShown, err := c.resolvedHostsFlags("env hosts status", args)
	if err != nil {
		return err
	}
	if helpShown {
		return nil
	}
	targets, spec, err := c.localtestHostsSpec()
	if err != nil {
		return err
	}

	output := envHostsStatusOutput{
		Path:     "",
		Runtime:  flags.runtime,
		Hosts:    make([]envHostsStatusHostOutput, 0, len(spec.hostnames)),
		Warnings: nil,
	}
	table := ui.NewTable(
		ui.NewColumn("Hostname"),
		ui.NewColumn("State"),
		ui.NewColumn("Details"),
	)

	target, status, err := c.inspectRequiredHostsTarget(targets, spec)
	if err != nil {
		return err
	}
	output.Path = target.Path
	output.Hosts = renderHostsByHostname(status, spec.address, spec.hostnames)
	if flags.jsonOutput {
		return printJSONOutput(c.out, "env hosts status", output)
	}
	appendHostsByHostnameRows(table, output.Hosts)
	c.out.RenderTable(table)
	return nil
}

func (c *EnvCommand) runHostsRemove(args []string) error {
	flags, helpShown, err := c.resolvedHostsFlags("env hosts remove", args)
	if err != nil {
		return err
	}
	if helpShown {
		return nil
	}
	targets, spec, err := c.localtestHostsSpec()
	if err != nil {
		return err
	}

	output := envHostsMutationOutput{
		Runtime:  flags.runtime,
		Targets:  make([]envHostsMutationTargetOutput, 0, len(targets)),
		Warnings: nil,
	}

	for _, target := range targets {
		result, removeErr := envlocaltest.RemoveManagedHosts(target.Path, spec.blockName)
		if removeErr == nil {
			output.Targets = append(output.Targets, envHostsMutationTargetOutput{
				Error:  "",
				Label:  target.Label,
				Path:   target.Path,
				Result: result,
			})
			if flags.jsonOutput {
				continue
			}
			if result.Changed {
				c.out.Successf("Removed managed hosts entries from %s", target.Path)
				c.out.Printlnf("Backup saved to %s", result.BackupPath)
			} else {
				c.out.Printlnf("No managed localtest hosts entries found in %s", target.Path)
			}
			continue
		}

		if handled := printOptionalHostWarning(c.out, target, "remove", removeErr); handled {
			output.Targets = append(output.Targets, envHostsMutationTargetOutput{
				Error: humanHostsError(target, "remove", removeErr).Error(),
				Label: target.Label,
				Path:  target.Path,
				Result: envlocaltest.HostsWriteResult{
					BackupPath: "",
					Changed:    false,
				},
			})
			continue
		}
		return formatHostsCommandError(target, "remove", removeErr)
	}

	if flags.jsonOutput {
		return printJSONOutput(c.out, "env hosts remove", output)
	}
	return nil
}

type localtestHostsSpec struct {
	address   string
	blockName string
	hostnames []string
}

func (c *EnvCommand) localtestHostsSpec() ([]osutil.HostsTarget, localtestHostsSpec, error) {
	hostsFileTargets := c.hostsFileTargets
	if hostsFileTargets == nil {
		hostsFileTargets = osutil.LocalHostsFileTargets
	}
	targets, err := hostsFileTargets()
	if err != nil {
		return nil, localtestHostsSpec{}, err
	}
	topology := envtopology.NewLocal(envtopology.DefaultIngressPortString())
	return targets, localtestHostsSpec{
		address:   envlocaltest.HostsLoopbackAddress,
		blockName: envlocaltest.HostsBlockName,
		hostnames: topology.HostFileHostnames(),
	}, nil
}

func localtestHostsAddWarnings() []string {
	if !osutil.IsWSL() {
		return nil
	}
	return []string{
		"WSL note: studioctl opens URLs in the Windows browser; if local domains do not resolve there, also update the Windows hosts file manually (usually C:\\Windows\\System32\\drivers\\etc\\hosts).",
	}
}

func (c *EnvCommand) inspectRequiredHostsTarget(
	targets []osutil.HostsTarget,
	spec localtestHostsSpec,
) (osutil.HostsTarget, envlocaltest.HostsFileStatus, error) {
	for _, target := range targets {
		status, err := envlocaltest.InspectHostsFile(target.Path, spec.blockName, spec.address, spec.hostnames)
		if err == nil {
			return target, status, nil
		}
		if handled := appendOptionalHostStatusWarning(c.out, target, err); handled {
			continue
		}
		return osutil.HostsTarget{}, envlocaltest.HostsFileStatus{}, fmt.Errorf(
			"inspect hosts file %q: %w",
			target.Path,
			err,
		)
	}
	return osutil.HostsTarget{}, envlocaltest.HostsFileStatus{}, errNoHostsFileTarget
}

func renderHostsByHostname(
	status envlocaltest.HostsFileStatus,
	address string,
	hostnames []string,
) []envHostsStatusHostOutput {
	conflicts := make(map[string][]string, len(status.Conflicts))
	for _, conflict := range status.Conflicts {
		conflicts[conflict.Host] = conflict.Addresses
	}
	missing := make(map[string]struct{}, len(status.Missing))
	for _, host := range status.Missing {
		missing[host] = struct{}{}
	}
	rows := make([]envHostsStatusHostOutput, 0, len(hostnames))
	for _, host := range hostnames {
		switch {
		case conflicts[host] != nil:
			rows = append(rows, envHostsStatusHostOutput{
				Detail: strings.Join(conflicts[host], ", "),
				Host:   host,
				State:  envlocaltest.HostsStateConflict,
			})
		case hasMissingHost(missing, host):
			rows = append(rows, envHostsStatusHostOutput{
				Detail: "",
				Host:   host,
				State:  envlocaltest.HostsStateMissing,
			})
		case status.Managed && status.State == envlocaltest.HostsStateInstalled:
			rows = append(rows, envHostsStatusHostOutput{
				Detail: address,
				Host:   host,
				State:  "managed",
			})
		default:
			rows = append(rows, envHostsStatusHostOutput{
				Detail: address,
				Host:   host,
				State:  envlocaltest.HostsStatePresent,
			})
		}
	}
	return rows
}

func hasMissingHost(missing map[string]struct{}, host string) bool {
	_, ok := missing[host]
	return ok
}

func appendHostsByHostnameRows(table *ui.Table, hosts []envHostsStatusHostOutput) {
	for _, host := range hosts {
		table.Row(ui.Text(host.Host), ui.Text(host.State), ui.Text(host.Detail))
	}
}

func printHostWarnings(out *ui.Output, warnings []string) {
	for _, warning := range warnings {
		out.Warning(warning)
	}
}

func appendOptionalHostStatusWarning(out *ui.Output, target osutil.HostsTarget, err error) bool {
	if !target.Required {
		out.Warningf("Skipping optional %s hosts file (%s): %v", target.Label, target.Path, err)
		return true
	}
	return false
}

func printOptionalHostWarning(out *ui.Output, target osutil.HostsTarget, action string, err error) bool {
	if target.Required {
		return false
	}
	out.Warningf(
		"Skipping optional %s hosts file during %s (%s): %v",
		target.Label,
		action,
		target.Path,
		humanHostsError(target, action, err),
	)
	return true
}

func formatHostsCommandError(target osutil.HostsTarget, action string, err error) error {
	humanErr := humanHostsError(target, action, err)
	return fmt.Errorf("%s hosts file %q: %w", action, target.Path, humanErr)
}

type hostsHumanError string

func (e hostsHumanError) Error() string {
	return string(e)
}

func humanHostsError(target osutil.HostsTarget, action string, err error) error {
	var conflictErr *envlocaltest.HostsConflictError
	switch {
	case errors.As(err, &conflictErr):
		return hostsHumanError("conflicting entries must be resolved manually: " + conflictErr.Error())
	case osutil.IsPermissionError(err):
		return hostsHumanError(hostsPermissionMessage(target, action))
	default:
		return err
	}
}

func hostsPermissionMessage(target osutil.HostsTarget, action string) string {
	switch target.Label {
	case "Windows":
		return fmt.Sprintf(
			"%s requires administrator privileges\nrerun in an elevated PowerShell or edit %s manually",
			action,
			target.Path,
		)
	default:
		return fmt.Sprintf(
			"%s requires elevated privileges\nrerun with sudo:\n  sudo %s env hosts %s",
			action,
			osutil.CurrentBinPath(),
			action,
		)
	}
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
	fs.StringVar(&f.runtime, "r", "", "Runtime to use")
	fs.StringVar(&f.runtime, "runtime", "", "Runtime to use")
	fs.StringVar(&f.component, "c", "", "Filter by component")
	fs.StringVar(&f.component, "component", "", "Filter by component")
	fs.BoolVar(&f.follow, "f", defaultLogFollow, "Follow log output")
	fs.BoolVar(&f.follow, "follow", defaultLogFollow, "Follow log output")
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

	target, err := c.target(ctx, flags.runtime, c.out)
	defer c.closeContainerRuntime(target.conn)
	if err != nil {
		return err
	}
	if target.conn.err != nil {
		return target.conn.err
	}
	if err := target.env.Logs(ctx, envtypes.LogsOptions{
		Component: flags.component,
		Follow:    flags.follow,
		JSON:      flags.jsonOutput,
	}); err != nil {
		return fmt.Errorf("env logs: %w", err)
	}
	return nil
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
