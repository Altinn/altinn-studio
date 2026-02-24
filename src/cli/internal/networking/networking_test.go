//nolint:testpackage // testing unexported functions requires same package
package networking

import (
	"context"
	"errors"
	"net"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
)

const osWindows = "windows"

func testVerbosef(string, ...any) {}

// testConfig creates a minimal config for testing with the given home directory.
func testConfig(homeDir string) *config.Config {
	return &config.Config{
		Home: homeDir,
		Images: config.ImagesConfig{
			Utility: config.UtilityImages{
				Busybox: config.ImageSpec{
					Image: "busybox",
					Tag:   "stable",
				},
			},
		},
	}
}

func TestReadMetadataCache(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		content     string
		wantGateway string
		wantDNS     string
		age         time.Duration
		maxAge      time.Duration
		wantPingOK  bool
		wantFound   bool
	}{
		{
			name:        "valid fresh cache",
			content:     "hostGateway: 172.17.0.1\nlocalDns: 127.0.0.1\npingOk: true\n",
			age:         time.Hour,
			maxAge:      24 * time.Hour,
			wantGateway: "172.17.0.1",
			wantDNS:     "127.0.0.1",
			wantPingOK:  true,
			wantFound:   true,
		},
		{
			name:        "stale cache",
			content:     "hostGateway: 172.17.0.1\nlocalDns: 127.0.0.1\npingOk: true\n",
			age:         48 * time.Hour,
			maxAge:      24 * time.Hour,
			wantGateway: "",
			wantDNS:     "",
			wantPingOK:  false,
			wantFound:   false,
		},
		{
			name:        "invalid gateway IP",
			content:     "hostGateway: not-an-ip\nlocalDns: 127.0.0.1\npingOk: true\n",
			age:         time.Hour,
			maxAge:      24 * time.Hour,
			wantGateway: "",
			wantDNS:     "",
			wantPingOK:  false,
			wantFound:   false,
		},
		{
			name:        "empty file",
			content:     "",
			age:         time.Hour,
			maxAge:      24 * time.Hour,
			wantGateway: "",
			wantDNS:     "",
			wantPingOK:  false,
			wantFound:   false,
		},
		{
			name:        "ping failed",
			content:     "hostGateway: 172.17.0.1\nlocalDns: 127.0.0.1\npingOk: false\n",
			age:         time.Hour,
			maxAge:      24 * time.Hour,
			wantGateway: "172.17.0.1",
			wantDNS:     "127.0.0.1",
			wantPingOK:  false,
			wantFound:   true,
		},
		{
			name:        "no dns",
			content:     "hostGateway: 172.17.0.1\nlocalDns: \"\"\npingOk: true\n",
			age:         time.Hour,
			maxAge:      24 * time.Hour,
			wantGateway: "172.17.0.1",
			wantDNS:     "",
			wantPingOK:  true,
			wantFound:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			tmpDir := t.TempDir()
			cachePath := filepath.Join(tmpDir, "test-cache.yaml")

			if err := os.WriteFile(cachePath, []byte(tt.content), osutil.FilePermOwnerOnly); err != nil {
				t.Fatalf("failed to write test file: %v", err)
			}

			// Adjust mtime to simulate age
			mtime := time.Now().Add(-tt.age)
			if err := os.Chtimes(cachePath, mtime, mtime); err != nil {
				t.Fatalf("failed to set file mtime: %v", err)
			}

			got, gotFound := readMetadataCache(cachePath, tt.maxAge)

			if gotFound != tt.wantFound {
				t.Errorf("readMetadataCache() found = %v, want %v", gotFound, tt.wantFound)
			}
			if got.HostGateway != tt.wantGateway {
				t.Errorf("readMetadataCache() HostGateway = %q, want %q", got.HostGateway, tt.wantGateway)
			}
			if got.LocalDNS != tt.wantDNS {
				t.Errorf("readMetadataCache() LocalDNS = %q, want %q", got.LocalDNS, tt.wantDNS)
			}
			if got.PingOK != tt.wantPingOK {
				t.Errorf("readMetadataCache() PingOK = %v, want %v", got.PingOK, tt.wantPingOK)
			}
		})
	}
}

func TestReadMetadataCache_NonExistent(t *testing.T) {
	t.Parallel()

	tmpDir := t.TempDir()
	cachePath := filepath.Join(tmpDir, "nonexistent.yaml")

	got, gotFound := readMetadataCache(cachePath, 24*time.Hour)

	if gotFound {
		t.Error("readMetadataCache() found = true, want false")
	}
	if got.HostGateway != "" {
		t.Errorf("readMetadataCache() HostGateway = %q, want empty", got.HostGateway)
	}
}

func TestWriteMetadataCache(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		metadata NetworkMetadata
		wantErr  bool
	}{
		{
			name: "valid metadata",
			metadata: NetworkMetadata{
				HostGateway: "172.17.0.1",
				LocalDNS:    "127.0.0.1",
				PingOK:      true,
			},
			wantErr: false,
		},
		{
			name: "no dns",
			metadata: NetworkMetadata{
				HostGateway: "172.17.0.1",
				LocalDNS:    "",
				PingOK:      false,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			tmpDir := t.TempDir()
			cachePath := filepath.Join(tmpDir, "subdir", "cache.yaml")

			err := writeMetadataCache(cachePath, tt.metadata)

			if (err != nil) != tt.wantErr {
				t.Errorf("writeMetadataCache() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr {
				return
			}

			// Verify file can be read back
			data, err := os.ReadFile(cachePath)
			if err != nil {
				t.Fatalf("failed to read cache file: %v", err)
			}

			// Check it contains expected fields
			content := string(data)
			if !strings.Contains(content, "hostGateway:") {
				t.Error("cache file missing hostGateway field")
			}
			if !strings.Contains(content, "localDns:") {
				t.Error("cache file missing localDns field")
			}
			if !strings.Contains(content, "pingOk:") {
				t.Error("cache file missing pingOk field")
			}

			// Verify file permissions - Unix only
			// On Windows, permissions are enforced via ACLs, not Unix mode bits
			if runtime.GOOS != osWindows {
				info, err := os.Stat(cachePath)
				if err != nil {
					t.Fatalf("failed to stat cache file: %v", err)
				}
				if modePerm := info.Mode().Perm(); modePerm != osutil.FilePermOwnerOnly {
					t.Errorf("cache file permissions = %o, want 600", modePerm)
				}
			}
		})
	}
}

func TestParseNetworkProbeOutput(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		output      string
		wantGateway string
		wantDNS     string
		wantPingOK  bool
	}{
		{
			name:        "all succeed",
			output:      "GATEWAY:172.17.0.1\nPING:OK\nDNS:127.0.0.1\n",
			wantGateway: "172.17.0.1",
			wantPingOK:  true,
			wantDNS:     "127.0.0.1",
		},
		{
			name:        "ping fails",
			output:      "GATEWAY:172.17.0.1\nPING:FAIL\nDNS:127.0.0.1\n",
			wantGateway: "172.17.0.1",
			wantPingOK:  false,
			wantDNS:     "127.0.0.1",
		},
		{
			name:        "dns fails",
			output:      "GATEWAY:172.17.0.1\nPING:OK\nDNS:FAIL\n",
			wantGateway: "172.17.0.1",
			wantPingOK:  true,
			wantDNS:     "",
		},
		{
			name:        "all fail",
			output:      "GATEWAY:\nPING:FAIL\nDNS:FAIL\n",
			wantGateway: "",
			wantPingOK:  false,
			wantDNS:     "",
		},
		{
			name:        "empty output",
			output:      "",
			wantGateway: "",
			wantPingOK:  false,
			wantDNS:     "",
		},
		{
			name:        "ipv6 dns",
			output:      "GATEWAY:172.17.0.1\nPING:OK\nDNS:2607:f8b0:4004:800::200e\n",
			wantGateway: "172.17.0.1",
			wantPingOK:  true,
			wantDNS:     "2607:f8b0:4004:800::200e",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			result := parseNetworkProbeOutput(tt.output)

			if result.HostGateway != tt.wantGateway {
				t.Errorf("parseNetworkProbeOutput() HostGateway = %q, want %q", result.HostGateway, tt.wantGateway)
			}
			if result.PingOK != tt.wantPingOK {
				t.Errorf("parseNetworkProbeOutput() PingOK = %v, want %v", result.PingOK, tt.wantPingOK)
			}
			if result.LocalDNS != tt.wantDNS {
				t.Errorf("parseNetworkProbeOutput() LocalDNS = %q, want %q", result.LocalDNS, tt.wantDNS)
			}
		})
	}
}

func TestReadAllWithLimit(t *testing.T) {
	t.Parallel()

	t.Run("within limit", func(t *testing.T) {
		t.Parallel()
		got, err := readAllWithLimit(strings.NewReader("abc"), 3)
		if err != nil {
			t.Fatalf("readAllWithLimit() error = %v", err)
		}
		if string(got) != "abc" {
			t.Fatalf("readAllWithLimit() = %q, want %q", string(got), "abc")
		}
	})

	t.Run("exceeds limit", func(t *testing.T) {
		t.Parallel()
		_, err := readAllWithLimit(strings.NewReader("abcd"), 3)
		if !errors.Is(err, ErrProbeLogTooLarge) {
			t.Fatalf("error = %v, want ErrProbeLogTooLarge", err)
		}
	})
}

func TestResolveNetworkMetadata_Integration(t *testing.T) {
	if runtime.GOOS == osWindows {
		t.Skip("skipping integration test: busybox image requires Linux containers")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	// Skip if no container runtime available
	client, err := container.Detect(ctx)
	if err != nil {
		t.Skip("skipping integration test: no container runtime available")
	}
	defer func() {
		if cerr := client.Close(); cerr != nil {
			t.Logf("failed to close client: %v", cerr)
		}
	}()

	tmpDir := t.TempDir()
	cfg := testConfig(tmpDir)
	n := NewNetworking(client, cfg, testVerbosef)

	// First call should probe (not cached)
	metadata1, cached1, err := n.ResolveNetworkMetadata(ctx)
	if err != nil {
		t.Fatalf("ResolveNetworkMetadata() error = %v", err)
	}
	if cached1 {
		t.Error("ResolveNetworkMetadata() first call cached = true, want false")
	}

	if net.ParseIP(metadata1.HostGateway) == nil {
		t.Errorf("ResolveNetworkMetadata() returned invalid HostGateway: %q", metadata1.HostGateway)
	}

	// Verify cache file was written
	cachePath := filepath.Join(tmpDir, cacheFileName)
	if _, statErr := os.Stat(cachePath); statErr != nil {
		t.Errorf("cache file not created: %v", statErr)
	}

	// Second call should use cache (much faster)
	start := time.Now()
	metadata2, cached2, err := n.ResolveNetworkMetadata(ctx)
	elapsed := time.Since(start)

	if err != nil {
		t.Fatalf("ResolveNetworkMetadata() second call error = %v", err)
	}
	if !cached2 {
		t.Error("ResolveNetworkMetadata() second call cached = false, want true")
	}

	if metadata1.HostGateway != metadata2.HostGateway {
		t.Errorf(
			"ResolveNetworkMetadata() inconsistent: first=%q, second=%q",
			metadata1.HostGateway,
			metadata2.HostGateway,
		)
	}

	// Cached call should be very fast (no container startup)
	if elapsed > 100*time.Millisecond {
		t.Logf("warning: cached call took %v (expected <100ms)", elapsed)
	}

	t.Logf("ResolveNetworkMetadata() returned: HostGateway=%s, LocalDNS=%s, PingOK=%v (cached call took %v)",
		metadata2.HostGateway, metadata2.LocalDNS, metadata2.PingOK, elapsed)
}

func TestRefreshNetworkMetadata_Integration(t *testing.T) {
	if runtime.GOOS == osWindows {
		t.Skip("skipping integration test: busybox image requires Linux containers")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Skip if no container runtime available
	client, err := container.Detect(ctx)
	if err != nil {
		t.Skip("skipping integration test: no container runtime available")
	}
	defer func() {
		if cerr := client.Close(); cerr != nil {
			t.Logf("failed to close client: %v", cerr)
		}
	}()

	tmpDir := t.TempDir()
	cfg := testConfig(tmpDir)
	n := NewNetworking(client, cfg, testVerbosef)
	metadata, err := n.RefreshNetworkMetadata(ctx)
	if err != nil {
		t.Fatalf("RefreshNetworkMetadata() error = %v", err)
	}

	// Verify we got a valid gateway IP
	if net.ParseIP(metadata.HostGateway) == nil {
		t.Errorf("RefreshNetworkMetadata() returned invalid HostGateway: %q", metadata.HostGateway)
	}

	t.Logf("RefreshNetworkMetadata() returned: HostGateway=%s, LocalDNS=%s, PingOK=%v",
		metadata.HostGateway, metadata.LocalDNS, metadata.PingOK)
}

func TestGetCacheStatus(t *testing.T) {
	t.Parallel()

	t.Run("no cache file", func(t *testing.T) {
		t.Parallel()
		tmpDir := t.TempDir()
		status := GetCacheStatus(tmpDir)
		if status.Exists {
			t.Error("GetCacheStatus() Exists = true, want false")
		}
	})

	t.Run("valid cache", func(t *testing.T) {
		t.Parallel()
		tmpDir := t.TempDir()
		cachePath := filepath.Join(tmpDir, cacheFileName)

		content := "hostGateway: 172.17.0.1\nlocalDns: 127.0.0.1\npingOk: true\n"
		if err := os.WriteFile(cachePath, []byte(content), osutil.FilePermOwnerOnly); err != nil {
			t.Fatalf("failed to write cache: %v", err)
		}

		status := GetCacheStatus(tmpDir)
		if !status.Exists {
			t.Error("GetCacheStatus() Exists = false, want true")
		}
		if status.IP != "172.17.0.1" {
			t.Errorf("GetCacheStatus() IP = %q, want 172.17.0.1", status.IP)
		}
		if !status.Fresh {
			t.Error("GetCacheStatus() Fresh = false, want true")
		}
	})
}
