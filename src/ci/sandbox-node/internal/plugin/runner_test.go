package plugin

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"os"
	"path/filepath"
	"slices"
	"testing"
	"time"

	"google.golang.org/grpc"
	pluginapi "k8s.io/kubelet/pkg/apis/deviceplugin/v1beta1"
)

func TestNewUsesEightStableKVMAccessSlots(t *testing.T) {
	t.Parallel()

	runner := New(slog.New(slog.DiscardHandler))
	expected := []string{"kvm-0", "kvm-1", "kvm-2", "kvm-3", "kvm-4", "kvm-5", "kvm-6", "kvm-7"}
	if !slices.Equal(runner.config.deviceIDs, expected) {
		t.Fatalf("expected KVM slots %v, got %v", expected, runner.config.deviceIDs)
	}
}

func TestRunnerRegistersAndReregistersAfterSocketRemoval(t *testing.T) {
	t.Parallel()

	pluginDirectory := t.TempDir()
	kubelet := startFakeKubelet(t, pluginDirectory)
	configuration := config{
		pluginDirectory:     pluginDirectory,
		devicePath:          "/dev/null",
		deviceIDs:           makeDeviceIDs("kvm", 8),
		resourceName:        "devices.altinn.studio/kvm",
		socketName:          "altinn-kvm.sock",
		retryInterval:       5 * time.Millisecond,
		socketCheckInterval: 5 * time.Millisecond,
		deviceCheckInterval: 5 * time.Millisecond,
		registrationTimeout: time.Second,
	}
	runner := newRunner(configuration, slog.New(slog.DiscardHandler))

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() {
		done <- runner.Run(ctx)
	}()

	first := waitForRegistration(t, kubelet.registrations)
	assertRegistration(t, first, configuration)

	pluginSocket := filepath.Join(pluginDirectory, configuration.socketName)
	if err := os.Remove(pluginSocket); err != nil {
		t.Fatalf("remove plugin socket: %v", err)
	}

	second := waitForRegistration(t, kubelet.registrations)
	assertRegistration(t, second, configuration)
	cancel()

	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("runner returned an error: %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("runner did not stop after cancellation")
	}

	if _, err := os.Lstat(pluginSocket); !os.IsNotExist(err) {
		t.Fatalf("plugin socket was not cleaned up: %v", err)
	}
}

func TestRemoveStaleSocketRefusesRegularFile(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "socket")
	if err := os.WriteFile(path, []byte("keep"), 0o600); err != nil {
		t.Fatalf("write regular file: %v", err)
	}

	if err := removeStaleSocket(path); err == nil {
		t.Fatal("expected removal to reject a regular file")
	}

	if _, err := os.Stat(path); err != nil {
		t.Fatalf("regular file should remain: %v", err)
	}
}

func assertRegistration(t *testing.T, request *pluginapi.RegisterRequest, configuration config) {
	t.Helper()

	if request.GetVersion() != pluginapi.Version ||
		request.GetEndpoint() != configuration.socketName ||
		request.GetResourceName() != configuration.resourceName {
		t.Fatalf("unexpected registration: %#v", request)
	}
}

func waitForRegistration(t *testing.T, registrations <-chan *pluginapi.RegisterRequest) *pluginapi.RegisterRequest {
	t.Helper()

	select {
	case request := <-registrations:
		return request
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for registration")

		return nil
	}
}

type fakeKubelet struct {
	pluginapi.UnimplementedRegistrationServer

	registrations chan *pluginapi.RegisterRequest
}

func startFakeKubelet(t *testing.T, pluginDirectory string) *fakeKubelet {
	t.Helper()

	listener, err := (&net.ListenConfig{}).Listen(
		context.Background(),
		"unix",
		filepath.Join(pluginDirectory, filepath.Base(pluginapi.KubeletSocket)),
	)
	if err != nil {
		t.Fatalf("listen on fake kubelet socket: %v", err)
	}

	kubelet := &fakeKubelet{registrations: make(chan *pluginapi.RegisterRequest, 2)}
	server := grpc.NewServer()
	pluginapi.RegisterRegistrationServer(server, kubelet)

	go func() {
		if serveErr := server.Serve(listener); serveErr != nil {
			t.Logf("fake kubelet stopped: %v", serveErr)
		}
	}()

	t.Cleanup(func() {
		server.Stop()
		if closeErr := listener.Close(); closeErr != nil && !errors.Is(closeErr, net.ErrClosed) {
			t.Errorf("close fake kubelet listener: %v", closeErr)
		}
	})

	return kubelet
}

func (k *fakeKubelet) Register(
	_ context.Context,
	request *pluginapi.RegisterRequest,
) (*pluginapi.Empty, error) {
	k.registrations <- request

	return &pluginapi.Empty{}, nil
}
