package networking

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gopkg.in/yaml.v3"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/docker"
	"altinn.studio/studioctl/internal/osutil"
)

const (
	cacheFileName    = "network-metadata.yaml"
	cacheMaxAge      = 7 * 24 * time.Hour // 1 week
	probeContainerID = "studioctl-probe"
	probeCleanupTTL  = 5 * time.Second
	maxProbeLogBytes = 1 << 20
)

// NetworkMetadata holds cached network configuration discovered from containers.
type NetworkMetadata struct {
	HostGateway string `yaml:"hostGateway"` // IP address of host from container's perspective
	LocalDNS    string `yaml:"localDns"`    // Resolved IP for local.altinn.cloud from container
	HostDNS     string `yaml:"hostDns"`     // Resolved IP for local.altinn.cloud from host
	PingOK      bool   `yaml:"pingOk"`      // true if ping to gateway succeeded
}

// ErrInvalidProbeIP is returned when the probe returns an invalid IP address.
var (
	ErrInvalidProbeIP      = errors.New("invalid IP from probe")
	ErrProbeLogTooLarge    = errors.New("network probe logs exceeded max size")
	ErrProbeLogReadFailure = errors.New("read network probe container logs")
)

// CacheStatus represents the state of the network metadata cache.
type CacheStatus struct {
	IP      string        // cached gateway IP (empty if not cached or invalid)
	HostDNS string        // cached host DNS resolution (empty if unresolved)
	Age     time.Duration // age of cache file
	Fresh   bool          // true if cache is within maxAge
	Exists  bool          // true if cache file exists
}

// Networking provides container network diagnostics and host gateway resolution.
type Networking struct {
	client container.ContainerClient
	cfg    *config.Config
	debugf func(format string, args ...any)
}

// NewNetworking creates a new Networking instance.
func NewNetworking(
	client container.ContainerClient,
	cfg *config.Config,
	debugf func(format string, args ...any),
) *Networking {
	if debugf == nil {
		debugf = func(string, ...any) {}
	}
	return &Networking{
		client: client,
		cfg:    cfg,
		debugf: debugf,
	}
}

// GetCacheStatus returns the current cache status without modifying it.
func GetCacheStatus(configDir string) CacheStatus {
	cachePath := filepath.Join(configDir, cacheFileName)

	info, err := os.Stat(cachePath)
	if err != nil {
		return CacheStatus{IP: "", HostDNS: "", Age: 0, Fresh: false, Exists: false}
	}

	age := time.Since(info.ModTime())
	fresh := age <= cacheMaxAge

	metadata, ok := readMetadataCache(cachePath, cacheMaxAge+age) // pass large maxAge to skip age check
	if !ok {
		return CacheStatus{IP: "", HostDNS: "", Age: age, Fresh: false, Exists: true}
	}

	return CacheStatus{
		IP:      metadata.HostGateway,
		HostDNS: metadata.HostDNS,
		Age:     age,
		Fresh:   fresh,
		Exists:  true,
	}
}

// LocalDomain is the local development domain used by localtest.
const LocalDomain = "local.altinn.cloud"

// ResolveHostDNS resolves LocalDomain from the host's perspective.
// Returns the resolved IP or empty string if resolution fails.
func ResolveHostDNS(ctx context.Context) string {
	var resolver net.Resolver
	addrs, err := resolver.LookupHost(ctx, LocalDomain)
	if err != nil || len(addrs) == 0 {
		return ""
	}
	return addrs[0]
}

// networkProbeScript returns the shell script for network probing.
// Tests gateway discovery, ping connectivity, and DNS resolution.
//
// Gateway discovery strategy:
//  1. Try known host gateway DNS names (Docker, Podman, Rancher Desktop, Lima)
//  2. Verify each with ping to get the actual IP
//  3. Fall back to default route from /proc/net/route
//
// This handles macOS Podman where the default route gateway doesn't forward to host.
func networkProbeScript() string {
	return fmt.Sprintf(`
set -e

# Try known host gateway DNS names and verify with ping
try_host() {
  ip=$(ping -4 -c1 -W1 "$1" 2>/dev/null | sed -n 's/^PING [^(]*(\([0-9.]*\)).*/\1/p')
  if [ -n "$ip" ]; then echo "$ip"; return 0; fi
  return 1
}

gateway=""
for name in host.docker.internal host.containers.internal host.rancher-desktop.internal host.lima.internal; do
  if result=$(try_host "$name"); then
    gateway="$result"
    break
  fi
done

# Fall back to default route gateway from /proc/net/route
if [ -z "$gateway" ]; then
  g=$(awk '$2=="00000000" {print $3}' /proc/net/route 2>/dev/null | head -n1)
  [ -n "$g" ] && gateway=$(printf "%%d.%%d.%%d.%%d\n" 0x${g:6:2} 0x${g:4:2} 0x${g:2:2} 0x${g:0:2})
fi

echo "GATEWAY:$gateway"
if [ -n "$gateway" ] && ping -c 1 -W 2 "$gateway" >/dev/null 2>&1; then
  echo "PING:OK"
else
  echo "PING:FAIL"
fi

resolved=$(nslookup %s 2>/dev/null | awk '/^Name:/{f=1} f && /^Address/{gsub(/.*: */,""); print $1; exit}')
if [ -n "$resolved" ]; then
  echo "DNS:$resolved"
else
  echo "DNS:FAIL"
fi
`, LocalDomain)
}

// RefreshNetworkMetadata probes for all network metadata in a single container.
// Discovers host gateway IP, tests connectivity, and resolves DNS.
// Cache write errors are logged but not returned.
func (n *Networking) RefreshNetworkMetadata(ctx context.Context) (NetworkMetadata, error) {
	cachePath := filepath.Join(n.cfg.Home, cacheFileName)
	containerName := probeContainerID + "-network"

	// Clean up any existing container with the same name
	if err := n.client.ContainerRemove(ctx, containerName, true); err != nil {
		n.debugf("failed to remove existing network probe container: %v", err)
	}

	cfg := types.ContainerConfig{
		Name:          containerName,
		Image:         n.cfg.Images.Utility.Busybox.Ref(),
		Command:       []string{"sh", "-c", networkProbeScript()},
		Env:           nil,
		Ports:         nil,
		Volumes:       nil,
		ExtraHosts:    nil,
		Networks:      nil,
		RestartPolicy: "",
		Detach:        false,
		Labels:        nil,
		User:          "",
		CapAdd:        nil,
	}

	containerID, err := n.client.CreateContainer(ctx, cfg)
	if err != nil {
		return NetworkMetadata{}, fmt.Errorf("create network probe container: %w", err)
	}
	defer func(baseCtx context.Context) {
		cleanupCtx, cancel := context.WithTimeout(baseCtx, probeCleanupTTL)
		defer cancel()
		if rerr := n.client.ContainerRemove(cleanupCtx, containerID, true); rerr != nil {
			n.debugf("failed to remove network probe container: %v", rerr)
		}
	}(context.WithoutCancel(ctx))

	if startErr := n.client.ContainerStart(ctx, containerID); startErr != nil {
		return NetworkMetadata{}, fmt.Errorf("start network probe container: %w", startErr)
	}

	_, waitErr := n.client.ContainerWait(ctx, containerID)
	if waitErr != nil {
		return NetworkMetadata{}, fmt.Errorf("wait network probe container: %w", waitErr)
	}

	logs, logsErr := n.client.ContainerLogs(ctx, containerID, false, "all")
	if logsErr != nil {
		return NetworkMetadata{}, fmt.Errorf("get network probe container logs: %w", logsErr)
	}
	defer func() {
		if cerr := logs.Close(); cerr != nil {
			n.debugf("failed to close log stream: %v", cerr)
		}
	}()

	output, readErr := readAllWithLimit(logs, maxProbeLogBytes)
	if readErr != nil {
		return NetworkMetadata{}, fmt.Errorf("%w: %w", ErrProbeLogReadFailure, readErr)
	}

	metadata := parseNetworkProbeOutput(string(output))

	if net.ParseIP(metadata.HostGateway) == nil {
		return NetworkMetadata{}, fmt.Errorf("%w: %q", ErrInvalidProbeIP, metadata.HostGateway)
	}

	metadata.HostDNS = ResolveHostDNS(ctx)

	if err := writeMetadataCache(cachePath, metadata); err != nil {
		n.debugf("failed to cache network metadata: %v", err)
	}

	return metadata, nil
}

func readAllWithLimit(r io.Reader, maxBytes int64) ([]byte, error) {
	limited := &io.LimitedReader{R: r, N: maxBytes + 1}
	output, err := io.ReadAll(limited)
	if err != nil {
		return nil, fmt.Errorf("read limited stream: %w", err)
	}
	if int64(len(output)) > maxBytes {
		return nil, ErrProbeLogTooLarge
	}
	return output, nil
}

// parseNetworkProbeOutput parses the structured output from the network probe.
func parseNetworkProbeOutput(output string) NetworkMetadata {
	var metadata NetworkMetadata

	for line := range strings.SplitSeq(output, "\n") {
		line = strings.TrimSpace(line)
		// Handle docker log stream format (8 byte header per line)
		line = docker.StripMultiplexedHeader(line)

		if after, ok := strings.CutPrefix(line, "GATEWAY:"); ok {
			metadata.HostGateway = after
		} else if strings.HasPrefix(line, "PING:") {
			metadata.PingOK = line == "PING:OK"
		} else if after, ok := strings.CutPrefix(line, "DNS:"); ok {
			ip := after
			if ip != "FAIL" && net.ParseIP(ip) != nil {
				metadata.LocalDNS = ip
			}
		}
	}

	return metadata
}

// ResolveNetworkMetadata returns network metadata, using cache if fresh or probing if stale.
// Returns the metadata, whether it was from cache, and any probe error.
func (n *Networking) ResolveNetworkMetadata(ctx context.Context) (NetworkMetadata, bool, error) {
	cachePath := filepath.Join(n.cfg.Home, cacheFileName)

	if metadata, ok := readMetadataCache(cachePath, cacheMaxAge); ok {
		return metadata, true, nil
	}

	metadata, err := n.RefreshNetworkMetadata(ctx)
	return metadata, false, err
}

// readMetadataCache reads the cached metadata if it exists and is not stale.
//
//nolint:gosec // G304: path is under trusted CLI config/cache locations.
func readMetadataCache(path string, maxAge time.Duration) (NetworkMetadata, bool) {
	var zero NetworkMetadata

	info, err := os.Stat(path)
	if err != nil || time.Since(info.ModTime()) > maxAge {
		return zero, false
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return zero, false
	}

	var metadata NetworkMetadata
	if err := yaml.Unmarshal(data, &metadata); err != nil {
		return zero, false
	}

	if net.ParseIP(metadata.HostGateway) == nil {
		return zero, false
	}

	return metadata, true
}

// writeMetadataCache writes the metadata to the cache file.
func writeMetadataCache(path string, metadata NetworkMetadata) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, osutil.DirPermOwnerOnly); err != nil {
		return fmt.Errorf("create cache directory: %w", err)
	}

	data, err := yaml.Marshal(metadata)
	if err != nil {
		return fmt.Errorf("marshal metadata: %w", err)
	}

	if err := os.WriteFile(path, data, osutil.FilePermOwnerOnly); err != nil {
		return fmt.Errorf("write cache file: %w", err)
	}

	// On Windows, file mode is ignored; set ACLs explicitly
	if err := osutil.SecureFile(path); err != nil {
		return fmt.Errorf("secure cache file: %w", err)
	}

	return nil
}
