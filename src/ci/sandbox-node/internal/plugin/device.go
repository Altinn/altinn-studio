package plugin

import (
	"context"
	"errors"
	"fmt"
	"os"
	"slices"
	"time"

	pluginapi "k8s.io/kubelet/pkg/apis/deviceplugin/v1beta1"
)

var (
	errNotCharacterDevice = errors.New("not a character device")
	errUnexpectedDevice   = errors.New("unexpected device allocation request")
)

type deviceServer struct {
	pluginapi.UnimplementedDevicePluginServer

	validate      func(string) error
	devicePath    string
	deviceIDs     []string
	checkInterval time.Duration
}

func newDeviceServer(configuration config) *deviceServer {
	return &deviceServer{
		devicePath:    configuration.devicePath,
		deviceIDs:     configuration.deviceIDs,
		checkInterval: configuration.deviceCheckInterval,
		validate:      validateCharacterDevice,
	}
}

func validateCharacterDevice(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("stat device %q: %w", path, err)
	}

	if info.Mode()&os.ModeDevice == 0 || info.Mode()&os.ModeCharDevice == 0 {
		return fmt.Errorf("%w: %q", errNotCharacterDevice, path)
	}

	return nil
}

func (s *deviceServer) GetDevicePluginOptions(
	context.Context,
	*pluginapi.Empty,
) (*pluginapi.DevicePluginOptions, error) {
	return &pluginapi.DevicePluginOptions{}, nil
}

func (s *deviceServer) ListAndWatch(
	_ *pluginapi.Empty,
	stream pluginapi.DevicePlugin_ListAndWatchServer,
) error {
	lastHealth := ""
	if err := s.sendHealth(stream, &lastHealth); err != nil {
		return err
	}

	ticker := time.NewTicker(s.checkInterval)
	defer ticker.Stop()

	for {
		select {
		case <-stream.Context().Done():
			return nil
		case <-ticker.C:
			if err := s.sendHealth(stream, &lastHealth); err != nil {
				return err
			}
		}
	}
}

func (s *deviceServer) sendHealth(
	stream pluginapi.DevicePlugin_ListAndWatchServer,
	lastHealth *string,
) error {
	health := pluginapi.Healthy
	if err := s.validate(s.devicePath); err != nil {
		health = pluginapi.Unhealthy
	}

	if health == *lastHealth {
		return nil
	}

	devices := make([]*pluginapi.Device, 0, len(s.deviceIDs))
	for _, id := range s.deviceIDs {
		devices = append(devices, &pluginapi.Device{ID: id, Health: health})
	}

	response := &pluginapi.ListAndWatchResponse{Devices: devices}
	if err := stream.Send(response); err != nil {
		return fmt.Errorf("send KVM device health: %w", err)
	}

	*lastHealth = health

	return nil
}

func (s *deviceServer) Allocate(
	_ context.Context,
	request *pluginapi.AllocateRequest,
) (*pluginapi.AllocateResponse, error) {
	if err := s.validate(s.devicePath); err != nil {
		return nil, fmt.Errorf("KVM device is unavailable: %w", err)
	}

	containerRequests := request.GetContainerRequests()
	response := &pluginapi.AllocateResponse{
		ContainerResponses: make([]*pluginapi.ContainerAllocateResponse, 0, len(containerRequests)),
	}

	for _, containerRequest := range containerRequests {
		requestedDevices := containerRequest.GetDevicesIds()
		if len(requestedDevices) != 1 || !s.hasDevice(requestedDevices[0]) {
			return nil, fmt.Errorf("%w: expected exactly one known KVM slot", errUnexpectedDevice)
		}

		response.ContainerResponses = append(response.ContainerResponses, &pluginapi.ContainerAllocateResponse{
			Devices: []*pluginapi.DeviceSpec{{
				HostPath:      s.devicePath,
				ContainerPath: s.devicePath,
				Permissions:   "rw",
			}},
		})
	}

	return response, nil
}

func (s *deviceServer) hasDevice(requested string) bool {
	return slices.Contains(s.deviceIDs, requested)
}

func (s *deviceServer) PreStartContainer(
	context.Context,
	*pluginapi.PreStartContainerRequest,
) (*pluginapi.PreStartContainerResponse, error) {
	return &pluginapi.PreStartContainerResponse{}, nil
}

func (s *deviceServer) GetPreferredAllocation(
	context.Context,
	*pluginapi.PreferredAllocationRequest,
) (*pluginapi.PreferredAllocationResponse, error) {
	return &pluginapi.PreferredAllocationResponse{}, nil
}
