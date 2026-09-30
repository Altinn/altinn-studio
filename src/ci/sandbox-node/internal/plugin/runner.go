package plugin

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"os"
	"path/filepath"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	pluginapi "k8s.io/kubelet/pkg/apis/deviceplugin/v1beta1"
)

const (
	resourceName   = "devices.altinn.studio/kvm"
	devicePath     = "/dev/kvm"
	deviceIDPrefix = "kvm"
	deviceCount    = 8
	socketName     = "altinn-kvm.sock"
)

var (
	errPluginDirectoryNotDirectory = errors.New("plugin directory is not a directory")
	errRefuseNonSocket             = errors.New("refusing to remove non-socket path")
)

type config struct {
	pluginDirectory     string
	devicePath          string
	resourceName        string
	socketName          string
	deviceIDs           []string
	retryInterval       time.Duration
	socketCheckInterval time.Duration
	deviceCheckInterval time.Duration
	registrationTimeout time.Duration
}

// Runner owns the kubelet registration and gRPC server lifecycle.
type Runner struct {
	logger *slog.Logger
	config config
}

// New constructs the fixed-purpose Altinn KVM device plugin.
func New(logger *slog.Logger) *Runner {
	return newRunner(config{
		pluginDirectory:     pluginapi.DevicePluginPath,
		devicePath:          devicePath,
		deviceIDs:           makeDeviceIDs(deviceIDPrefix, deviceCount),
		resourceName:        resourceName,
		socketName:          socketName,
		retryInterval:       5 * time.Second,
		socketCheckInterval: time.Second,
		deviceCheckInterval: 5 * time.Second,
		registrationTimeout: 10 * time.Second,
	}, logger)
}

func makeDeviceIDs(prefix string, count int) []string {
	ids := make([]string, count)
	for index := range count {
		ids[index] = fmt.Sprintf("%s-%d", prefix, index)
	}

	return ids
}

func newRunner(configuration config, logger *slog.Logger) *Runner {
	return &Runner{config: configuration, logger: logger}
}

// Run serves and re-registers the plugin until the context is cancelled.
func (r *Runner) Run(ctx context.Context) error {
	for {
		err := r.runOnce(ctx)
		if ctx.Err() != nil {
			return nil //nolint:nilerr // Context cancellation is the successful shutdown path.
		}

		r.logger.WarnContext(ctx, "KVM device plugin restarting", "error", err)

		timer := time.NewTimer(r.config.retryInterval)
		select {
		case <-ctx.Done():
			timer.Stop()

			return nil
		case <-timer.C:
		}
	}
}

func (r *Runner) runOnce(ctx context.Context) error {
	if err := validateCharacterDevice(r.config.devicePath); err != nil {
		return err
	}

	if err := validatePluginDirectory(r.config.pluginDirectory); err != nil {
		return err
	}

	socketPath := filepath.Join(r.config.pluginDirectory, r.config.socketName)
	if err := removeStaleSocket(socketPath); err != nil {
		return err
	}

	listener, err := (&net.ListenConfig{}).Listen(ctx, "unix", socketPath)
	if err != nil {
		return fmt.Errorf("listen on plugin socket %q: %w", socketPath, err)
	}

	grpcServer := grpc.NewServer()
	pluginapi.RegisterDevicePluginServer(grpcServer, newDeviceServer(r.config))
	defer r.cleanUp(grpcServer, listener, socketPath)

	serveErrors := make(chan error, 1)
	go func() {
		serveErrors <- grpcServer.Serve(listener)
	}()

	if err := r.registerWithKubelet(ctx); err != nil {
		return err
	}

	r.logger.InfoContext(
		ctx,
		"KVM device plugin registered",
		"resource",
		r.config.resourceName,
		"slots",
		len(r.config.deviceIDs),
	)

	ticker := time.NewTicker(r.config.socketCheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case err := <-serveErrors:
			return fmt.Errorf("serve device-plugin API: %w", err)
		case <-ticker.C:
			if _, err := os.Lstat(socketPath); err != nil {
				return fmt.Errorf("plugin socket disappeared: %w", err)
			}
		}
	}
}

func (r *Runner) registerWithKubelet(ctx context.Context) error {
	kubeletSocket := filepath.Join(r.config.pluginDirectory, filepath.Base(pluginapi.KubeletSocket))
	connection, err := grpc.NewClient(
		"passthrough:///kubelet",
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, "unix", kubeletSocket)
		}),
	)
	if err != nil {
		return fmt.Errorf("create kubelet client: %w", err)
	}
	defer func() {
		if closeErr := connection.Close(); closeErr != nil {
			r.logger.Warn("Close kubelet client", "error", closeErr)
		}
	}()

	registerCtx, cancel := context.WithTimeout(ctx, r.config.registrationTimeout)
	defer cancel()

	_, err = pluginapi.NewRegistrationClient(connection).Register(registerCtx, &pluginapi.RegisterRequest{
		Version:      pluginapi.Version,
		Endpoint:     r.config.socketName,
		ResourceName: r.config.resourceName,
	})
	if err != nil {
		return fmt.Errorf("register with kubelet: %w", err)
	}

	return nil
}

func (r *Runner) cleanUp(server *grpc.Server, listener net.Listener, socketPath string) {
	server.Stop()
	if err := listener.Close(); err != nil && !errors.Is(err, net.ErrClosed) {
		r.logger.Warn("Close plugin listener", "error", err)
	}

	if err := removeStaleSocket(socketPath); err != nil {
		r.logger.Warn("Remove plugin socket", "error", err)
	}
}

func validatePluginDirectory(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("stat plugin directory %q: %w", path, err)
	}

	if !info.IsDir() {
		return fmt.Errorf("%w: %q", errPluginDirectoryNotDirectory, path)
	}

	return nil
}

func removeStaleSocket(path string) error {
	info, err := os.Lstat(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("stat plugin socket %q: %w", path, err)
	}

	if info.Mode()&os.ModeSocket == 0 {
		return fmt.Errorf("%w: %q", errRefuseNonSocket, path)
	}

	if err := os.Remove(path); err != nil {
		return fmt.Errorf("remove stale plugin socket %q: %w", path, err)
	}

	return nil
}
