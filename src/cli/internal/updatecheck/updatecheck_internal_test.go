package updatecheck

import (
	"bytes"
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"gopkg.in/yaml.v3"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/install"
	"altinn.studio/studioctl/internal/ui"
)

var errFakeNetwork = errors.New("network down")

type fakeResolver struct {
	err     error
	version string
	calls   int
}

func (f *fakeResolver) LatestStudioctlVersion(
	_ context.Context,
	_ install.LatestReleaseOptions,
) (string, error) {
	f.calls++
	return f.version, f.err
}

// enableEnv neutralizes ambient environment that would otherwise disable the
// check (CI markers, an opt-out, or terminal color affecting output assertions).
func enableEnv(t *testing.T) {
	t.Helper()
	t.Setenv(config.EnvCI, "")
	t.Setenv(EnvDisable, "")
	t.Setenv("NO_COLOR", "1")
}

func newTestChecker(t *testing.T, resolver versionResolver, current string, now time.Time) (*Checker, *bytes.Buffer) {
	t.Helper()
	var errBuf bytes.Buffer
	checker := &Checker{
		out:        ui.NewOutput(io.Discard, &errBuf, false),
		resolver:   resolver,
		now:        func() time.Time { return now },
		isTerminal: func() bool { return true },
		cachePath:  filepath.Join(t.TempDir(), "update-check.yaml"),
		current:    current,
		interval:   defaultInterval,
		timeout:    defaultTimeout,
		maxPages:   defaultMaxPages,
	}
	return checker, &errBuf
}

func writeCache(t *testing.T, path string, cached cache) {
	t.Helper()
	data, err := yaml.Marshal(cached)
	if err != nil {
		t.Fatalf("marshal cache: %v", err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatalf("write cache: %v", err)
	}
}

func readCache(t *testing.T, path string) cache {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read cache: %v", err)
	}
	var cached cache
	if err := yaml.Unmarshal(data, &cached); err != nil {
		t.Fatalf("unmarshal cache: %v", err)
	}
	return cached
}

func TestRun_StaleCacheNotifiesAndPersists(t *testing.T) {
	enableEnv(t)
	now := time.Date(2026, 7, 3, 12, 0, 0, 0, time.UTC)
	resolver := &fakeResolver{version: "v0.2.0"}
	checker, errBuf := newTestChecker(t, resolver, "v0.1.0", now)

	checker.Run(context.Background())

	if resolver.calls != 1 {
		t.Fatalf("resolver calls = %d, want 1", resolver.calls)
	}
	out := errBuf.String()
	if !strings.Contains(out, "v0.2.0") || !strings.Contains(out, "self update") {
		t.Fatalf("notice missing expected content: %q", out)
	}

	saved := readCache(t, checker.cachePath)
	if saved.LatestVersion != "v0.2.0" {
		t.Fatalf("saved LatestVersion = %q, want v0.2.0", saved.LatestVersion)
	}
	if !saved.LastCheck.Equal(now) {
		t.Fatalf("saved LastCheck = %v, want %v", saved.LastCheck, now)
	}
}

func TestRun_FreshCacheSkipsNetwork(t *testing.T) {
	enableEnv(t)
	now := time.Date(2026, 7, 3, 12, 0, 0, 0, time.UTC)
	resolver := &fakeResolver{version: "v9.9.9"}
	checker, errBuf := newTestChecker(t, resolver, "v0.1.0", now)
	writeCache(t, checker.cachePath, cache{LastCheck: now.Add(-time.Hour), LatestVersion: "v0.2.0"})

	checker.Run(context.Background())

	if resolver.calls != 0 {
		t.Fatalf("resolver calls = %d, want 0 (cache still fresh)", resolver.calls)
	}
	if out := errBuf.String(); !strings.Contains(out, "v0.2.0") {
		t.Fatalf("expected notice for cached version, got %q", out)
	}
}

func TestRun_FreshCacheSameVersionNoNotice(t *testing.T) {
	enableEnv(t)
	now := time.Date(2026, 7, 3, 12, 0, 0, 0, time.UTC)
	resolver := &fakeResolver{}
	checker, errBuf := newTestChecker(t, resolver, "v0.2.0", now)
	writeCache(t, checker.cachePath, cache{LastCheck: now.Add(-time.Hour), LatestVersion: "v0.2.0"})

	checker.Run(context.Background())

	if resolver.calls != 0 {
		t.Fatalf("resolver calls = %d, want 0", resolver.calls)
	}
	if out := errBuf.String(); out != "" {
		t.Fatalf("expected no notice, got %q", out)
	}
}

func TestRun_ResolverErrorKeepsPriorVersion(t *testing.T) {
	enableEnv(t)
	now := time.Date(2026, 7, 3, 12, 0, 0, 0, time.UTC)
	resolver := &fakeResolver{err: errFakeNetwork}
	checker, errBuf := newTestChecker(t, resolver, "v0.1.0", now)
	writeCache(t, checker.cachePath, cache{LastCheck: now.Add(-48 * time.Hour), LatestVersion: "v0.2.0"})

	checker.Run(context.Background())

	if resolver.calls != 1 {
		t.Fatalf("resolver calls = %d, want 1", resolver.calls)
	}
	if out := errBuf.String(); !strings.Contains(out, "v0.2.0") {
		t.Fatalf("expected notice using prior version, got %q", out)
	}
	saved := readCache(t, checker.cachePath)
	if saved.LatestVersion != "v0.2.0" {
		t.Fatalf("saved LatestVersion = %q, want prior v0.2.0 preserved", saved.LatestVersion)
	}
	if !saved.LastCheck.Equal(now) {
		t.Fatalf("saved LastCheck = %v, want bumped to %v", saved.LastCheck, now)
	}
}

func TestRun_Disabled(t *testing.T) {
	now := time.Date(2026, 7, 3, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		prepare func(t *testing.T, c *Checker)
		name    string
	}{
		{
			name: "opt-out env",
			prepare: func(t *testing.T, _ *Checker) {
				t.Helper()
				t.Setenv(config.EnvCI, "")
				t.Setenv(EnvDisable, "1")
			},
		},
		{
			name: "ci",
			prepare: func(t *testing.T, _ *Checker) {
				t.Helper()
				t.Setenv(EnvDisable, "")
				t.Setenv(config.EnvCI, "true")
			},
		},
		{
			name: "not a terminal",
			prepare: func(t *testing.T, c *Checker) {
				t.Helper()
				t.Setenv(config.EnvCI, "")
				t.Setenv(EnvDisable, "")
				c.isTerminal = func() bool { return false }
			},
		},
		{
			name: "no cache path",
			prepare: func(t *testing.T, c *Checker) {
				t.Helper()
				t.Setenv(config.EnvCI, "")
				t.Setenv(EnvDisable, "")
				c.cachePath = ""
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			resolver := &fakeResolver{version: "v0.2.0"}
			checker, errBuf := newTestChecker(t, resolver, "v0.1.0", now)
			tc.prepare(t, checker)

			checker.Run(context.Background())

			if resolver.calls != 0 {
				t.Fatalf("resolver calls = %d, want 0", resolver.calls)
			}
			if out := errBuf.String(); out != "" {
				t.Fatalf("expected no notice, got %q", out)
			}
		})
	}
}

func TestRun_CancelledContext(t *testing.T) {
	enableEnv(t)
	now := time.Date(2026, 7, 3, 12, 0, 0, 0, time.UTC)
	resolver := &fakeResolver{version: "v0.2.0"}
	checker, errBuf := newTestChecker(t, resolver, "v0.1.0", now)

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	checker.Run(ctx)

	if resolver.calls != 0 {
		t.Fatalf("resolver calls = %d, want 0", resolver.calls)
	}
	if out := errBuf.String(); out != "" {
		t.Fatalf("expected no notice, got %q", out)
	}
}

func TestNew_EmptyHomeDisablesCache(t *testing.T) {
	t.Parallel()
	cfg := &config.Config{Version: config.NewVersion("studioctl/v0.1.0")}
	checker := New(cfg, ui.NewOutput(io.Discard, io.Discard, false))
	if checker.cachePath != "" {
		t.Fatalf("cachePath = %q, want empty for unset home", checker.cachePath)
	}
	if checker.enabled() {
		t.Fatalf("expected checker to be disabled with empty cache path")
	}
}

func TestNew_UsesConfigCachePath(t *testing.T) {
	t.Parallel()
	cfg := &config.Config{
		Home:    filepath.Join("some", "home"),
		Version: config.NewVersion("studioctl/v0.1.0"),
	}
	checker := New(cfg, ui.NewOutput(io.Discard, io.Discard, false))
	if want := cfg.UpdateCheckCachePath(); checker.cachePath != want {
		t.Fatalf("cachePath = %q, want %q", checker.cachePath, want)
	}
}
