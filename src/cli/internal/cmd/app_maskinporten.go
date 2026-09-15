package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"

	"altinn.studio/studioctl/internal/appsecrets"
	appsvc "altinn.studio/studioctl/internal/cmd/app"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

const (
	appMaskinportenSubcommand = "maskinporten"
	stdinFileName             = "-"
)

// errMaskinportenInputRequired is returned when `set` has nothing to read the client from.
var errMaskinportenInputRequired = errors.New("no Maskinporten client supplied")

type appMaskinportenSetFlags struct {
	appPath    string
	file       string
	jsonOutput bool
}

type appMaskinportenFlags struct {
	appPath    string
	jsonOutput bool
}

func (c *AppCommand) runMaskinporten(ctx context.Context, args []string) error {
	if len(args) == 0 {
		c.out.Print(c.appMaskinportenUsage())
		return nil
	}

	switch args[0] {
	case "set":
		return c.runMaskinportenSet(ctx, args[1:])
	case "show":
		return c.runMaskinportenShow(ctx, args[1:])
	case "remove":
		return c.runMaskinportenRemove(ctx, args[1:])
	case "-h", flagHelp, helpSubcmd:
		c.out.Print(c.appMaskinportenUsage())
		return nil
	default:
		return fmt.Errorf("%w: %s", ErrUnknownSubcommand, args[0])
	}
}

func (c *AppCommand) runMaskinportenSet(ctx context.Context, args []string) error {
	flags, help, err := parseAppMaskinportenSetFlags(args)
	if err != nil {
		return err
	}
	if help {
		c.out.Print(c.appMaskinportenSetUsage())
		return nil
	}

	appPath, err := c.resolveMaskinportenApp(ctx, flags.appPath)
	if err != nil {
		return err
	}
	input, err := readMaskinportenInput(flags)
	if err != nil {
		return err
	}

	result, err := c.service.StoreMaskinportenClient(appsvc.MaskinportenClientRequest{
		AppPath: appPath,
		Input:   input,
	})
	if err != nil {
		return fmt.Errorf("store Maskinporten client: %w", err)
	}

	if flags.jsonOutput {
		return printJSONOutput(c.out, "app maskinporten set", result)
	}
	c.out.Printlnf("Stored the Maskinporten client for %s", result.AppID)
	printMaskinportenClient(c.out, result.MaskinportenClientSummary)
	c.out.Println("A running app picks it up without a restart.")
	return nil
}

func (c *AppCommand) runMaskinportenShow(ctx context.Context, args []string) error {
	flags, help, err := parseAppMaskinportenFlags("app maskinporten show", args)
	if err != nil {
		return err
	}
	if help {
		c.out.Print(c.appMaskinportenShowUsage())
		return nil
	}

	appPath, err := c.resolveMaskinportenApp(ctx, flags.appPath)
	if err != nil {
		return err
	}
	result, err := c.service.ShowMaskinportenClient(appPath)
	if errors.Is(err, appsecrets.ErrNoMaskinportenClient) {
		return fmt.Errorf("%w; store one with '%s app maskinporten set --file <client.json>'", err, osutil.CurrentBin())
	}
	if err != nil {
		return fmt.Errorf("show Maskinporten client: %w", err)
	}

	if flags.jsonOutput {
		return printJSONOutput(c.out, "app maskinporten show", result)
	}
	c.out.Printlnf("Maskinporten client for %s", result.AppID)
	printMaskinportenClient(c.out, result.MaskinportenClientSummary)
	return nil
}

func (c *AppCommand) runMaskinportenRemove(ctx context.Context, args []string) error {
	flags, help, err := parseAppMaskinportenFlags("app maskinporten remove", args)
	if err != nil {
		return err
	}
	if help {
		c.out.Print(c.appMaskinportenRemoveUsage())
		return nil
	}

	appPath, err := c.resolveMaskinportenApp(ctx, flags.appPath)
	if err != nil {
		return err
	}
	result, err := c.service.RemoveMaskinportenClient(appPath)
	if err != nil {
		return fmt.Errorf("remove Maskinporten client: %w", err)
	}

	if flags.jsonOutput {
		return printJSONOutput(c.out, "app maskinporten remove", result)
	}
	if result.Removed {
		c.out.Printlnf("Removed the Maskinporten client for %s (%s)", result.AppID, result.Path)
	} else {
		c.out.Printlnf("No Maskinporten client is stored for %s", result.AppID)
	}
	return nil
}

func (c *AppCommand) resolveMaskinportenApp(ctx context.Context, appPath string) (string, error) {
	detection, err := repocontext.DetectFromCwd(ctx, appPath)
	if err != nil {
		return "", fmt.Errorf("detect app: %w", err)
	}
	if !detection.InAppRepo {
		return "", fmt.Errorf("%w: run from an app directory or use -p to specify path", ErrNoAppFound)
	}
	return detection.AppRoot, nil
}

// readMaskinportenInput reads the client JSON from the given file or from standard input. The key never
// travels as a command-line argument, where it would land in shell history.
func readMaskinportenInput(flags appMaskinportenSetFlags) ([]byte, error) {
	switch {
	case flags.file != "" && flags.file != stdinFileName:
		return readMaskinportenFile(flags.file)
	case flags.file == stdinFileName || !ui.StdinIsTerminal():
		data, err := io.ReadAll(os.Stdin)
		if err != nil {
			return nil, fmt.Errorf("read standard input: %w", err)
		}
		return data, nil
	default:
		return nil, fmt.Errorf(
			"%w: pass --file FILE, or pipe the client JSON on standard input",
			errMaskinportenInputRequired,
		)
	}
}

func readMaskinportenFile(path string) ([]byte, error) {
	data, err := os.ReadFile(path) //nolint:gosec // G304: the file is the one the user named.
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}
	return data, nil
}

func printMaskinportenClient(out *ui.Output, summary appsecrets.MaskinportenClientSummary) {
	out.Printlnf("  Client id:    %s", summary.ClientID)
	out.Printlnf("  Environment:  %s (%s)", summary.Environment, summary.Authority)
	if summary.KeyID != "" {
		out.Printlnf("  Key id:       %s", summary.KeyID)
	}
	out.Printlnf("  Stored at:    %s", summary.Path)
}

func parseAppMaskinportenSetFlags(args []string) (appMaskinportenSetFlags, bool, error) {
	fs := flag.NewFlagSet("app maskinporten set", flag.ContinueOnError)
	fs.SetOutput(io.Discard)

	var flags appMaskinportenSetFlags
	fs.StringVar(&flags.appPath, "p", "", "App directory path")
	fs.StringVar(&flags.appPath, "path", "", "App directory path")
	fs.StringVar(&flags.file, "file", "", "Read the client from this file (- for standard input)")
	fs.BoolVar(&flags.jsonOutput, "json", false, "Output as JSON")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return flags, true, nil
		}
		return flags, false, fmt.Errorf("parsing flags: %w", err)
	}
	if len(fs.Args()) > 0 {
		return flags, false, fmt.Errorf("%w: unexpected argument %q", ErrInvalidFlagValue, fs.Args()[0])
	}
	return flags, false, nil
}

func parseAppMaskinportenFlags(name string, args []string) (appMaskinportenFlags, bool, error) {
	fs := flag.NewFlagSet(name, flag.ContinueOnError)
	fs.SetOutput(io.Discard)

	var flags appMaskinportenFlags
	fs.StringVar(&flags.appPath, "p", "", "App directory path")
	fs.StringVar(&flags.appPath, "path", "", "App directory path")
	fs.BoolVar(&flags.jsonOutput, "json", false, "Output as JSON")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return flags, true, nil
		}
		return flags, false, fmt.Errorf("parsing flags: %w", err)
	}
	if len(fs.Args()) > 0 {
		return flags, false, fmt.Errorf("%w: unexpected argument %q", ErrInvalidFlagValue, fs.Args()[0])
	}
	return flags, false, nil
}

func (c *AppCommand) appMaskinportenUsage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s app maskinporten <subcommand> [options]", osutil.CurrentBin()),
		"",
		"Store the Maskinporten client an app uses when it runs locally. studioctl provisions it to the app",
		"the way Studio does when the app is deployed: the app never reads Maskinporten credentials from its",
		"own configuration. A running app picks up a stored client without a restart.",
		"",
		"Subcommands:",
		"  set       Store the client for this app (from --file or standard input)",
		"  show      Show the stored client - never its private key",
		"  remove    Remove the stored client",
		"",
		fmt.Sprintf("Run '%s app maskinporten <subcommand> --help' for more information.", osutil.CurrentBin()),
	)
}

func (c *AppCommand) appMaskinportenSetUsage() string {
	return joinLines(
		fmt.Sprintf(
			"Usage: %s app maskinporten set [-p PATH] [--file FILE] [--json]",
			osutil.CurrentBin(),
		),
		"",
		"Store the Maskinporten client this app uses for local runs. The input is the client as JSON: the",
		"provisioned maskinporten-settings.json format, the bare credentials (authority, clientId, and jwk or",
		"jwkBase64), a section written for the Altinn.ApiClients.Maskinporten package (Environment, ClientId,",
		"EncodedJwk), or a section pasted out of an appsettings file together with its name. Without --file,",
		"the JSON is read from standard input: paste it, then end the input (Ctrl+D). Prefer that, --file, or a",
		"redirect (< client.json) over echo, which would leave the key in your shell history. The private key",
		"is stored readable by you only, and is never printed.",
		"",
		"Options:",
		"  -p, --path PATH       App directory path",
		"  --file FILE           Read the client from FILE (- for standard input)",
		"  --json                Output as JSON",
		"  -h, --help            Show this help",
	)
}

func (c *AppCommand) appMaskinportenShowUsage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s app maskinporten show [-p PATH] [--json]", osutil.CurrentBin()),
		"",
		"Show the Maskinporten client stored for this app: client id, Maskinporten environment, key id and",
		"where it is stored. The private key is never printed.",
		"",
		"Options:",
		"  -p, --path PATH       App directory path",
		"  --json                Output as JSON",
		"  -h, --help            Show this help",
	)
}

func (c *AppCommand) appMaskinportenRemoveUsage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s app maskinporten remove [-p PATH] [--json]", osutil.CurrentBin()),
		"",
		"Remove the Maskinporten client stored for this app.",
		"",
		"Options:",
		"  -p, --path PATH       App directory path",
		"  --json                Output as JSON",
		"  -h, --help            Show this help",
	)
}
