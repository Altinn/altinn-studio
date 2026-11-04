package dockerapi

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"altinn.studio/devenv/pkg/container/types"
)

func TestNew_APIVersionNegotiation(t *testing.T) {
	t.Setenv("DOCKER_CERT_PATH", "")
	t.Setenv("DOCKER_TLS_VERIFY", "")

	tests := []struct {
		name         string
		daemonAPI    string
		envAPI       string
		wantAPI      string
		wantError    string
		explicitHost bool
	}{
		{name: "environment host", daemonAPI: "1.41", wantAPI: "1.41"},
		{name: "minimum API", daemonAPI: "1.40", wantAPI: "1.40"},
		{name: "newer daemon", daemonAPI: "99.99", wantAPI: maxAPIVersion},
		// As with moby's client, a ping with an empty or no Api-Version negotiates maxAPIVersion.
		{name: "daemon without an API version", wantAPI: maxAPIVersion},
		{name: "environment API pin", daemonAPI: "1.41", envAPI: "1.40", wantAPI: "1.40"},
		{name: "old daemon", daemonAPI: "1.39", wantError: "minimum supported API version"},
		{name: "malformed environment API", daemonAPI: "1.41", envAPI: "1.41.0", wantError: "invalid API version"},
		// As with moby's client, a lone v counts as unset.
		{name: "environment API without a number", daemonAPI: "1.41", envAPI: "v", wantAPI: "1.41"},
		{name: "explicit host", daemonAPI: "1.41", wantAPI: "1.41", explicitHost: true},
		{
			name: "explicit host ignores environment API", daemonAPI: "1.41", envAPI: "1.41.0",
			wantAPI: "1.41", explicitHost: true,
		},
		{
			name: "explicit host old daemon", daemonAPI: "1.39",
			wantError: "minimum supported API version", explicitHost: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				switch req.URL.Path {
				case "/_ping":
					w.Header().Set("Api-Version", tt.daemonAPI)
				case "/v" + tt.wantAPI + "/version":
					if _, err := io.WriteString(w, `{"Version":"5.7.0"}`); err != nil {
						t.Error(err)
					}
				case "/v" + tt.wantAPI + "/info":
					if _, err := io.WriteString(w, `{"SecurityOptions":["name=selinux"]}`); err != nil {
						t.Error(err)
					}
				default:
					t.Errorf("unexpected request: %s %s", req.Method, req.URL)
					w.WriteHeader(http.StatusBadRequest)
				}
			}))
			t.Cleanup(server.Close)
			host := "tcp://" + strings.TrimPrefix(server.URL, "http://")
			t.Setenv("DOCKER_HOST", host)
			t.Setenv("DOCKER_API_VERSION", tt.envAPI)

			var c *Client
			var err error
			if tt.explicitHost {
				t.Setenv("DOCKER_HOST", "invalid-host")
				c, err = NewWithHost(t.Context(), host, types.ContainerToolchain{})
			} else {
				c, err = New(t.Context(), types.ContainerToolchain{})
			}
			if c != nil {
				t.Cleanup(func() { closeBestEffort(c) })
			}
			if tt.wantError != "" {
				if err == nil || !strings.Contains(err.Error(), tt.wantError) {
					t.Fatalf("New() error = %v, want %q", err, tt.wantError)
				}
				return
			}
			if err != nil {
				t.Fatalf("New() error = %v", err)
			}
			got := c.Toolchain()
			if got.ClientVersion != tt.wantAPI || got.ServerVersion != "5.7.0" || !got.SELinux {
				t.Fatalf("Toolchain() = %+v, want API %s, server 5.7.0 and SELinux", got, tt.wantAPI)
			}
		})
	}
}

func TestClient_NotFoundErrors(t *testing.T) {
	t.Parallel()

	tests := []struct {
		want error
		call func(context.Context, *Client) error
		name string
	}{
		{name: "ContainerState", call: func(ctx context.Context, c *Client) error {
			_, err := c.ContainerState(ctx, "missing")
			return err
		}, want: types.ErrContainerNotFound},
		{name: "ContainerNetworks", call: func(ctx context.Context, c *Client) error {
			_, err := c.ContainerNetworks(ctx, "missing")
			return err
		}, want: types.ErrContainerNotFound},
		{name: "ContainerInspect", call: func(ctx context.Context, c *Client) error {
			_, err := c.ContainerInspect(ctx, "missing")
			return err
		}, want: types.ErrContainerNotFound},
		{name: "ContainerStop", call: func(ctx context.Context, c *Client) error {
			return c.ContainerStop(ctx, "missing", nil)
		}, want: types.ErrContainerNotFound},
		{name: "ContainerRemove", call: func(ctx context.Context, c *Client) error {
			return c.ContainerRemove(ctx, "missing", true)
		}, want: types.ErrContainerNotFound},
		{name: "ContainerLogs", call: func(ctx context.Context, c *Client) error {
			_, err := c.ContainerLogs(ctx, "missing", false, "100")
			return err
		}, want: types.ErrContainerNotFound},
		{name: "ImageInspect", call: func(ctx context.Context, c *Client) error {
			_, err := c.ImageInspect(ctx, "missing")
			return err
		}, want: types.ErrImageNotFound},
		{name: "NetworkInspect", call: func(ctx context.Context, c *Client) error {
			_, err := c.NetworkInspect(ctx, "missing")
			return err
		}, want: types.ErrNetworkNotFound},
		{name: "NetworkRemove", call: func(ctx context.Context, c *Client) error {
			return c.NetworkRemove(ctx, "missing")
		}, want: types.ErrNetworkNotFound},
		{name: "VolumeRemove", call: func(ctx context.Context, c *Client) error {
			return c.VolumeRemove(ctx, "missing", true)
		}, want: types.ErrVolumeNotFound},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			c := newHTTPTestClient(t, func(w http.ResponseWriter, _ *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusNotFound)
				if _, err := io.WriteString(w, `{"message":"no such object"}`); err != nil {
					t.Error(err)
				}
			})
			if err := tt.call(t.Context(), c); !errors.Is(err, tt.want) {
				t.Fatalf("%s() error = %v, want %v", tt.name, err, tt.want)
			}
		})
	}
}

func TestClient_EmptyIDFailsBeforeRequest(t *testing.T) {
	t.Parallel()
	c := newHTTPTestClient(t, func(w http.ResponseWriter, req *http.Request) {
		t.Errorf("unexpected request: %s %s", req.Method, req.URL)
		w.WriteHeader(http.StatusNotFound)
	})
	ctx := t.Context()
	_, inspectErr := c.ContainerInspect(ctx, "")
	_, imageErr := c.ImageInspect(ctx, "")
	for name, err := range map[string]error{
		"ContainerInspect": inspectErr,
		"ContainerRemove":  c.ContainerRemove(ctx, "", true),
		"ImageInspect":     imageErr,
		"NetworkRemove":    c.NetworkRemove(ctx, ""),
	} {
		if !errors.Is(err, errEmptyID) {
			t.Errorf("%s(\"\") error = %v, want %v", name, err, errEmptyID)
		}
	}
}

func TestNetworkRemove_SDKErrorClassification(t *testing.T) {
	t.Parallel()
	for _, status := range []int{http.StatusConflict, http.StatusForbidden} {
		t.Run(http.StatusText(status), func(t *testing.T) {
			t.Parallel()
			c := newHTTPTestClient(t, func(w http.ResponseWriter, _ *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(status)
				if _, err := io.WriteString(w, `{"message":"network removal failed"}`); err != nil {
					t.Error(err)
				}
			})
			err := c.NetworkRemove(t.Context(), "network")
			if status == http.StatusConflict {
				if !errors.Is(err, types.ErrNetworkInUse) {
					t.Fatalf("NetworkRemove() error = %v, want ErrNetworkInUse", err)
				}
			} else if !hasStatus(err, http.StatusForbidden) {
				t.Fatalf("NetworkRemove() error = %v, want wrapped permission error", err)
			}
		})
	}
}

func TestImagePullWithProgress_StreamErrorClosesResponse(t *testing.T) {
	t.Parallel()
	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	closed := make(chan struct{})
	c := newHTTPTestClient(t, func(w http.ResponseWriter, req *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if _, err := io.WriteString(
			w,
			`{"id":"layer","status":"Downloading","progressDetail":{"current":25,"total":100}}`+"\n"+
				`{"errorDetail":{"message":"registry unavailable"},"error":"registry unavailable"}`+"\n",
		); err != nil {
			t.Error(err)
		}
		if err := http.NewResponseController(w).Flush(); err != nil {
			t.Error(err)
		}
		<-req.Context().Done()
		close(closed)
	})
	var updates []types.ProgressUpdate
	err := c.ImagePullWithProgress(ctx, "alpine:latest", func(update types.ProgressUpdate) {
		updates = append(updates, update)
	})
	if !errors.Is(err, errImagePullFailed) || !strings.Contains(err.Error(), "registry unavailable") {
		t.Fatalf("ImagePullWithProgress() error = %v, want registry error", err)
	}
	if len(updates) != 1 || updates[0].Current != 25 || updates[0].Total != 100 {
		t.Fatalf("progress = %+v, want one update with current=25 total=100", updates)
	}
	select {
	case <-closed:
	case <-time.After(time.Second):
		t.Fatal("image pull response was not closed after a stream error")
	}
}

func TestCreateContainer_InvalidPortMappingFailsBeforeRequests(t *testing.T) {
	t.Parallel()
	c := newHTTPTestClient(t, func(w http.ResponseWriter, req *http.Request) {
		t.Errorf("unexpected request: %s %s", req.Method, req.URL)
		w.WriteHeader(http.StatusInternalServerError)
	})

	_, err := c.CreateContainer(t.Context(), types.ContainerConfig{
		Name:  "invalid-port",
		Image: "alpine:latest",
		Ports: []types.PortMapping{{HostIP: "localhost", HostPort: "8080", ContainerPort: "80"}},
	})
	if !errors.Is(err, errInvalidPortMapping) {
		t.Fatalf("CreateContainer() error = %v, want errInvalidPortMapping", err)
	}
}

func newHTTPTestClient(t *testing.T, handler http.HandlerFunc) *Client {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	api, err := newEngine("tcp://"+strings.TrimPrefix(server.URL, "http://"), nil)
	if err != nil {
		t.Fatalf("newEngine() error = %v", err)
	}
	api.version = "1.41"
	c := &Client{api: api}
	t.Cleanup(func() { closeBestEffort(c) })
	return c
}
