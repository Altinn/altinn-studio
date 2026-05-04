package cmd

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
	"time"

	containerruntime "altinn.studio/devenv/pkg/container"
	"altinn.studio/studioctl/internal/appmanager"
	appsvc "altinn.studio/studioctl/internal/cmd/app"
	appsupport "altinn.studio/studioctl/internal/cmd/apps"
	"altinn.studio/studioctl/internal/config"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/logstream"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

var (
	errAppLogsNotFound    = errors.New("app logs not found")
	errAppLogsUnavailable = errors.New("app logs unavailable")
)

const appLogsTailAllValue = "all"

type appLogsCommand struct {
	out             *ui.Output
	manager         appManagerAccess
	service         *appsvc.Service
	cfg             *config.Config
	containerClient containerClientFactory
}

type appLogsFlags struct {
	appPath    string
	id         string
	tail       int
	tailAll    bool
	follow     bool
	jsonOutput bool
}

type appLogsTailFlag struct {
	all   *bool
	value *int
}

type appLogLine struct {
	AppID   string `json:"appId"`
	Mode    string `json:"mode,omitempty"`
	ID      string `json:"id,omitempty"`
	Name    string `json:"name,omitempty"`
	LogPath string `json:"logPath,omitempty"`
	Line    string `json:"line"`
	Port    int    `json:"port,omitempty"`
	JSON    bool   `json:"-"`
}

func newAppLogsCommand(cfg *config.Config, out *ui.Output, service *appsvc.Service) *appLogsCommand {
	return &appLogsCommand{
		out:             out,
		cfg:             cfg,
		manager:         newAppManagerAccess(cfg),
		service:         service,
		containerClient: containerruntime.Detect,
	}
}

func (c *appLogsCommand) usageFor(commandPath string) string {
	return joinLines(
		fmt.Sprintf("Usage: %s %s [-p PATH] [--id ID]", osutil.CurrentBin(), commandPath),
		"",
		"Streams logs for a Studio app.",
		"",
		"Options:",
		"  -p, --path PATH       Specify app directory (overrides auto-detect)",
		"  --id ID              Select process ID or container ID from 'app ps'",
		"  -f, --follow         Follow log output (default: false)",
		fmt.Sprintf("  --tail N|all        Number of log lines to show (default: %d)", defaultServersLogTailLines),
		"  --json              Output as newline-delimited JSON",
		"  -h, --help          Show this help",
	)
}

func (c *appLogsCommand) run(ctx context.Context, args []string) error {
	const commandPath = "app logs"

	flags, help, err := c.parseFlags(args, commandPath)
	if err != nil {
		return err
	}
	if help {
		c.out.Print(c.usageFor(commandPath))
		return nil
	}
	if c.cfg == nil {
		return errStudioctlConfigRequired
	}

	appID, err := c.resolveAppID(ctx, flags)
	if err != nil {
		return err
	}
	if flags.tailAll && appID == "" && flags.id == "" {
		return fmt.Errorf("%w: --tail all requires an app directory, -p, or --id", ErrInvalidFlagValue)
	}

	apps, err := c.matchingRunningApps(ctx, appID, flags.id)
	if err != nil {
		return err
	}
	if len(apps) > 1 {
		return fmt.Errorf(
			"%w: multiple app runs match; use --id from '%s app ps'",
			ErrInvalidFlagValue,
			osutil.CurrentBin(),
		)
	}
	if len(apps) == 1 {
		return c.streamRunningApp(ctx, apps[0], flags)
	}

	if appID == "" {
		return fmt.Errorf("%w: run from an app directory, use -p, or use --id for a running app", ErrNoAppFound)
	}
	return c.streamStoredAppLog(ctx, appID, flags)
}

func (c *appLogsCommand) parseFlags(args []string, commandPath string) (appLogsFlags, bool, error) {
	fs := flag.NewFlagSet(commandPath, flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	flags := appLogsFlags{
		appPath:    "",
		id:         "",
		tail:       defaultServersLogTailLines,
		tailAll:    false,
		follow:     defaultLogFollow,
		jsonOutput: false,
	}
	fs.StringVar(&flags.appPath, "p", "", "App directory path")
	fs.StringVar(&flags.appPath, "path", "", "App directory path")
	fs.StringVar(&flags.id, "id", "", "Process ID or container ID from app ps")
	fs.BoolVar(&flags.follow, "f", defaultLogFollow, "Follow log output")
	fs.BoolVar(&flags.follow, "follow", defaultLogFollow, "Follow log output")
	fs.Var(appLogsTailFlag{all: &flags.tailAll, value: &flags.tail}, "tail", "Number of log lines to show")
	fs.BoolVar(&flags.jsonOutput, "json", false, "Output as newline-delimited JSON")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return flags, true, nil
		}
		return flags, false, fmt.Errorf("parsing flags: %w", err)
	}
	if flags.tail < 0 {
		return flags, false, fmt.Errorf("%w: --tail must be greater than or equal to 0", ErrInvalidFlagValue)
	}
	if flags.tail > maxServersLogTailLines {
		return flags, false, fmt.Errorf(
			"%w: --tail must be less than or equal to %d",
			ErrInvalidFlagValue,
			maxServersLogTailLines,
		)
	}
	return flags, false, nil
}

func (c *appLogsCommand) resolveAppID(ctx context.Context, flags appLogsFlags) (string, error) {
	if c.service == nil {
		return "", nil
	}

	target, err := c.service.ResolveRunTarget(ctx, flags.appPath)
	if err == nil {
		return target.AppID, nil
	}
	if flags.appPath == "" && errors.Is(err, repocontext.ErrAppNotFound) {
		return "", nil
	}
	if errors.Is(err, repocontext.ErrAppNotFound) {
		return "", fmt.Errorf("%w: use a valid app directory with -p", ErrNoAppFound)
	}
	return "", fmt.Errorf("resolve app: %w", err)
}

func (c *appLogsCommand) matchingRunningApps(
	ctx context.Context,
	appID string,
	id string,
) ([]appmanager.DiscoveredApp, error) {
	if err := c.manager.ensure(ctx); err != nil {
		return nil, startAppManagerError(err)
	}

	status, err := c.manager.client.Status(ctx)
	if err != nil {
		if errors.Is(err, appmanager.ErrNotRunning) {
			return nil, nil
		}
		return nil, fmt.Errorf("get app-manager status: %w", err)
	}

	apps := filterApps(status.Apps, appID, false)
	if id == "" {
		return sortDiscoveredApps(apps), nil
	}

	filtered := make([]appmanager.DiscoveredApp, 0, len(apps))
	for _, app := range apps {
		if appMatchesRuntimeID(app, id) {
			filtered = append(filtered, app)
		}
	}
	return sortDiscoveredApps(filtered), nil
}

func (c *appLogsCommand) streamRunningApp(ctx context.Context, app appmanager.DiscoveredApp, flags appLogsFlags) error {
	if appHasContainerHandle(app) {
		return c.streamContainerLogs(ctx, app, flags)
	}

	processID := appProcessID(app)
	if processID <= 0 {
		return fmt.Errorf("%w: no log source for %s", errAppLogsUnavailable, app.AppID)
	}

	logDir := c.appLogDir(app.AppID)
	metadata, ok, err := appsupport.FindMetadataByID(logDir, strconv.Itoa(processID))
	if err != nil {
		return fmt.Errorf("find app log metadata: %w", err)
	}
	if !ok {
		return fmt.Errorf(
			"%w: logs are not available for process %d; start the app with '%s run' to capture logs",
			errAppLogsUnavailable,
			processID,
			osutil.CurrentBin(),
		)
	}
	return c.streamLogFile(ctx, appLogLine{
		AppID:   app.AppID,
		Mode:    runModeProcess,
		ID:      strconv.Itoa(processID),
		Name:    app.Name,
		Port:    appPortNumber(app),
		LogPath: metadata.LogPath,
		Line:    "",
		JSON:    flags.jsonOutput,
	}, metadata.LogPath, flags)
}

func (c *appLogsCommand) streamStoredAppLog(ctx context.Context, appID string, flags appLogsFlags) error {
	logDir := c.appLogDir(appID)
	if flags.id != "" {
		metadata, ok, err := appsupport.FindMetadataByID(logDir, flags.id)
		if err != nil {
			return fmt.Errorf("find app log metadata: %w", err)
		}
		if !ok {
			return fmt.Errorf("%w: no log metadata matches id %s", errAppLogsNotFound, flags.id)
		}
		return c.streamLogFile(ctx, appLogLine{
			AppID:   metadata.AppID,
			Mode:    metadata.Mode,
			ID:      metadata.ID,
			Name:    metadata.Name,
			Port:    metadata.HostPort,
			LogPath: metadata.LogPath,
			Line:    "",
			JSON:    flags.jsonOutput,
		}, metadata.LogPath, flags)
	}

	logPath, ok, err := appsupport.LatestLogPath(logDir)
	if err != nil {
		return fmt.Errorf("find latest app log: %w", err)
	}
	if !ok {
		return fmt.Errorf("%w: %s", errAppLogsNotFound, appID)
	}
	return c.streamLogFile(ctx, appLogLine{
		AppID:   appID,
		Mode:    "",
		ID:      "",
		Name:    "",
		Port:    0,
		LogPath: logPath,
		Line:    "",
		JSON:    flags.jsonOutput,
	}, logPath, flags)
}

func (c *appLogsCommand) streamLogFile(
	ctx context.Context,
	line appLogLine,
	logPath string,
	flags appLogsFlags,
) error {
	streamer := logstream.Streamer{
		ListFiles: func() ([]logstream.File, error) {
			file, ok, err := logFile(logPath)
			if err != nil {
				return nil, err
			}
			if !ok {
				return nil, logstream.ErrNoLogFiles
			}
			return []logstream.File{file}, nil
		},
		Emit: func(_ string, text string) error {
			line.Line = strings.TrimSuffix(text, "\r")
			return line.Print(c.out)
		},
	}
	if err := streamer.Stream(ctx, logstream.Options{
		Tail:    flags.tail,
		TailAll: flags.tailAll,
		Follow:  flags.follow,
	}); err != nil {
		if errors.Is(err, logstream.ErrNoLogFiles) {
			return errAppLogsNotFound
		}
		if errors.Is(err, logstream.ErrLineTooLong) {
			return fmt.Errorf("%w: app log line exceeds max size", errAppLogsUnavailable)
		}
		return fmt.Errorf("stream app log: %w", err)
	}
	return nil
}

func (c *appLogsCommand) streamContainerLogs(
	ctx context.Context,
	app appmanager.DiscoveredApp,
	flags appLogsFlags,
) error {
	clientFactory := c.containerClient
	if clientFactory == nil {
		clientFactory = containerruntime.Detect
	}
	client, err := clientFactory(ctx)
	if err != nil {
		return fmt.Errorf("connect to container runtime: %w", err)
	}
	defer func() {
		if closeErr := client.Close(); closeErr != nil {
			c.out.Verbosef("failed to close container client: %v", closeErr)
		}
	}()

	nameOrID := app.ContainerID
	if nameOrID == "" {
		nameOrID = app.Name
	}
	if nameOrID == "" {
		return fmt.Errorf("%w: app container id or name missing", errAppLogsUnavailable)
	}

	logs, err := client.ContainerLogs(ctx, nameOrID, flags.follow, appLogsTailValue(flags))
	if err != nil {
		return fmt.Errorf("stream app container logs: %w", err)
	}
	defer func() {
		if closeErr := logs.Close(); closeErr != nil {
			c.out.Verbosef("failed to close app container logs: %v", closeErr)
		}
	}()

	line := appLogLine{
		AppID:   app.AppID,
		Mode:    runModeContainer,
		ID:      appRuntimeID(app),
		Name:    app.Name,
		LogPath: "",
		Line:    "",
		Port:    appPortNumber(app),
		JSON:    flags.jsonOutput,
	}
	return c.streamContainerLogReader(ctx, logs, line)
}

func (c *appLogsCommand) streamContainerLogReader(ctx context.Context, logs io.Reader, line appLogLine) error {
	scanner := bufio.NewScanner(logs)
	buf := make([]byte, logstream.ScannerBufSize)
	scanner.Buffer(buf, logstream.ScannerMaxSize)
	for scanner.Scan() {
		line.Line = strings.TrimSuffix(scanner.Text(), "\r")
		if err := line.Print(c.out); err != nil {
			return err
		}
	}
	if err := scanner.Err(); err != nil {
		if ctx.Err() != nil {
			return canceledContainerLogRead()
		}
		return fmt.Errorf("read app container logs: %w", err)
	}
	return nil
}

func canceledContainerLogRead() error {
	return nil
}

func (c *appLogsCommand) appLogDir(appID string) string {
	return c.cfg.AppLogDir(appsupport.SanitizeAppID(appID))
}

func (l appLogLine) Print(out *ui.Output) error {
	if !l.JSON {
		out.Println(l.Line)
		return nil
	}

	payload, err := json.Marshal(l)
	if err != nil {
		return fmt.Errorf("marshal app log line: %w", err)
	}
	out.Println(string(payload))
	return nil
}

func appMatchesRuntimeID(app appmanager.DiscoveredApp, id string) bool {
	if id == "" {
		return true
	}
	if appRuntimeID(app) == id {
		return true
	}
	if processID := appProcessID(app); processID > 0 && strconv.Itoa(processID) == id {
		return true
	}
	return app.ContainerID != "" && strings.HasPrefix(app.ContainerID, id)
}

func logFile(path string) (logstream.File, bool, error) {
	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return zeroLogFile(), false, nil
		}
		return zeroLogFile(), false, fmt.Errorf("stat app log: %w", err)
	}
	if info.IsDir() {
		return zeroLogFile(), false, nil
	}
	return logstream.File{
		ModTime: info.ModTime(),
		Path:    path,
		Size:    info.Size(),
	}, true, nil
}

func zeroLogFile() logstream.File {
	return logstream.File{
		ModTime: time.Time{},
		Path:    "",
		Size:    0,
	}
}

func (f appLogsTailFlag) String() string {
	if f.all != nil && *f.all {
		return appLogsTailAllValue
	}
	if f.value == nil {
		return ""
	}
	return strconv.Itoa(*f.value)
}

func (f appLogsTailFlag) Set(value string) error {
	if strings.EqualFold(value, appLogsTailAllValue) {
		*f.all = true
		*f.value = 0
		return nil
	}

	tail, err := strconv.Atoi(value)
	if err != nil {
		return fmt.Errorf("%w: %q", ErrInvalidFlagValue, value)
	}
	*f.all = false
	*f.value = tail
	return nil
}

func appLogsTailValue(flags appLogsFlags) string {
	if flags.tailAll {
		return appLogsTailAllValue
	}
	return strconv.Itoa(flags.tail)
}
