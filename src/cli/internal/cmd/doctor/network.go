package doctor

import (
	"context"
	"fmt"
	"io"
	"net"
	"slices"
	"strconv"
	"time"

	"altinn.studio/devenv/pkg/container"
	envlocaltest "altinn.studio/studioctl/internal/cmd/env/localtest"
	"altinn.studio/studioctl/internal/networking"
	"altinn.studio/studioctl/internal/ui"
)

const (
	doctorLocalhostName  = "localhost"
	localtestPort        = "5101"
	loopbackProbeTimeout = time.Second
)

func (s *Service) buildNetwork(ctx context.Context, runChecks bool) *Network {
	var network Network
	network.LocalhostAddrs, network.LocalhostError = s.resolveLocalhost(ctx)

	if !runChecks {
		status := networking.GetCacheStatus(s.cfg.Home)
		cacheExists := status.Exists
		cacheFresh := status.Fresh
		network.Mode = "cached"
		network.HostGateway = status.IP
		network.HostDNS = status.HostDNS
		network.CacheExists = &cacheExists
		network.CacheFresh = &cacheFresh
		network.CacheAge = formatDuration(status.Age)
		return &network
	}

	client, err := s.containerDetect(ctx)
	if err != nil {
		network.Mode = networkModeChecks
		network.Error = fmt.Sprintf("no container runtime: %v", err)
		return &network
	}
	defer func() {
		if cerr := client.Close(); cerr != nil {
			s.debugf("failed to close container client: %v", cerr)
		}
	}()

	if s.localtestRunning(ctx, client) {
		network.LoopbackEndpoints = s.probeLoopbackEndpoints(ctx)
	}

	n := networking.NewNetworking(client, s.cfg, s.debugf)
	metadata, err := n.RefreshNetworkMetadata(ctx)
	if err != nil {
		network.Mode = networkModeChecks
		network.Error = fmt.Sprintf("probe failed: %v", err)
		return &network
	}

	pingOK := metadata.PingOK
	network.Mode = networkModeChecks
	network.HostGateway = metadata.HostGateway
	network.HostDNS = metadata.HostDNS
	network.ContainerDNS = metadata.LocalDNS
	network.PingOK = &pingOK
	return &network
}

func (s *Service) localtestRunning(ctx context.Context, client container.ContainerClient) bool {
	env := envlocaltest.NewEnv(s.cfg, ui.NewOutput(io.Discard, io.Discard, false), client)
	status, err := env.Status(ctx)
	if err != nil {
		s.debugf("failed to get localtest status before loopback probes: %v", err)
		return false
	}
	return status.Running
}

func (s *Service) resolveLocalhost(ctx context.Context) ([]string, string) {
	if s == nil || s.lookupIP == nil {
		return nil, "resolver unavailable"
	}

	ips, err := s.lookupIP(ctx, doctorLocalhostName)
	if err != nil {
		return nil, err.Error()
	}

	if len(ips) == 0 {
		return nil, ""
	}

	addrs := make([]string, 0, len(ips))
	seen := make(map[string]struct{}, len(ips))
	for _, ip := range ips {
		if ip == nil {
			continue
		}
		addr := ip.String()
		if _, ok := seen[addr]; ok {
			continue
		}
		seen[addr] = struct{}{}
		addrs = append(addrs, addr)
	}
	slices.Sort(addrs)
	return addrs, ""
}

func (s *Service) probeLoopbackEndpoints(ctx context.Context) []LoopbackProbe {
	if s == nil || s.dialContext == nil {
		return nil
	}

	probes := []LoopbackProbe{
		{Family: "ipv4", Endpoint: net.JoinHostPort("127.0.0.1", localtestPort), Error: "", Reachable: false},
		{Family: "ipv6", Endpoint: net.JoinHostPort("::1", localtestPort), Error: "", Reachable: false},
	}

	for i := range probes {
		networkName := "tcp4"
		if probes[i].Family == "ipv6" {
			networkName = "tcp6"
		}

		probeCtx, cancel := context.WithTimeout(ctx, loopbackProbeTimeout)
		conn, err := s.dialContext(probeCtx, networkName, probes[i].Endpoint)
		cancel()
		if err != nil {
			probes[i].Error = err.Error()
			continue
		}
		probes[i].Reachable = true
		if closeErr := conn.Close(); closeErr != nil {
			probes[i].Reachable = false
			probes[i].Error = closeErr.Error()
		}
	}

	return probes
}

// formatDuration formats a duration in human-readable form.
func formatDuration(d time.Duration) string {
	if d >= hoursPerDay*time.Hour {
		days := int(d / (hoursPerDay * time.Hour))
		return strconv.Itoa(days) + "d"
	}
	if d >= time.Hour {
		hours := int(d / time.Hour)
		return strconv.Itoa(hours) + "h"
	}
	if d >= time.Minute {
		minutes := int(d / time.Minute)
		return strconv.Itoa(minutes) + "m"
	}
	return "<1m"
}
