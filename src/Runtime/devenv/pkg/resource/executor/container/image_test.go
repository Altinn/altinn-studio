package containerbackend

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"testing"

	containermock "altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"
)

var errDaemonUnreachable = errors.New("daemon unreachable")

func TestPulledImage_PullPolicies(t *testing.T) {
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
		_, err := backend.applyPulledImage(
			t.Context(),
			executor.BackendContext{},
			&resource.PulledImage{Ref: "nginx:latest", PullPolicy: resource.PullAlways},
		)
		if err != nil {
			t.Fatalf("applyPulledImage() error = %v", err)
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
		_, err := backend.applyPulledImage(
			t.Context(),
			executor.BackendContext{},
			&resource.PulledImage{Ref: "nginx:latest", PullPolicy: resource.PullIfNotPresent},
		)
		if err != nil {
			t.Fatalf("applyPulledImage() error = %v", err)
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
		_, err := backend.applyPulledImage(
			t.Context(),
			executor.BackendContext{},
			&resource.PulledImage{Ref: "nginx:latest", PullPolicy: resource.PullNever},
		)
		if err == nil {
			t.Fatal("applyPulledImage() expected error, got nil")
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
		_, err := backend.applyPulledImage(
			t.Context(),
			executor.BackendContext{},
			&resource.PulledImage{Ref: "nginx:latest", PullPolicy: resource.PullIfNotPresent},
		)
		if err == nil {
			t.Fatal("applyPulledImage() expected error, got nil")
		}
		if !strings.Contains(err.Error(), "inspect image nginx:latest") {
			t.Fatalf("applyPulledImage() error = %v, want inspect error context", err)
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

func TestBuiltImage_DockerfilePath(t *testing.T) {
	t.Parallel()

	contextPath := filepath.Join(string(filepath.Separator), "repo", "src", "Runtime", "pdf3")
	absoluteDockerfile := filepath.Join(string(filepath.Separator), "tmp", "generated.Dockerfile")

	tests := []struct {
		name       string
		dockerfile string
		want       string
	}{
		{
			name:       "default Dockerfile is relative to context",
			dockerfile: "",
			want:       filepath.Join(contextPath, "Dockerfile"),
		},
		{
			name:       "custom Dockerfile is relative to context",
			dockerfile: "Dockerfile.proxy",
			want:       filepath.Join(contextPath, "Dockerfile.proxy"),
		},
		{
			name:       "absolute Dockerfile is preserved",
			dockerfile: absoluteDockerfile,
			want:       absoluteDockerfile,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			client := containermock.New()
			gotDockerfile := ""
			client.BuildWithProgressFunc = func(
				_ context.Context,
				gotContextPath string,
				dockerfile string,
				tag string,
				_ types.ProgressHandler,
				_ ...types.BuildOptions,
			) error {
				if gotContextPath != contextPath {
					t.Fatalf("BuildWithProgress contextPath = %q, want %q", gotContextPath, contextPath)
				}
				if tag != "pdf3-proxy:dev" {
					t.Fatalf("BuildWithProgress tag = %q, want %q", tag, "pdf3-proxy:dev")
				}
				gotDockerfile = dockerfile
				return nil
			}
			client.ImageInspectFunc = func(context.Context, string) (types.ImageInfo, error) {
				return types.ImageInfo{ID: "sha256:image"}, nil
			}

			_, err := New(client).applyBuiltImage(
				t.Context(),
				executor.BackendContext{},
				&resource.BuiltImage{
					ContextPath: contextPath,
					Dockerfile:  tt.dockerfile,
					Tag:         "pdf3-proxy:dev",
				},
			)
			if err != nil {
				t.Fatalf("applyBuiltImage() error = %v", err)
			}
			if gotDockerfile != tt.want {
				t.Fatalf("BuildWithProgress dockerfile = %q, want %q", gotDockerfile, tt.want)
			}
		})
	}
}

func TestPublishedImage_TagAndPush(t *testing.T) {
	t.Parallel()

	client := containermock.New()
	taggedSource := ""
	taggedTarget := ""
	pushed := ""
	client.BuildWithProgressFunc = func(context.Context, string, string, string, types.ProgressHandler, ...types.BuildOptions) error {
		return nil
	}
	client.ImageInspectFunc = func(_ context.Context, image string) (types.ImageInfo, error) {
		if image == "app:dev" {
			return types.ImageInfo{ID: "sha256:source"}, nil
		}
		return types.ImageInfo{ID: "sha256:published"}, nil
	}
	client.TagFunc = func(_ context.Context, source string, target string) error {
		taggedSource = source
		taggedTarget = target
		return nil
	}
	client.PushFunc = func(_ context.Context, image string) error {
		pushed = image
		return nil
	}

	graph := resource.NewGraph(testGraphID)
	source := &resource.BuiltImage{ContextPath: "/repo", Tag: "app:dev"}
	published := &resource.PublishedImage{Ref: "localhost:5001/runtime-gateway:latest", Source: resource.Ref(source)}
	mustAddResource(t, graph, source)
	mustAddResource(t, graph, published)

	if _, err := newTestExecutor(client).Apply(t.Context(), graph); err != nil {
		t.Fatalf("Apply() error = %v", err)
	}
	if taggedSource != "sha256:source" {
		t.Fatalf("Tag source = %q, want %q", taggedSource, "sha256:source")
	}
	if taggedTarget != published.Ref {
		t.Fatalf("Tag target = %q, want %q", taggedTarget, published.Ref)
	}
	if pushed != published.Ref {
		t.Fatalf("Push called with %q, want %q", pushed, published.Ref)
	}
}
