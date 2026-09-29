package cmd

// `studioctl app vet`: validation by RPC into studioctl-server, which hosts the engine.

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"sort"

	appsvc "altinn.studio/studioctl/internal/cmd/app"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/studioctlserver"
)

type appVetFlags struct {
	appPath    string
	severity   string
	jsonOutput bool
	listRules  bool
}

func (c *AppCommand) runVet(ctx context.Context, args []string) error {
	if len(args) > 0 && args[0] == "explain" {
		return c.runVetExplain(ctx, args[1:])
	}
	flags, help, err := parseAppVetFlags(args)
	if err != nil {
		return err
	}
	if help {
		c.out.Print(appVetUsage())
		return nil
	}
	if flags.listRules {
		return c.printRulesList(ctx, flags.jsonOutput)
	}
	return c.runVetChecks(ctx, flags)
}

func (c *AppCommand) runVetChecks(ctx context.Context, flags appVetFlags) error {
	detection, err := repocontext.DetectFromCwd(ctx, flags.appPath)
	if err != nil {
		return fmt.Errorf("detect app: %w", err)
	}
	if !detection.InAppRepo {
		return fmt.Errorf("%w: run from an app directory or use -p to specify path", ErrNoAppFound)
	}

	if err := c.server.ensure(ctx); err != nil {
		return startStudioctlServerError(err)
	}
	resp, rpcErr := c.server.client.Validate(ctx, studioctlserver.ValidateRequest{
		Path:     detection.AppRoot,
		Severity: studioctlserver.ValidateSeverity(flags.severity),
	})
	if rpcErr != nil {
		return fmt.Errorf("vet: %w", rpcErr)
	}
	if flags.jsonOutput {
		return printJSONOutput(c.out, "vet", resp)
	}
	appsvc.PrintVetResult(c.out, resp)
	if resp.Summary.Errors > 0 {
		return ErrReportedFailure
	}
	return nil
}

func parseAppVetFlags(args []string) (appVetFlags, bool, error) {
	fs := flag.NewFlagSet("app vet", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	var flags appVetFlags
	fs.StringVar(&flags.appPath, "p", "", "App directory path")
	fs.StringVar(&flags.appPath, "path", "", "App directory path")
	fs.BoolVar(&flags.jsonOutput, "json", false, "Emit findings as JSON")
	fs.BoolVar(&flags.listRules, "list-rules", false, "List all registered rules and exit")
	fs.StringVar(&flags.severity, "severity", "warning", "Min severity (error|warning|info)")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return flags, true, nil
		}
		return flags, false, fmt.Errorf("parsing flags: %w", err)
	}
	return flags, false, nil
}

func appVetUsage() string {
	return joinLines(
		fmt.Sprintf(
			"Usage: %s app vet [-p PATH] [--json] [--list-rules] [--severity=…]",
			osutil.CurrentBin(),
		),
		fmt.Sprintf("       %s app vet explain RULE-ID", osutil.CurrentBin()),
		"",
		"Validate an app. Supports V9+.",
		"",
		"Options:",
		"  -p, --path PATH       App directory (defaults to auto-detect from cwd)",
		"  --json                Emit findings as JSON",
		"  --list-rules          List all registered rules and exit",
		"  --severity LEVEL      Min severity to report (error|warning|info; default: warning)",
		"  -h, --help            Show this help",
		"",
		"Subcommands:",
		"  explain RULE-ID       Print one rule's full description",
	)
}

func (c *AppCommand) printRulesList(ctx context.Context, asJSON bool) error {
	if err := c.server.ensure(ctx); err != nil {
		return startStudioctlServerError(err)
	}
	rules, err := c.server.client.ListValidationRules(ctx)
	if err != nil {
		return fmt.Errorf("list rules: %w", err)
	}
	sort.Slice(rules, func(i, j int) bool { return rules[i].ID < rules[j].ID })
	if asJSON {
		return printJSONOutput(c.out, "vet rules", rules)
	}
	appsvc.PrintVetRules(c.out, rules)
	return nil
}

func (c *AppCommand) runVetExplain(ctx context.Context, args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("%w: app vet explain RULE-ID", ErrMissingArgument)
	}
	if err := c.server.ensure(ctx); err != nil {
		return startStudioctlServerError(err)
	}
	rules, err := c.server.client.ListValidationRules(ctx)
	if err != nil {
		return fmt.Errorf("list rules: %w", err)
	}
	id := args[0]
	for _, r := range rules {
		if r.ID == id {
			c.out.Printlnf("%s", r.ID)
			c.out.Println("")
			c.out.Printlnf("  Title:       %s", r.Title)
			c.out.Printlnf("  Severity:    %s", r.Severity)
			c.out.Println("")
			c.out.Printlnf("%s", r.Description)
			return nil
		}
	}
	return fmt.Errorf("%w: %s (try 'app vet --list-rules')", ErrInvalidFlagValue, id)
}
