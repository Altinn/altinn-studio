package resource

import (
	"context"
	"errors"
	"strings"
	"testing"

	containermock "altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
)

func TestRemoteImage_ID(t *testing.T) {
	r := &RemoteImage{Ref: "nginx:latest"}
	if got := r.ID(); got != "image:remote:nginx:latest" {
		t.Errorf("ID() = %q, want %q", got, "image:remote:nginx:latest")
	}
}

func TestRemoteImage_Dependencies(t *testing.T) {
	r := &RemoteImage{Ref: "nginx:latest"}
	deps := r.Dependencies()
	if len(deps) != 0 {
		t.Errorf("Dependencies() = %v, want empty", deps)
	}
}

func TestRemoteImage_ImageRef(t *testing.T) {
	r := &RemoteImage{Ref: "nginx:1.21"}
	if got := r.ImageRef(); got != "nginx:1.21" {
		t.Errorf("ImageRef() = %q, want %q", got, "nginx:1.21")
	}
}

func TestRemoteImage_Validate(t *testing.T) {
	tests := []struct {
		name    string
		image   *RemoteImage
		wantErr bool
	}{
		{
			name:  "valid image",
			image: &RemoteImage{Ref: "nginx:latest"},
		},
		{
			name:    "empty ref",
			image:   &RemoteImage{},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.image.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestRemoteImage_PullPolicies(t *testing.T) {
	t.Run("pull always", func(t *testing.T) {
		client := containermock.New()
		pulls := 0
		client.ImagePullFunc = func(context.Context, string) error {
			pulls++
			return nil
		}
		client.ImageInspectFunc = func(context.Context, string) (types.ImageInfo, error) {
			return types.ImageInfo{ID: "sha256:image"}, nil
		}

		exec := NewExecutor(client)
		err := exec.applyRemoteImage(t.Context(), &RemoteImage{Ref: "nginx:latest", PullPolicy: PullAlways})
		if err != nil {
			t.Fatalf("applyRemoteImage() error = %v", err)
		}
		if pulls != 1 {
			t.Fatalf("ImagePull calls = %d, want 1", pulls)
		}
	})

	t.Run("pull if not present", func(t *testing.T) {
		client := containermock.New()
		pulls := 0
		inspects := 0
		client.ImagePullFunc = func(context.Context, string) error {
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

		exec := NewExecutor(client)
		err := exec.applyRemoteImage(t.Context(), &RemoteImage{Ref: "nginx:latest", PullPolicy: PullIfNotPresent})
		if err != nil {
			t.Fatalf("applyRemoteImage() error = %v", err)
		}
		if pulls != 1 {
			t.Fatalf("ImagePull calls = %d, want 1", pulls)
		}
	})

	t.Run("pull never missing image", func(t *testing.T) {
		client := containermock.New()
		pulls := 0
		client.ImagePullFunc = func(context.Context, string) error {
			pulls++
			return nil
		}
		client.ImageInspectFunc = func(context.Context, string) (types.ImageInfo, error) {
			return types.ImageInfo{}, types.ErrImageNotFound
		}

		exec := NewExecutor(client)
		err := exec.applyRemoteImage(t.Context(), &RemoteImage{Ref: "nginx:latest", PullPolicy: PullNever})
		if err == nil {
			t.Fatal("applyRemoteImage() expected error, got nil")
		}
		if pulls != 0 {
			t.Fatalf("ImagePull calls = %d, want 0", pulls)
		}
	})

	t.Run("inspect transient error is propagated", func(t *testing.T) {
		client := containermock.New()
		client.ImageInspectFunc = func(context.Context, string) (types.ImageInfo, error) {
			return types.ImageInfo{}, errors.New("daemon unreachable")
		}

		exec := NewExecutor(client)
		err := exec.applyRemoteImage(t.Context(), &RemoteImage{Ref: "nginx:latest", PullPolicy: PullIfNotPresent})
		if err == nil {
			t.Fatal("applyRemoteImage() expected error, got nil")
		}
		if !strings.Contains(err.Error(), "inspect image nginx:latest") {
			t.Fatalf("applyRemoteImage() error = %v, want inspect error context", err)
		}
	})
}

func TestLocalImage_ID(t *testing.T) {
	l := &LocalImage{ContextPath: "/path", Tag: "myapp:latest"}
	if got := l.ID(); got != "image:local:myapp:latest" {
		t.Errorf("ID() = %q, want %q", got, "image:local:myapp:latest")
	}
}

func TestLocalImage_Dependencies(t *testing.T) {
	l := &LocalImage{ContextPath: "/path", Tag: "myapp:latest"}
	deps := l.Dependencies()
	if len(deps) != 0 {
		t.Errorf("Dependencies() = %v, want empty", deps)
	}
}

func TestLocalImage_ImageRef(t *testing.T) {
	l := &LocalImage{ContextPath: "/path", Tag: "myapp:v1.0"}
	if got := l.ImageRef(); got != "myapp:v1.0" {
		t.Errorf("ImageRef() = %q, want %q", got, "myapp:v1.0")
	}
}

func TestLocalImage_Validate(t *testing.T) {
	tests := []struct {
		name    string
		image   *LocalImage
		wantErr bool
	}{
		{
			name:  "valid image",
			image: &LocalImage{ContextPath: "/path", Tag: "myapp:latest"},
		},
		{
			name:    "empty context path",
			image:   &LocalImage{Tag: "myapp:latest"},
			wantErr: true,
		},
		{
			name:    "empty tag",
			image:   &LocalImage{ContextPath: "/path"},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.image.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestLocalImage_Dockerfile(t *testing.T) {
	l := &LocalImage{
		ContextPath: "/path/to/project",
		Dockerfile:  "custom.Dockerfile",
		Tag:         "myapp:latest",
	}
	if l.Dockerfile != "custom.Dockerfile" {
		t.Errorf("Dockerfile = %q, want %q", l.Dockerfile, "custom.Dockerfile")
	}
}

// Test that RemoteImage implements required interfaces
func TestRemoteImage_ImplementsInterfaces(t *testing.T) {
	var _ Resource = (*RemoteImage)(nil)
	var _ ImageResource = (*RemoteImage)(nil)
	var _ Validator = (*RemoteImage)(nil)
}

// Test that LocalImage implements required interfaces
func TestLocalImage_ImplementsInterfaces(t *testing.T) {
	var _ Resource = (*LocalImage)(nil)
	var _ ImageResource = (*LocalImage)(nil)
	var _ Validator = (*LocalImage)(nil)
}
