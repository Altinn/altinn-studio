package cmd

import (
	"context"
	"fmt"
	"net/url"
	"sort"
	"strconv"
	"strings"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/studioctlserver"
)

type studioctlServerClient interface {
	Status(ctx context.Context) (*studioctlserver.Status, error)
	UnregisterApp(ctx context.Context, appID string) error
	UpgradeApp(ctx context.Context, upgrade studioctlserver.AppUpgrade) (studioctlserver.AppUpgradeResult, error)
}

type studioctlServerAccess struct {
	cfg           *config.Config
	client        studioctlServerClient
	ensureStarted ensureStartedFunc
}

const shortContainerIDLength = 12

func newStudioctlServerAccess(cfg *config.Config) studioctlServerAccess {
	return studioctlServerAccess{
		cfg:           cfg,
		client:        studioctlserver.NewClient(cfg),
		ensureStarted: studioctlserver.EnsureStarted,
	}
}

func (a studioctlServerAccess) ensure(ctx context.Context) error {
	if a.ensureStarted == nil {
		return nil
	}
	if a.cfg == nil {
		return errStudioctlConfigRequired
	}
	topology := envtopology.NewLocal(envtopology.DefaultIngressPortString())
	return a.ensureStarted(ctx, a.cfg, topology.IngressPort())
}

func filterApps(apps []studioctlserver.DiscoveredApp, appID string, managedOnly bool) []studioctlserver.DiscoveredApp {
	filtered := make([]studioctlserver.DiscoveredApp, 0, len(apps))
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

func sortDiscoveredApps(apps []studioctlserver.DiscoveredApp) []studioctlserver.DiscoveredApp {
	sort.Slice(apps, func(i, j int) bool {
		if apps[i].AppID != apps[j].AppID {
			return apps[i].AppID < apps[j].AppID
		}
		return apps[i].BaseURL < apps[j].BaseURL
	})
	return apps
}

func hasStopHandle(app studioctlserver.DiscoveredApp) bool {
	return appProcessID(app) > 0 || app.ContainerID != "" || app.Name != ""
}

func appMode(app studioctlserver.DiscoveredApp) string {
	if appHasContainerHandle(app) {
		return runModeContainer
	}
	if appProcessID(app) > 0 {
		return runModeProcess
	}
	return app.Source
}

func appStopMode(app studioctlserver.DiscoveredApp) string {
	if appHasContainerHandle(app) {
		return runModeContainer
	}
	if appProcessID(app) > 0 {
		return runModeProcess
	}
	return app.Source
}

func appHasContainerHandle(app studioctlserver.DiscoveredApp) bool {
	return app.ContainerID != "" || (app.Name != "" && appProcessID(app) == 0)
}

func appProcessID(app studioctlserver.DiscoveredApp) int {
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

func appRuntimeID(app studioctlserver.DiscoveredApp) string {
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

func appPortNumber(app studioctlserver.DiscoveredApp) int {
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

func startStudioctlServerError(err error) error {
	return fmt.Errorf("start studioctl-server: %w", err)
}
