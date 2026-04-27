package resource

import (
	"fmt"
	"strconv"
	"sync"
	"testing"

	"altinn.studio/devenv/pkg/container/types"
)

func TestOutputStore_GetImage(t *testing.T) {
	store := newOutputStore()
	id := ResourceID("image:test")
	want := ImageOutput{ImageID: "sha256:image"}

	store.Set(id, want)

	got, ok := store.Image(id)
	if !ok {
		t.Fatal("expected to find image output")
	}
	if got != want {
		t.Fatalf("Image() = %+v, want %+v", got, want)
	}
}

func TestOutputStore_GetContainerReturnsClone(t *testing.T) {
	store := newOutputStore()
	id := ResourceID("container:test")
	want := ContainerOutput{
		ContainerID: "container-id",
		HostPorts: []types.PublishedPort{
			{ContainerPort: "5000", HostPort: "8080", Protocol: "tcp"},
		},
	}

	store.Set(id, want)

	got, ok := store.Container(id)
	if !ok {
		t.Fatal("expected to find container output")
	}
	got.HostPorts[0].HostPort = "9999"

	again, ok := store.Container(id)
	if !ok {
		t.Fatal("expected to find container output")
	}
	if again.ContainerID != want.ContainerID {
		t.Fatalf("ContainerID = %q, want %q", again.ContainerID, want.ContainerID)
	}
	if len(again.HostPorts) != 1 || again.HostPorts[0] != want.HostPorts[0] {
		t.Fatalf("HostPorts = %+v, want %+v", again.HostPorts, want.HostPorts)
	}
}

func TestOutputs_GetWrongType(t *testing.T) {
	store := newOutputStore()
	id := ResourceID("image:test")
	store.Set(id, ImageOutput{ImageID: "sha256:image"})

	if _, ok := store.Snapshot().Container(id); ok {
		t.Fatal("expected Container() to reject image output")
	}
}

func TestOutputStore_Reset(t *testing.T) {
	store := newOutputStore()
	store.Set(ResourceID("image:test"), ImageOutput{ImageID: "sha256:test"})

	store.Reset()

	if _, ok := store.Image(ResourceID("image:test")); ok {
		t.Fatal("expected reset store to be empty")
	}
}

func TestOutputStore_Concurrent(t *testing.T) {
	store := newOutputStore()
	const goroutines = 100
	var wg sync.WaitGroup

	for i := range goroutines {
		wg.Add(1)
		go func(n int) {
			defer wg.Done()

			id := ResourceID(fmt.Sprintf("container:%d", n))
			output := ContainerOutput{
				ContainerID: fmt.Sprintf("id-%d", n),
				HostPorts: []types.PublishedPort{
					{ContainerPort: "5000", HostPort: strconv.Itoa(8000 + n)},
				},
			}
			store.Set(id, output)

			got, ok := store.Container(id)
			if !ok {
				t.Errorf("goroutine %d: expected to find container output", n)
				return
			}
			if got.ContainerID != output.ContainerID {
				t.Errorf("goroutine %d: ContainerID = %q, want %q", n, got.ContainerID, output.ContainerID)
			}
		}(i)
	}

	wg.Wait()

	if got := store.Snapshot().Len(); got != goroutines {
		t.Fatalf("Len() = %d, want %d", got, goroutines)
	}
}
