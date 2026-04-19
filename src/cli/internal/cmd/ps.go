package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"strconv"

	"altinn.studio/studioctl/internal/appmanager"
	appsvc "altinn.studio/studioctl/internal/cmd/app"
	"altinn.studio/studioctl/internal/config"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

// AppPsCommand implements `studioctl app ps`.
type AppPsCommand struct {
	out     *ui.Output
	manager appManagerAccess
	service *appsvc.Service
}

type appPsFlags struct {
	appPath    string
	jsonOutput bool
}

type appPsOutput struct {
	Apps       []appPsAppOutput `json:"apps"`
	Running    bool             `json:"running"`
	JSONOutput bool             `json:"-"`
}

type appPsAppOutput struct {
	AppID string `json:"appId"`
	Mode  string `json:"mode"`
	ID    string `json:"id,omitempty"`
	Name  string `json:"name,omitempty"`
	Port  int    `json:"port,omitempty"`
}

func newAppPsCommand(cfg *config.Config, out *ui.Output, service *appsvc.Service) *AppPsCommand {
	return &AppPsCommand{
		out:     out,
		manager: newAppManagerAccess(cfg),
		service: service,
	}
}

// RunWithCommandPath executes ps with usage text bound to commandPath.
func (c *AppPsCommand) RunWithCommandPath(ctx context.Context, args []string, commandPath string) error {
	flags, help, err := c.parseFlags(args, commandPath)
	if err != nil {
		return err
	}
	if help {
		c.out.Print(c.UsageFor(commandPath))
		return nil
	}

	var appID string
	if flags.appPath != "" {
		target, targetErr := c.service.ResolveRunTarget(ctx, flags.appPath)
		if targetErr != nil {
			if errors.Is(targetErr, repocontext.ErrAppNotFound) {
				return fmt.Errorf("%w: use a valid app directory with -p", ErrNoAppFound)
			}
			return fmt.Errorf("resolve app: %w", targetErr)
		}
		appID = target.AppID
	}

	if ensureErr := c.manager.ensure(ctx); ensureErr != nil {
		return startAppManagerError(ensureErr)
	}

	status, err := c.manager.client.Status(ctx)
	if err != nil {
		if errors.Is(err, appmanager.ErrNotRunning) {
			return appPsOutput{Apps: nil, Running: false, JSONOutput: flags.jsonOutput}.Print(c.out)
		}
		return fmt.Errorf("get app-manager status: %w", err)
	}

	return appPsOutput{
		Running:    true,
		Apps:       appPsAppsOutput(sortDiscoveredApps(filterApps(status.Apps, appID, false))),
		JSONOutput: flags.jsonOutput,
	}.Print(c.out)
}

// UsageFor returns usage text for the supplied command path.
func (c *AppPsCommand) UsageFor(commandPath string) string {
	return joinLines(
		fmt.Sprintf("Usage: %s %s [-p PATH]", osutil.CurrentBin(), commandPath),
		"",
		"Lists app endpoints discovered by app-manager.",
		"",
		"Options:",
		"  -p, --path PATH       Filter by app directory",
		"  --json               Output as JSON",
		"  -h, --help           Show this help",
	)
}

func (c *AppPsCommand) parseFlags(args []string, commandPath string) (appPsFlags, bool, error) {
	fs := flag.NewFlagSet(commandPath, flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	var flags appPsFlags
	fs.StringVar(&flags.appPath, "p", "", "App directory path")
	fs.StringVar(&flags.appPath, "path", "", "App directory path")
	fs.BoolVar(&flags.jsonOutput, "json", false, "Output as JSON")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return flags, true, nil
		}
		return flags, false, fmt.Errorf("parsing flags: %w", err)
	}
	return flags, false, nil
}

func appPsAppsOutput(apps []appmanager.DiscoveredApp) []appPsAppOutput {
	output := make([]appPsAppOutput, 0, len(apps))
	for _, app := range apps {
		id := appRuntimeID(app)
		if id == "-" {
			id = ""
		}
		output = append(output, appPsAppOutput{
			AppID: app.AppID,
			Mode:  appMode(app),
			ID:    id,
			Name:  app.Name,
			Port:  appPortNumber(app),
		})
	}
	return output
}

func (o appPsOutput) Print(out *ui.Output) error {
	if o.JSONOutput {
		return printJSONOutput(out, "app ps", o)
	}
	if !o.Running {
		out.Println("app-manager is not running.")
		return nil
	}
	if len(o.Apps) == 0 {
		out.Println("No apps running.")
		return nil
	}

	table := ui.NewTable(
		ui.NewColumn("APP ID"),
		ui.NewColumn("MODE"),
		ui.NewColumn("ID").WithAlign(ui.AlignRight),
		ui.NewColumn("NAME"),
		ui.NewColumn("PORT").WithAlign(ui.AlignRight),
	)
	for _, app := range o.Apps {
		table.TextRow(
			app.AppID,
			app.Mode,
			tableDash(app.ID),
			tableDash(app.Name),
			tablePort(app.Port),
		)
	}
	out.RenderTable(table)
	return nil
}

func tableDash(value string) string {
	if value == "" {
		return "-"
	}
	return value
}

func tablePort(port int) string {
	if port <= 0 {
		return "-"
	}
	return strconv.Itoa(port)
}
