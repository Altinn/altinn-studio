package localtest

import (
	"context"
	"errors"
	"fmt"
	"net"
	"runtime"
	"slices"
	"strings"

	containertypes "altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
)

// minPublicPort is the lowest port localtest can serve the environment on: it listens on the port inside its container
// too, so that the environment's containers reach it at the public URL, as a user that may not use lower ports.
const minPublicPort = 1024

var (
	errPortPublished  = errors.New("the environment already publishes this port")
	errPortInUse      = errors.New("the port is in use on this machine")
	errPortOutOfRange = errors.New("must be between 1024 and 65535")
)

// ValidatePublicPort refuses a port localtest can't serve the environment on.
func ValidatePublicPort(port int, field string) error {
	if port < minPublicPort || port > 65535 {
		return fmt.Errorf("%s: %w: localtest listens on the port inside its container too, as a user that may not "+
			"use lower ports", field, errPortOutOfRange)
	}
	return nil
}

// checkPort refuses a public port env up can't serve the environment on.
func (e *Env) checkPort(ctx context.Context, resources []resource.Resource, port string) error {
	if err := checkPublicPort(resources, port); err != nil {
		return err
	}
	return e.checkPortFree(ctx, port)
}

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
		"%w: %s also publishes port %s on the host",
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

	for _, host := range listenCheckHosts() {
		if err := tryListen(ctx, host, port); err != nil {
			return err
		}
	}
	return nil
}

// listenCheckHosts are the addresses checkPortFree listens on. The environment publishes on loopback only. Linux
// refuses a loopback bind beside a program on every address, so loopback alone answers there: a bind on every address
// would also refuse a program on another one. BSD sockets let that loopback bind through when it sets SO_REUSEADDR,
// as Go does on macOS, so other systems try both.
func listenCheckHosts() []string {
	if runtime.GOOS == "linux" {
		return []string{components.PublishedHostIP}
	}
	return []string{components.PublishedHostIP, "0.0.0.0"}
}

// tryListen listens on the address and closes it again.
func tryListen(ctx context.Context, host, port string) error {
	var listenConfig net.ListenConfig
	listener, err := listenConfig.Listen(ctx, "tcp4", net.JoinHostPort(host, port))
	if err != nil {
		return fmt.Errorf("%w: port %s (%w)", errPortInUse, port, err)
	}
	if err := listener.Close(); err != nil {
		return fmt.Errorf("release port %s after checking it: %w", port, err)
	}
	return nil
}
