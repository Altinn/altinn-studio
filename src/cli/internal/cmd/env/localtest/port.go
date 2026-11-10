package localtest

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"net"
	"slices"
	"strings"

	containertypes "altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
)

var (
	errPortPublished = errors.New("the environment already publishes this port")
	errPortInUse     = errors.New("the port is in use on this machine")
)

// checkPublicPort refuses a public port that one of the environment's containers also publishes on the host, which
// would keep that container from starting. The ports come from the containers env up is about to start, so they
// follow the options: the OpenTelemetry collector's only with --monitoring, for example.
func checkPublicPort(resources []resource.Resource, port string) error {
	ingressSeen := false
	var others []string
	for _, res := range resources {
		ctr, ok := res.(*resource.Container)
		if !ok || !resource.IsEnabled(ctr) {
			continue
		}
		for _, mapping := range ctr.Ports {
			if mapping.HostPort != port {
				continue
			}
			isIngress := ctr.Name == components.ContainerLocaltest &&
				mapping.ContainerPort == components.LocaltestServicePort
			if isIngress && !ingressSeen {
				ingressSeen = true
				continue
			}
			others = append(others, ctr.Name)
		}
	}
	if len(others) == 0 {
		return nil
	}
	slices.Sort(others)
	return fmt.Errorf(
		"%w: %s also publishes port %s on the host; choose another --port",
		errPortPublished,
		strings.Join(slices.Compact(others), ", "),
		port,
	)
}

// checkPortFree refuses a port that another program on this machine listens on. env up checks it before it replaces
// any container: the container runtime would only find out after removing the running localtest container, and leave
// the environment down. The port the running localtest container publishes is the environment's own, so it passes.
func (e *Env) checkPortFree(ctx context.Context, port string) error {
	info, err := e.client.ContainerInspect(ctx, components.ContainerLocaltest)
	if err == nil && info.State.Running &&
		slices.ContainsFunc(info.Ports, func(published containertypes.PublishedPort) bool {
			return published.HostPort == port
		}) {
		return nil
	}

	// Both addresses: Linux refuses a loopback bind beside a program on every address, but macOS lets one through.
	for _, host := range []string{components.PublishedHostIP, "0.0.0.0"} {
		if err := tryListen(ctx, host, port); err != nil {
			return err
		}
	}
	return nil
}

// tryListen listens on the address and closes it again. A port this user may not listen on, such as one below 1024 on
// Linux, passes: a rootful container runtime can still publish it, so the runtime decides.
func tryListen(ctx context.Context, host, port string) error {
	var listenConfig net.ListenConfig
	listener, err := listenConfig.Listen(ctx, "tcp4", net.JoinHostPort(host, port))
	if errors.Is(err, fs.ErrPermission) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("%w: port %s (%w); choose another --port", errPortInUse, port, err)
	}
	if err := listener.Close(); err != nil {
		return fmt.Errorf("release port %s after checking it: %w", port, err)
	}
	return nil
}
