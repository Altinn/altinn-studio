// Package appcontainers contains studioctl-managed app container conventions.
package appcontainers

import (
	"context"
	"fmt"
	"strconv"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/types"
)

const (
	labelKeyManaged   = "altinn.studio/cli"
	labelValueManaged = "app"
	labelKeyAppPath   = "altinn.studio/app-path"
	// LabelFrontDoorURL is the address the localtest-v2 front door reaches a container-mode app at, on its network
	// (http://<alias>:<port>); studioctl run sets it, and studioctl-server registers the app with it.
	LabelFrontDoorURL = "altinn.studio/front-door-url"

	// DefaultContainerPort is the port app containers listen on.
	DefaultContainerPort = "5005"
)

// Candidate describes one app container endpoint suitable for studioctl-server probing.
type Candidate struct {
	ContainerID string `json:"containerId"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Source      string `json:"source"`
	// FrontDoorURL is the container's LabelFrontDoorURL: where the localtest-v2 front door reaches it; empty for a
	// container that is not on the localtest-v2 network, which the front door reaches through its published port.
	FrontDoorURL string `json:"frontDoorUrl,omitempty"`
	HostPort     int    `json:"hostPort"`
}

// Labels returns labels for a studioctl-managed app container.
func Labels(appPath string) map[string]string {
	return map[string]string{
		labelKeyManaged: labelValueManaged,
		labelKeyAppPath: appPath,
	}
}

// DiscoveryFilter returns the label filter used to find app containers.
func DiscoveryFilter() types.ContainerListFilter {
	return types.ContainerListFilter{
		Labels: map[string]string{
			labelKeyManaged: labelValueManaged,
		},
		All: false,
	}
}

// Discover lists studioctl-managed app containers and converts them to studioctl-server candidates.
func Discover(ctx context.Context, client container.ContainerClient) ([]Candidate, error) {
	containers, err := client.ListContainers(ctx, DiscoveryFilter())
	if err != nil {
		return nil, fmt.Errorf("list app containers: %w", err)
	}

	candidates := make([]Candidate, 0, len(containers))
	for _, ctr := range containers {
		candidate, ok := CandidateFromContainer(ctr)
		if ok {
			candidates = append(candidates, candidate)
		}
	}
	return candidates, nil
}

// CandidateFromContainer converts a container runtime result to a probeable endpoint.
func CandidateFromContainer(ctr types.ContainerInfo) (Candidate, bool) {
	if !ctr.State.Running {
		return zeroCandidate(), false
	}

	hostPort := publishedHostPort(ctr, DefaultContainerPort)
	if hostPort == "" {
		return zeroCandidate(), false
	}
	hostPortNumber, err := strconv.Atoi(hostPort)
	if err != nil || hostPortNumber <= 0 || hostPortNumber > 65535 {
		return zeroCandidate(), false
	}

	name := ctr.Name
	if name == "" {
		name = ctr.ID
	}
	return Candidate{
		ContainerID:  ctr.ID,
		Name:         name,
		HostPort:     hostPortNumber,
		Source:       "container",
		Description:  "container " + name,
		FrontDoorURL: ctr.Labels[LabelFrontDoorURL],
	}, true
}

func zeroCandidate() Candidate {
	return Candidate{
		ContainerID:  "",
		Name:         "",
		HostPort:     0,
		Description:  "",
		Source:       "",
		FrontDoorURL: "",
	}
}

func publishedHostPort(ctr types.ContainerInfo, containerPort string) string {
	for _, port := range ctr.Ports {
		if port.ContainerPort == containerPort && port.HostPort != "" {
			return port.HostPort
		}
	}
	return ""
}
