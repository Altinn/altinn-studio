package doctor

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/studioctl/internal/networking"
)

func (s *Service) buildNetwork(ctx context.Context, runChecks bool) *Network {
	var network Network

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

	client, err := container.Detect(ctx)
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
