package localtest

import (
	"errors"
	"fmt"
	"slices"
	"strings"

	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/studioctl/internal/cmd/env/localtest/components"
)

var errPortPublished = errors.New("the environment already publishes this port")

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
