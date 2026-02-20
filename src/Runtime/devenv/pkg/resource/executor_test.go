package resource

import (
	"context"
	"errors"
	"strings"
	"testing"

	containermock "altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
)

func TestNormalizedContainerLabels_DoesNotMutateInput(t *testing.T) {
	t.Parallel()

	container := &Container{
		Name:   "localtest",
		Image:  RefID("image:localtest"),
		Labels: map[string]string{"altinn.studio/cli": "localtest"},
	}

	labels := normalizedContainerLabels(container, "sha256:image", []string{"net-a"})

	if labels[containerSpecHashLabel] == "" {
		t.Fatalf("missing %q label", containerSpecHashLabel)
	}

	if _, exists := container.Labels[containerSpecHashLabel]; exists {
		t.Fatalf("input labels were mutated with %q", containerSpecHashLabel)
	}
}

func TestContainerSpecHash_ChangesOnConfigChange(t *testing.T) {
	t.Parallel()

	base := &Container{
		Name:          "localtest",
		Image:         RefID("image:localtest"),
		Env:           []string{"A=1", "B=2"},
		Ports:         []types.PortMapping{{HostPort: "8000", ContainerPort: "5101"}},
		Volumes:       []types.VolumeMount{{HostPath: "/tmp/a", ContainerPath: "/a"}},
		Command:       []string{"dotnet", "LocalTest.dll"},
		ExtraHosts:    []string{"host.docker.internal:172.17.0.1"},
		RestartPolicy: "always",
		User:          "1000:1000",
	}

	baseHash := containerSpecHash(base, "sha256:image-v1", []string{"bridge"})

	modified := *base
	modified.Ports = []types.PortMapping{{HostPort: "8001", ContainerPort: "5101"}}
	modifiedHash := containerSpecHash(&modified, "sha256:image-v1", []string{"bridge"})

	if baseHash == modifiedHash {
		t.Fatalf("container spec hash did not change when ports changed")
	}
}

func TestContainerSpecHash_IgnoresSliceOrderForSetLikeFields(t *testing.T) {
	t.Parallel()

	left := &Container{
		Name:          "localtest",
		Image:         RefID("image:localtest"),
		Env:           []string{"B=2", "A=1"},
		ExtraHosts:    []string{"h2:2.2.2.2", "h1:1.1.1.1"},
		RestartPolicy: "always",
	}

	right := &Container{
		Name:          "localtest",
		Image:         RefID("image:localtest"),
		Env:           []string{"A=1", "B=2"},
		ExtraHosts:    []string{"h1:1.1.1.1", "h2:2.2.2.2"},
		RestartPolicy: "always",
	}

	leftHash := containerSpecHash(left, "sha256:image-v1", []string{"b", "a"})
	rightHash := containerSpecHash(right, "sha256:image-v1", []string{"a", "b"})

	if leftHash != rightHash {
		t.Fatalf("container spec hash changed for equivalent set-like fields")
	}
}

func TestExecutor_StopAndRemoveContainer_PropagatesStopError(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	client.ContainerStopFunc = func(context.Context, string, *int) error {
		return errors.New("daemon unavailable")
	}
	removeCalled := false
	client.ContainerRemoveFunc = func(context.Context, string, bool) error {
		removeCalled = true
		return nil
	}

	exec := NewExecutor(client)
	err := exec.stopAndRemoveContainer(t.Context(), "test")
	if err == nil {
		t.Fatal("stopAndRemoveContainer() expected error, got nil")
	}
	if !strings.Contains(err.Error(), "stop container test") {
		t.Fatalf("stopAndRemoveContainer() error = %v, want stop error context", err)
	}
	if !removeCalled {
		t.Fatal("ContainerRemove was not called after stop failure")
	}
}

func TestExecutor_StopAndRemoveContainer_JoinsStopAndRemoveErrors(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	stopErr := errors.New("stop failed")
	removeErr := errors.New("remove failed")
	client.ContainerStopFunc = func(context.Context, string, *int) error { return stopErr }
	client.ContainerRemoveFunc = func(context.Context, string, bool) error { return removeErr }

	exec := NewExecutor(client)
	err := exec.stopAndRemoveContainer(t.Context(), "test")
	if err == nil {
		t.Fatal("stopAndRemoveContainer() expected error, got nil")
	}
	if !errors.Is(err, stopErr) {
		t.Fatalf("stopAndRemoveContainer() error = %v, want to include stopErr", err)
	}
	if !errors.Is(err, removeErr) {
		t.Fatalf("stopAndRemoveContainer() error = %v, want to include removeErr", err)
	}
}
