package containerbackend

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"maps"
	"slices"
	"strings"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"
)

const containerSpecHashLabel = "altinn.studio/devenv-spec-hash"

func resourceManagedByGraph(labels map[string]string, graphID resource.GraphID) bool {
	return labels[GraphIDLabel] == graphID.String()
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func containerInfoStatus(info types.ContainerInfo) executor.Status {
	switch {
	case info.State.Running && containerHealthReady(info.State.HealthStatus):
		return executor.StatusReady
	case info.State.Running && containerHealthFailed(info.State.HealthStatus):
		return executor.StatusFailed
	case info.State.Running:
		return executor.StatusPending
	case info.State.Status == "created":
		return executor.StatusPending
	case info.State.Status == containerStatusExited:
		return executor.StatusFailed
	default:
		return executor.StatusUnknown
	}
}

func containerReady(state types.ContainerState) bool {
	return state.Running && containerHealthReady(state.HealthStatus)
}

func containerHealthReady(status string) bool {
	return status == "" || strings.EqualFold(status, "healthy")
}

func containerHealthFailed(status string) bool {
	return strings.EqualFold(status, "unhealthy")
}

func containerReadinessError(name string, state types.ContainerState) error {
	if containerHealthFailed(state.HealthStatus) {
		return fmt.Errorf("%w: %s", errContainerUnhealthy, name)
	}
	if state.Status == containerStatusExited || state.Status == containerStatusDead {
		return fmt.Errorf("%w: %s (status %s, exit code %d)", errContainerExited, name, state.Status, state.ExitCode)
	}
	return nil
}

func progressFromContainerUpdate(update types.ProgressUpdate) executor.Progress {
	return executor.Progress{
		Message:       update.Message,
		Current:       update.Current,
		Total:         update.Total,
		Indeterminate: update.Indeterminate,
	}
}

func clonePublishedPorts(ports []types.PublishedPort) []types.PublishedPort {
	if len(ports) == 0 {
		return nil
	}

	cloned := make([]types.PublishedPort, len(ports))
	copy(cloned, ports)
	return cloned
}

// labelsMatch checks if expected labels are present in actual labels.
// Additional labels in actual are ignored.
func labelsMatch(expected, actual map[string]string) bool {
	for k, v := range expected {
		if actual[k] != v {
			return false
		}
	}
	return true
}

// networksMatch checks if desired networks match actual (order-insensitive).
func networksMatch(desired, actual []string) bool {
	if len(desired) != len(actual) {
		return false
	}
	sortedDesired := make([]string, len(desired))
	copy(sortedDesired, desired)
	slices.Sort(sortedDesired)

	sortedActual := make([]string, len(actual))
	copy(sortedActual, actual)
	slices.Sort(sortedActual)

	return slices.Equal(sortedDesired, sortedActual)
}

func normalizedContainerLabels(
	c *resource.Container,
	graphID resource.GraphID,
	imageID string,
	networks []string,
) map[string]string {
	labels := normalizedResourceLabels(c.Labels, graphID)
	labels[containerSpecHashLabel] = containerSpecHash(c, imageID, networks)
	return labels
}

func normalizedResourceLabels(labels map[string]string, graphID resource.GraphID) map[string]string {
	normalized := make(map[string]string, len(labels)+1)
	maps.Copy(normalized, labels)
	normalized[GraphIDLabel] = graphID.String()
	return normalized
}

func containerSpecHash(c *resource.Container, imageID string, networks []string) string {
	var b strings.Builder

	b.WriteString("image=")
	b.WriteString(imageID)
	b.WriteByte('\n')

	writeSortedList(&b, "networks", networks)
	writeSortedList(&b, "env", c.Env)
	writeSortedList(&b, "extraHosts", c.ExtraHosts)
	writeSortedList(&b, "networkAliases", c.NetworkAliases)

	b.WriteString("command=")
	b.WriteString(strings.Join(c.Command, "\x00"))
	b.WriteByte('\n')

	b.WriteString("user=")
	b.WriteString(c.User)
	b.WriteByte('\n')

	b.WriteString("usernsMode=")
	b.WriteString(c.UsernsMode)
	b.WriteByte('\n')

	b.WriteString("restartPolicy=")
	b.WriteString(c.RestartPolicy)
	b.WriteByte('\n')

	portEntries := make([]string, 0, len(c.Ports))
	for _, p := range c.Ports {
		portEntries = append(
			portEntries,
			fmt.Sprintf("%s|%s|%s|%s", p.HostIP, p.HostPort, p.ContainerPort, p.Protocol),
		)
	}
	writeSortedList(&b, "ports", portEntries)

	volumeEntries := make([]string, 0, len(c.Volumes))
	for _, v := range c.Volumes {
		volumeEntries = append(
			volumeEntries,
			fmt.Sprintf("%s|%s|%t|%s", v.HostPath, v.ContainerPath, v.ReadOnly, normalizedVolumeMountType(v.Type)),
		)
	}
	writeSortedList(&b, "volumes", volumeEntries)

	if c.HealthCheck != nil {
		b.WriteString("healthcheck=")
		b.WriteString(strings.Join(c.HealthCheck.Test, "\x00"))
		fmt.Fprintf(&b, "|%s|%s|%d|%s",
			c.HealthCheck.Interval, c.HealthCheck.Timeout,
			c.HealthCheck.Retries, c.HealthCheck.StartPeriod)
		b.WriteByte('\n')
	}

	sum := sha256.Sum256([]byte(b.String()))
	return hex.EncodeToString(sum[:])
}

func normalizedVolumeMountType(mountType types.VolumeMountType) types.VolumeMountType {
	if mountType == "" {
		return types.VolumeMountTypeBind
	}
	return mountType
}

func writeSortedList(b *strings.Builder, key string, values []string) {
	copied := make([]string, len(values))
	copy(copied, values)
	slices.Sort(copied)

	b.WriteString(key)
	b.WriteByte('=')
	b.WriteString(strings.Join(copied, "\x00"))
	b.WriteByte('\n')
}
