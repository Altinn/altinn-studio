package containerbackend

import (
	"context"
	"errors"
	"strings"
	"testing"

	containermock "altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"
)

var errDaemonUnreachable = errors.New("daemon unreachable")

func TestRemoteImage_PullPolicies(t *testing.T) {
	t.Run("pull always", func(t *testing.T) {
		client := containermock.New()
		pulls := 0
		client.ImagePullWithProgressFunc = func(context.Context, string, types.ProgressHandler) error {
			pulls++
			return nil
		}
		client.ImageInspectFunc = func(context.Context, string) (types.ImageInfo, error) {
			return types.ImageInfo{ID: "sha256:image"}, nil
		}

		backend := New(client)
		_, err := backend.applyRemoteImage(
			t.Context(),
			executor.BackendContext{},
			&resource.RemoteImage{Ref: "nginx:latest", PullPolicy: resource.PullAlways},
		)
		if err != nil {
			t.Fatalf("applyRemoteImage() error = %v", err)
		}
		if pulls != 1 {
			t.Fatalf("ImagePullWithProgress calls = %d, want 1", pulls)
		}
	})

	t.Run("pull if not present", func(t *testing.T) {
		client := containermock.New()
		pulls := 0
		inspects := 0
		client.ImagePullWithProgressFunc = func(context.Context, string, types.ProgressHandler) error {
			pulls++
			return nil
		}
		client.ImageInspectFunc = func(context.Context, string) (types.ImageInfo, error) {
			inspects++
			if inspects == 1 {
				return types.ImageInfo{}, types.ErrImageNotFound
			}
			return types.ImageInfo{ID: "sha256:image"}, nil
		}

		backend := New(client)
		_, err := backend.applyRemoteImage(
			t.Context(),
			executor.BackendContext{},
			&resource.RemoteImage{Ref: "nginx:latest", PullPolicy: resource.PullIfNotPresent},
		)
		if err != nil {
			t.Fatalf("applyRemoteImage() error = %v", err)
		}
		if pulls != 1 {
			t.Fatalf("ImagePullWithProgress calls = %d, want 1", pulls)
		}
	})

	t.Run("pull never missing image", func(t *testing.T) {
		client := containermock.New()
		pulls := 0
		client.ImagePullWithProgressFunc = func(context.Context, string, types.ProgressHandler) error {
			pulls++
			return nil
		}
		client.ImageInspectFunc = func(context.Context, string) (types.ImageInfo, error) {
			return types.ImageInfo{}, types.ErrImageNotFound
		}

		backend := New(client)
		_, err := backend.applyRemoteImage(
			t.Context(),
			executor.BackendContext{},
			&resource.RemoteImage{Ref: "nginx:latest", PullPolicy: resource.PullNever},
		)
		if err == nil {
			t.Fatal("applyRemoteImage() expected error, got nil")
		}
		if pulls != 0 {
			t.Fatalf("ImagePullWithProgress calls = %d, want 0", pulls)
		}
	})

	t.Run("inspect transient error is propagated", func(t *testing.T) {
		client := containermock.New()
		client.ImageInspectFunc = func(context.Context, string) (types.ImageInfo, error) {
			return types.ImageInfo{}, errDaemonUnreachable
		}

		backend := New(client)
		_, err := backend.applyRemoteImage(
			t.Context(),
			executor.BackendContext{},
			&resource.RemoteImage{Ref: "nginx:latest", PullPolicy: resource.PullIfNotPresent},
		)
		if err == nil {
			t.Fatal("applyRemoteImage() expected error, got nil")
		}
		if !strings.Contains(err.Error(), "inspect image nginx:latest") {
			t.Fatalf("applyRemoteImage() error = %v, want inspect error context", err)
		}
	})

	t.Run("unknown pull policy is rejected", func(t *testing.T) {
		client := containermock.New()
		client.ImageInspectFunc = func(context.Context, string) (types.ImageInfo, error) {
			return types.ImageInfo{ID: "sha256:image"}, nil
		}

		backend := New(client)
		_, err := backend.applyPulledImage(
			t.Context(),
			executor.BackendContext{},
			&resource.PulledImage{Ref: "nginx:latest", PullPolicy: resource.PullPolicy(99)},
		)
		if err == nil || !strings.Contains(err.Error(), "unsupported image pull policy") {
			t.Fatalf("applyPulledImage() error = %v, want unsupported pull policy", err)
		}
	})
}
