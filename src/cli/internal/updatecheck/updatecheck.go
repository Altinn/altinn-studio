// Package updatecheck implements a passive, cached check that notifies the user
// when a newer studioctl release is available. It queries the release registry
// at most once per interval and persists the result so ordinary invocations do
// not pay any network cost.
package updatecheck

import (
	"context"
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/install"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

const (
	// EnvDisable disables the passive update check when set to a truthy value.
	EnvDisable = "STUDIOCTL_NO_UPDATE_CHECK"

	// defaultInterval is how long a cached result is trusted before the registry
	// is queried again.
	defaultInterval = 24 * time.Hour

	// defaultTimeout bounds the registry lookup so a slow or unreachable network
	// never noticeably delays the command that triggered the check.
	defaultTimeout = 3 * time.Second

	// defaultMaxPages keeps the release scan lightweight; the newest studioctl
	// release is effectively always within the most recent releases page.
	defaultMaxPages = 3
)

// versionResolver resolves the newest available studioctl release version.
type versionResolver interface {
	LatestStudioctlVersion(ctx context.Context, opts install.LatestReleaseOptions) (string, error)
}

// cache is the on-disk record of the last registry lookup.
type cache struct {
	LastCheck     time.Time `yaml:"lastCheck"`
	LatestVersion string    `yaml:"latestVersion,omitempty"`
}

// Checker performs the cached update check and prints a notice when a newer
// release is available.
type Checker struct {
	out        *ui.Output
	resolver   versionResolver
	now        func() time.Time
	isTerminal func() bool
	cachePath  string
	current    string
	interval   time.Duration
	timeout    time.Duration
	maxPages   int
}

// New builds a Checker from the resolved config and output writer.
func New(cfg *config.Config, out *ui.Output) *Checker {
	cachePath := ""
	if cfg.Home != "" {
		cachePath = cfg.UpdateCheckCachePath()
	}

	return &Checker{
		out:        out,
		resolver:   install.NewService(cfg),
		now:        time.Now,
		isTerminal: out.IsTerminal,
		cachePath:  cachePath,
		current:    cfg.Version.String(),
		interval:   defaultInterval,
		timeout:    defaultTimeout,
		maxPages:   defaultMaxPages,
	}
}

// Run performs the check and prints a notice when a newer release is available.
// It is best-effort: any failure to reach the registry or persist the cache is
// silent (surfaced only under verbose output) so it never disrupts the command
// that triggered it.
func (c *Checker) Run(ctx context.Context) {
	if !c.enabled() || ctx.Err() != nil {
		return
	}

	var current cache
	loaded, err := c.load()
	if err != nil {
		c.out.Verbosef("update check: %v", err)
	} else {
		current = loaded
	}

	if c.due(current.LastCheck) {
		current = c.refresh(ctx, current)
	}

	c.notify(current.LatestVersion)
}

// enabled reports whether the check should run in the current environment.
func (c *Checker) enabled() bool {
	switch {
	case c.cachePath == "":
		return false
	case config.IsCI():
		return false
	case config.IsTruthyEnv(os.Getenv(EnvDisable)):
		return false
	case !c.isTerminal():
		return false
	default:
		return true
	}
}

// due reports whether the cached result is stale and should be refreshed.
func (c *Checker) due(lastCheck time.Time) bool {
	return c.now().Sub(lastCheck) >= c.interval
}

// refresh queries the registry and persists the result. On failure it still
// records the attempt time (keeping the previously known version) so the check
// does not query the registry again until the next interval.
func (c *Checker) refresh(ctx context.Context, prior cache) cache {
	fetchCtx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	latest, err := c.resolver.LatestStudioctlVersion(fetchCtx, install.LatestReleaseOptions{
		Timeout:  c.timeout,
		MaxPages: c.maxPages,
	})

	updated := prior
	updated.LastCheck = c.now()
	if err != nil {
		c.out.Verbosef("update check: resolve latest version: %v", err)
	} else if latest != "" {
		updated.LatestVersion = latest
	}

	if saveErr := c.save(updated); saveErr != nil {
		c.out.Verbosef("update check: %v", saveErr)
	}
	return updated
}

// notify prints the update notice when latest is a strictly newer release.
func (c *Checker) notify(latest string) {
	if latest == "" || !install.IsNewerReleaseVersion(c.current, latest) {
		return
	}

	bin := osutil.CurrentBin()
	c.out.Warning("")
	c.out.Warninglnf("A new version of %s is available: %s -> %s", bin, c.current, latest)
	c.out.Warninglnf("Run '%s self update' to upgrade.", bin)
}

// load reads the cache file, returning a zero cache when it does not exist.
func (c *Checker) load() (cache, error) {
	var cached cache

	data, err := os.ReadFile(c.cachePath)
	if err != nil {
		if os.IsNotExist(err) {
			return cached, nil
		}
		return cached, fmt.Errorf("read update check cache: %w", err)
	}
	if err := yaml.Unmarshal(data, &cached); err != nil {
		return cached, fmt.Errorf("parse update check cache: %w", err)
	}
	return cached, nil
}

// save writes the cache file.
func (c *Checker) save(cached cache) error {
	data, err := yaml.Marshal(cached)
	if err != nil {
		return fmt.Errorf("marshal update check cache: %w", err)
	}
	if err := os.WriteFile(c.cachePath, data, osutil.FilePermDefault); err != nil {
		return fmt.Errorf("write update check cache: %w", err)
	}
	return nil
}
