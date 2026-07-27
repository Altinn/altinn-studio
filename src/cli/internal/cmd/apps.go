package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"strings"

	"altinn.studio/studioctl/internal/auth"
	appsvc "altinn.studio/studioctl/internal/cmd/app"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/studio"
	"altinn.studio/studioctl/internal/ui"
)

const (
	defaultAppsSearchLimit = 20
	defaultAppsSearchPage  = 1
	defaultAppsSearchSort  = "alpha"
	defaultAppsSearchOrder = "asc"
)

// AppsCommand implements the 'apps' command.
type AppsCommand struct {
	out     *ui.Output
	service *appsvc.Service
}

type appsSearchFlags struct {
	env        string
	sort       string
	order      string
	page       int
	limit      int
	jsonOutput bool
}

type appsSearchOutput struct {
	Query      string                `json:"query"`
	Apps       []appsSearchAppOutput `json:"apps"`
	TotalCount int                   `json:"totalCount"`
	TotalPages int                   `json:"totalPages"`
	Page       int                   `json:"page"`
	Limit      int                   `json:"limit"`
	JSONOutput bool                  `json:"-"`
}

type appsSearchAppOutput struct {
	AppID       string `json:"appId"`
	Description string `json:"description,omitempty"`
	CloneURL    string `json:"cloneUrl,omitempty"`
	HTMLURL     string `json:"htmlUrl,omitempty"`
}

// NewAppsCommand creates a new apps command.
func NewAppsCommand(cfg *config.Config, out *ui.Output) *AppsCommand {
	return &AppsCommand{
		out:     out,
		service: appsvc.NewService(cfg),
	}
}

// Name returns the command name.
func (c *AppsCommand) Name() string { return "apps" }

// Synopsis returns a short description.
func (c *AppsCommand) Synopsis() string { return "Search Altinn apps" }

// Usage returns the full help text.
func (c *AppsCommand) Usage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s apps <subcommand> [options]", osutil.CurrentBin()),
		"",
		"Search Altinn apps.",
		"",
		"Subcommands:",
		"  search    Search app repositories in Altinn Studio",
		"",
		fmt.Sprintf("Run '%s apps <subcommand> --help' for more information.", osutil.CurrentBin()),
	)
}

// Run executes the command.
func (c *AppsCommand) Run(ctx context.Context, args []string) error {
	if len(args) == 0 {
		c.out.Print(c.Usage())
		return nil
	}

	subCmd := args[0]
	subArgs := args[1:]

	switch subCmd {
	case "search":
		return c.runSearch(ctx, subArgs)
	case "-h", flagHelp, helpSubcmd:
		c.out.Print(c.Usage())
		return nil
	default:
		return fmt.Errorf("%w: %s", ErrUnknownSubcommand, subCmd)
	}
}

func (c *AppsCommand) runSearch(ctx context.Context, args []string) error {
	flags, query, help, err := c.parseSearchFlags(args)
	if err != nil {
		return err
	}
	if help {
		c.out.Print(c.searchUsage())
		return nil
	}
	if query == "" {
		return fmt.Errorf(
			"%w: usage: %s apps search [--env ENV] <query>",
			ErrMissingArgument,
			osutil.CurrentBin(),
		)
	}

	result, err := c.service.Search(ctx, appsvc.SearchRequest{
		Env:   flags.env,
		Query: query,
		Sort:  flags.sort,
		Order: flags.order,
		Page:  flags.page,
		Limit: flags.limit,
	})
	if err != nil {
		return mapAppsSearchError(err, flags.env)
	}

	return appsSearchOutput{
		Apps:       appsSearchAppsOutput(result.Repositories),
		Query:      query,
		TotalCount: result.TotalCount,
		TotalPages: result.TotalPages,
		Page:       flags.page,
		Limit:      flags.limit,
		JSONOutput: flags.jsonOutput,
	}.Print(c.out)
}

func (c *AppsCommand) parseSearchFlags(args []string) (appsSearchFlags, string, bool, error) {
	fs := flag.NewFlagSet("apps search", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	flags := appsSearchFlags{
		env:        auth.DefaultEnv,
		sort:       defaultAppsSearchSort,
		order:      defaultAppsSearchOrder,
		page:       defaultAppsSearchPage,
		limit:      defaultAppsSearchLimit,
		jsonOutput: false,
	}
	fs.StringVar(&flags.env, "env", auth.DefaultEnv, "Environment name (prod, dev, staging, local)")
	fs.IntVar(&flags.limit, "limit", defaultAppsSearchLimit, "Maximum number of apps to return")
	fs.IntVar(&flags.page, "page", defaultAppsSearchPage, "Result page")
	fs.StringVar(&flags.sort, "sort", defaultAppsSearchSort, "Sort by alpha, created, updated, size, or id")
	fs.StringVar(&flags.order, "order", defaultAppsSearchOrder, "Sort order: asc or desc")
	fs.BoolVar(&flags.jsonOutput, "json", false, "Output as JSON")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return flags, "", true, nil
		}
		return flags, "", false, fmt.Errorf("parsing flags: %w", err)
	}
	if flags.limit < 1 {
		return flags, "", false, fmt.Errorf("%w: --limit must be greater than 0", ErrInvalidFlagValue)
	}
	if flags.page < 1 {
		return flags, "", false, fmt.Errorf("%w: --page must be greater than 0", ErrInvalidFlagValue)
	}
	if !isSupportedAppsSearchSort(flags.sort) {
		return flags, "", false, fmt.Errorf(
			"%w: --sort must be one of alpha, created, updated, size, or id",
			ErrInvalidFlagValue,
		)
	}
	if !isSupportedAppsSearchOrder(flags.order) {
		return flags, "", false, fmt.Errorf("%w: --order must be asc or desc", ErrInvalidFlagValue)
	}
	flags.sort = strings.ToLower(flags.sort)
	flags.order = strings.ToLower(flags.order)

	query := strings.TrimSpace(strings.Join(fs.Args(), " "))
	return flags, query, false, nil
}

func (c *AppsCommand) searchUsage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s apps search [options] <query>", osutil.CurrentBin()),
		"",
		"Searches app repositories in Altinn Studio.",
		"",
		"Options:",
		"  --env ENV       Environment name: prod, dev, staging, or local (default: prod)",
		fmt.Sprintf("  --limit N       Maximum number of apps to return (default: %d)", defaultAppsSearchLimit),
		fmt.Sprintf("  --page N        Result page (default: %d)", defaultAppsSearchPage),
		fmt.Sprintf(
			"  --sort FIELD    Sort by alpha, created, updated, size, or id (default: %s)",
			defaultAppsSearchSort,
		),
		fmt.Sprintf("  --order ORDER   Sort order: asc or desc (default: %s)", defaultAppsSearchOrder),
		"  --json          Output as JSON",
		"  -h, --help      Show this help",
	)
}

func mapAppsSearchError(err error, env string) error {
	switch {
	case errors.Is(err, appsvc.ErrNotLoggedIn):
		return fmt.Errorf("%w: %s (run '%s auth login --env %s')", ErrNotLoggedIn, env, osutil.CurrentBin(), env)
	case errors.Is(err, studio.ErrUnauthorized):
		return fmt.Errorf("%w (run '%s auth login --env %s')", ErrInvalidToken, osutil.CurrentBin(), env)
	default:
		return fmt.Errorf("search failed: %w", err)
	}
}

func appsSearchAppsOutput(repositories []studio.Repository) []appsSearchAppOutput {
	output := make([]appsSearchAppOutput, 0, len(repositories))
	for _, repo := range repositories {
		output = append(output, appsSearchAppOutput{
			AppID:       repoAppID(repo),
			Description: repo.Description,
			CloneURL:    repo.CloneURL,
			HTMLURL:     repo.HTMLURL,
		})
	}
	return output
}

func repoAppID(repo studio.Repository) string {
	if repo.FullName != "" {
		return repo.FullName
	}
	if repo.Owner != nil && repo.Owner.Login != "" && repo.Name != "" {
		return repo.Owner.Login + "/" + repo.Name
	}
	return repo.Name
}

func (o appsSearchOutput) Print(out *ui.Output) error {
	if o.JSONOutput {
		return printJSONOutput(out, "apps search", o)
	}
	if len(o.Apps) == 0 {
		out.Println("No apps found.")
		return nil
	}

	table := ui.NewTable(
		ui.NewColumn("APP ID"),
		ui.NewColumn("DESCRIPTION"),
	)
	for _, app := range o.Apps {
		table.TextRow(app.AppID, tableDash(app.Description))
	}
	out.RenderTable(table)
	return nil
}

func isSupportedAppsSearchSort(value string) bool {
	switch strings.ToLower(value) {
	case "alpha", "created", "updated", "size", "id":
		return true
	default:
		return false
	}
}

func isSupportedAppsSearchOrder(value string) bool {
	switch strings.ToLower(value) {
	case "asc", "desc":
		return true
	default:
		return false
	}
}
