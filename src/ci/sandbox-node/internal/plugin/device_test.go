package plugin

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"

	"google.golang.org/grpc/metadata"
	pluginapi "k8s.io/kubelet/pkg/apis/deviceplugin/v1beta1"
)

func TestValidateCharacterDevice(t *testing.T) {
	t.Parallel()

	if err := validateCharacterDevice("/dev/null"); err != nil {
		t.Fatalf("expected /dev/null to be a character device: %v", err)
	}

	regularFile := filepath.Join(t.TempDir(), "regular")
	if err := os.WriteFile(regularFile, []byte("not a device"), 0o600); err != nil {
		t.Fatalf("write regular file: %v", err)
	}

	if err := validateCharacterDevice(regularFile); err == nil {
		t.Fatal("expected regular file validation to fail")
	}
}

func TestAllocateKVMDevice(t *testing.T) {
	t.Parallel()

	server := &deviceServer{
		devicePath: "/dev/kvm",
		deviceIDs:  []string{"kvm-0", "kvm-1"},
		validate:   func(string) error { return nil },
	}
	response, err := server.Allocate(context.Background(), &pluginapi.AllocateRequest{
		ContainerRequests: []*pluginapi.ContainerAllocateRequest{{DevicesIds: []string{"kvm-1"}}},
	})
	if err != nil {
		t.Fatalf("allocate KVM: %v", err)
	}

	containerResponses := response.GetContainerResponses()
	if len(containerResponses) != 1 || len(containerResponses[0].GetDevices()) != 1 {
		t.Fatalf("unexpected allocation response: %#v", response)
	}

	device := containerResponses[0].GetDevices()[0]
	if device.GetHostPath() != "/dev/kvm" ||
		device.GetContainerPath() != "/dev/kvm" ||
		device.GetPermissions() != "rw" {
		t.Fatalf("unexpected device specification: %#v", device)
	}
}

func TestAllocateRejectsUnknownDevice(t *testing.T) {
	t.Parallel()

	server := &deviceServer{
		devicePath: "/dev/kvm",
		deviceIDs:  []string{"kvm-0", "kvm-1"},
		validate:   func(string) error { return nil },
	}
	_, err := server.Allocate(context.Background(), &pluginapi.AllocateRequest{
		ContainerRequests: []*pluginapi.ContainerAllocateRequest{{DevicesIds: []string{"unknown"}}},
	})
	if err == nil {
		t.Fatal("expected allocation to reject unknown device")
	}
}

func TestAllocateRejectsMultipleSlotsForOneContainer(t *testing.T) {
	t.Parallel()

	server := &deviceServer{
		devicePath: "/dev/kvm",
		deviceIDs:  []string{"kvm-0", "kvm-1"},
		validate:   func(string) error { return nil },
	}
	_, err := server.Allocate(context.Background(), &pluginapi.AllocateRequest{
		ContainerRequests: []*pluginapi.ContainerAllocateRequest{{DevicesIds: []string{"kvm-0", "kvm-1"}}},
	})
	if err == nil {
		t.Fatal("expected allocation to reject multiple slots for one container")
	}
}

func TestListAndWatchReportsHealthChangesAndStops(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancel(context.Background())
	stream := &listAndWatchStream{
		contextProvider: func() context.Context { return ctx },
		responses:       make(chan *pluginapi.ListAndWatchResponse, 2),
	}
	var healthy atomic.Bool
	healthy.Store(true)

	server := &deviceServer{
		devicePath:    "/dev/kvm",
		deviceIDs:     makeDeviceIDs("kvm", 8),
		checkInterval: 5 * time.Millisecond,
		validate: func(string) error {
			if !healthy.Load() {
				return errNotCharacterDevice
			}

			return nil
		},
	}

	done := make(chan error, 1)
	go func() {
		done <- server.ListAndWatch(&pluginapi.Empty{}, stream)
	}()

	assertHealth(t, stream.responses, pluginapi.Healthy, 8)
	healthy.Store(false)
	assertHealth(t, stream.responses, pluginapi.Unhealthy, 8)
	cancel()

	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("ListAndWatch returned an error: %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("ListAndWatch did not stop after stream cancellation")
	}
}

func assertHealth(
	t *testing.T,
	responses <-chan *pluginapi.ListAndWatchResponse,
	expected string,
	expectedCount int,
) {
	t.Helper()

	select {
	case response := <-responses:
		devices := response.GetDevices()
		if len(devices) != expectedCount {
			t.Fatalf("expected %d devices, got %#v", expectedCount, response)
		}
		for index, device := range devices {
			expectedID := fmt.Sprintf("kvm-%d", index)
			if device.GetID() != expectedID || device.GetHealth() != expected {
				t.Fatalf("expected slot %q with health %q, got %#v", expectedID, expected, device)
			}
		}
	case <-time.After(time.Second):
		t.Fatalf("timed out waiting for health %q", expected)
	}
}

type listAndWatchStream struct {
	contextProvider func() context.Context
	responses       chan *pluginapi.ListAndWatchResponse
}

func (s *listAndWatchStream) Send(response *pluginapi.ListAndWatchResponse) error {
	s.responses <- response

	return nil
}

func (s *listAndWatchStream) SetHeader(metadata.MD) error { return nil }

func (s *listAndWatchStream) SendHeader(metadata.MD) error { return nil }

func (s *listAndWatchStream) SetTrailer(metadata.MD) {}

func (s *listAndWatchStream) Context() context.Context { return s.contextProvider() }

func (s *listAndWatchStream) SendMsg(any) error { return nil }

func (s *listAndWatchStream) RecvMsg(any) error { return nil }
