package cmd

import (
	"context"
	"fmt"
	"net/url"
	"sort"
	"strconv"
	"strings"

	"altinn.studio/studioctl/internal/appmanager"
	envlocaltest "altinn.studio/studioctl/internal/cmd/env/localtest"
	"altinn.studio/studioctl/internal/config"
)

type appRuntimeClient interface {
	Status(ctx context.Context) (*appmanager.Status, error)
	UnregisterApp(ctx context.Context, appID string) error
}

type appManagerAccess struct {
	cfg           *config.Config
	client        appRuntimeClient
	ensureStarted ensureStartedFunc
}

const shortContainerIDLength = 12

func newAppManagerAccess(cfg *config.Config) appManagerAccess {
	return appManagerAccess{
		cfg:           cfg,
		client:        appmanager.NewClient(cfg),
		ensureStarted: appmanager.EnsureStarted,
	}
}

func (a appManagerAccess) ensure(ctx context.Context) error {
	if a.ensureStarted == nil {
		return nil
	}
	if a.cfg == nil {
		return errStudioctlConfigRequired
	}
	return a.ensureStarted(ctx, a.cfg, envlocaltest.DefaultLoadBalancerPortString())
}

func filterApps(apps []appmanager.DiscoveredApp, appID string, managedOnly bool) []appmanager.DiscoveredApp {
	filtered := make([]appmanager.DiscoveredApp, 0, len(apps))
	for _, app := range apps {
		if appID != "" && !strings.EqualFold(app.AppID, appID) {
			continue
		}
		if managedOnly && !hasStopHandle(app) {
			continue
		}
		filtered = append(filtered, app)
	}
	return filtered
}

func sortDiscoveredApps(apps []appmanager.DiscoveredApp) []appmanager.DiscoveredApp {
	sort.Slice(apps, func(i, j int) bool {
		if apps[i].AppID != apps[j].AppID {
			return apps[i].AppID < apps[j].AppID
		}
		return apps[i].BaseURL < apps[j].BaseURL
	})
	return apps
}

func hasStopHandle(app appmanager.DiscoveredApp) bool {
	return appProcessID(app) > 0 || app.ContainerID != "" || app.Name != ""
}

func appMode(app appmanager.DiscoveredApp) string {
	if appHasContainerHandle(app) {
		return runModeContainer
	}
	if appProcessID(app) > 0 {
		return runModeProcess
	}
	return app.Source
}

func appStopMode(app appmanager.DiscoveredApp) string {
	if appHasContainerHandle(app) {
		return runModeContainer
	}
	if appProcessID(app) > 0 {
		return runModeProcess
	}
	return app.Source
}

func appHasContainerHandle(app appmanager.DiscoveredApp) bool {
	return app.ContainerID != "" || (app.Name != "" && appProcessID(app) == 0)
}

func appProcessID(app appmanager.DiscoveredApp) int {
	if app.ProcessID != nil {
		return *app.ProcessID
	}
	return 0
}

func pidString(pid int) string {
	if pid <= 0 {
		return "-"
	}
	return strconv.Itoa(pid)
}

func appRuntimeID(app appmanager.DiscoveredApp) string {
	if app.ContainerID != "" {
		return shortContainerID(app.ContainerID)
	}
	return pidString(appProcessID(app))
}

func shortContainerID(containerID string) string {
	if len(containerID) <= shortContainerIDLength {
		return containerID
	}
	return containerID[:shortContainerIDLength]
}

func appPortNumber(app appmanager.DiscoveredApp) int {
	if app.HostPort != nil && *app.HostPort > 0 {
		return *app.HostPort
	}
	if app.BaseURL != "" {
		baseURL, err := url.Parse(app.BaseURL)
		if err == nil && baseURL.Port() != "" {
			port, parseErr := strconv.Atoi(baseURL.Port())
			if parseErr == nil {
				return port
			}
		}
	}
	return 0
}

func startAppManagerError(err error) error {
	return fmt.Errorf("start app-manager: %w", err)
}
