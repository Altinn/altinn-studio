package dockerapi

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"

	"altinn.studio/devenv/pkg/container/types"
)

// The golden files in testdata/requests were recorded with -update from github.com/moby/moby/client v0.6.2,
// the client this package used before it spoke the Engine API itself.
var updateGolden = flag.Bool("update", false, "rewrite testdata/requests from the current client")

var apiVersionPrefix = regexp.MustCompile(`^/v[0-9]+\.[0-9]+`)

const testDigest = "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

func TestRequests_MatchGolden(t *testing.T) {
	t.Parallel()
	scenarios := map[string]func(context.Context, *Client) error{
		"create-container": func(ctx context.Context, c *Client) error {
			_, err := c.CreateContainer(ctx, goldenContainerConfig())
			return err
		},
		"exec": func(ctx context.Context, c *Client) error {
			return c.ExecWithIO(ctx, "ctr", []string{"sh", "-c", "cat"}, strings.NewReader("stdin"), io.Discard, nil)
		},
		"network":             runNetworkCalls,
		"image":               runImageCalls,
		"container-lifecycle": runContainerCalls,
	}
	for name, run := range scenarios {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			recorder := &requestRecorder{t: t}
			c := newHTTPTestClient(t, recorder.serve)
			c.toolchain.Platform = types.PlatformPodman
			if err := run(t.Context(), c); err != nil {
				t.Fatalf("%s: %v", name, err)
			}
			compareGolden(t, name, recorder.recorded)
		})
	}
}

func goldenContainerConfig() types.ContainerConfig {
	return types.ContainerConfig{
		Name:    "devenv-ctr",
		Image:   "registry:2",
		Command: []string{"serve", "--verbose"},
		Env:     []string{"A=1"},
		Labels:  map[string]string{"altinn.studio/devenv": "true"},
		User:    "1000:1000",
		Ports: []types.PortMapping{
			{HostIP: "127.0.0.1", HostPort: "5001", ContainerPort: "5000"},
			{HostPort: "5353", ContainerPort: "53", Protocol: "udp"},
		},
		Volumes: []types.VolumeMount{
			{HostPath: "/data", ContainerPath: "/var/lib/registry", Type: types.VolumeMountTypeBind},
			{HostPath: "cache", ContainerPath: "/cache", Type: types.VolumeMountTypeVolume, ReadOnly: true},
			{
				HostPath: "/src", ContainerPath: "/src", Type: types.VolumeMountTypeBind, ReadOnly: true,
				SELinuxRelabel: types.SELinuxRelabelShared,
			},
		},
		Networks:       []string{"primary", "secondary"},
		NetworkAliases: []string{"registry"},
		ExtraHosts:     []string{"host.docker.internal:host-gateway"},
		RestartPolicy:  "unless-stopped",
		UsernsMode:     "keep-id",
		CapAdd:         []string{"net_admin"},
		HealthCheck: &types.HealthCheck{
			Test:     []string{"CMD", "true"},
			Interval: time.Second,
			Timeout:  2 * time.Second,
			Retries:  3,
		},
		Detach: true,
	}
}

func runNetworkCalls(ctx context.Context, c *Client) error {
	if _, err := c.NetworkCreate(
		ctx,
		types.NetworkConfig{Name: "net", Labels: map[string]string{"a": "b"}},
	); err != nil {
		return err
	}
	if _, err := c.NetworkInspect(ctx, "net"); err != nil {
		return err
	}
	if _, err := c.ListNetworks(
		ctx,
		types.NetworkListFilter{Labels: map[string]string{"a": "b", "c": ""}},
	); err != nil {
		return err
	}
	if err := c.NetworkConnect(ctx, "net", "ctr"); err != nil {
		return err
	}
	return c.NetworkRemove(ctx, "net")
}

func runImageCalls(ctx context.Context, c *Client) error {
	for _, ref := range []string{
		"alpine",
		"alpine:3.20",
		"user/app:1.0",
		"index.docker.io/user/app",
		"ghcr.io/altinn/studio:v1",
		"localhost:5001/runtime/app:dev",
		"localhost/app",
		"alpine:3.20@" + testDigest,
	} {
		if err := c.ImagePull(ctx, ref); err != nil {
			return err
		}
	}
	if err := c.Tag(ctx, "app:build", "localhost:5001/app:dev"); err != nil {
		return err
	}
	return c.Tag(ctx, "app:build", "app")
}

func runContainerCalls(ctx context.Context, c *Client) error {
	if _, err := c.ListContainers(
		ctx,
		types.ContainerListFilter{All: true, Labels: map[string]string{"a": "b"}},
	); err != nil {
		return err
	}
	if _, err := c.ContainerInspect(ctx, "ctr"); err != nil {
		return err
	}
	if err := c.ContainerStart(ctx, "ctr"); err != nil {
		return err
	}
	logs, err := c.ContainerLogs(ctx, "ctr", true, "100")
	if err != nil {
		return err
	}
	if _, err := io.Copy(io.Discard, logs); err != nil {
		return fmt.Errorf("read logs: %w", err)
	}
	if err := logs.Close(); err != nil {
		return fmt.Errorf("close logs: %w", err)
	}
	if _, err := c.ContainerWait(ctx, "ctr"); err != nil {
		return err
	}
	timeout := 5
	if err := c.ContainerStop(ctx, "ctr", &timeout); err != nil {
		return err
	}
	if err := c.ContainerRemove(ctx, "ctr", true); err != nil {
		return err
	}
	return c.VolumeRemove(ctx, "vol", true)
}

// recordedRequest is what the daemon acts on in a request.
type recordedRequest struct {
	Query  map[string]any    `json:"query,omitempty"`
	Header map[string]string `json:"header,omitempty"`
	Body   any               `json:"body,omitempty"`
	Method string            `json:"method"`
	Path   string            `json:"path"`
}

type requestRecorder struct {
	t        *testing.T
	recorded []recordedRequest
	mu       sync.Mutex
}

func (r *requestRecorder) serve(w http.ResponseWriter, req *http.Request) {
	body, err := io.ReadAll(req.Body)
	if err != nil {
		r.t.Error(err)
	}
	path := apiVersionPrefix.ReplaceAllString(req.URL.Path, "")
	r.record(req, path, body)

	w.Header().Set("Content-Type", "application/json")
	switch {
	case strings.HasPrefix(path, "/exec/") && strings.HasSuffix(path, "/start"):
		serveExecStart(r.t, w)
		return
	case strings.HasPrefix(path, "/images/") && strings.HasSuffix(path, "/json"):
		w.WriteHeader(http.StatusNotFound)
		_, err = io.WriteString(w, `{"message":"no such image"}`)
	case path == "/images/create":
		_, err = io.WriteString(w, `{"status":"Downloaded"}`+"\n")
	case path == "/containers/json" || path == "/networks":
		_, err = io.WriteString(w, `[]`)
	case strings.HasPrefix(path, "/containers/") && strings.HasSuffix(path, "/json"):
		_, err = io.WriteString(w, `{"Id":"id1","Config":{},"State":{},"NetworkSettings":{}}`)
	case strings.HasSuffix(path, "/logs"):
	case strings.HasPrefix(path, "/exec/"):
		_, err = io.WriteString(w, `{"ExitCode":0}`)
	case strings.HasSuffix(path, "/wait"):
		_, err = io.WriteString(w, `{"StatusCode":0}`)
	default:
		_, err = io.WriteString(w, `{"Id":"id1"}`)
	}
	if err != nil {
		r.t.Error(err)
	}
}

func (r *requestRecorder) record(req *http.Request, path string, body []byte) {
	recorded := recordedRequest{Method: req.Method, Path: path, Query: queryValues(r.t, req.URL.Query())}
	for _, name := range []string{"Content-Type", "Connection", "Upgrade", "X-Registry-Auth"} {
		if value := req.Header.Get(name); value != "" {
			if recorded.Header == nil {
				recorded.Header = map[string]string{}
			}
			recorded.Header[name] = value
		}
	}
	if len(body) > 0 {
		if err := json.Unmarshal(body, &recorded.Body); err != nil {
			r.t.Errorf("%s %s body: %v", req.Method, path, err)
		}
		recorded.Body = withoutZeroValues(recorded.Body, false)
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.recorded = append(r.recorded, recorded)
}

// serveExecStart upgrades the connection, writes one stdout frame and closes once stdin is closed.
func serveExecStart(t *testing.T, w http.ResponseWriter) {
	t.Helper()
	conn, buffered, err := http.NewResponseController(w).Hijack()
	if err != nil {
		t.Error(err)
		return
	}
	defer closeBestEffort(conn)
	_, err = buffered.WriteString("HTTP/1.1 101 UPGRADED\r\nConnection: Upgrade\r\nUpgrade: tcp\r\n\r\n" +
		dockerLogFrame(1, "out"))
	if err == nil {
		err = buffered.Flush()
	}
	if err == nil {
		_, err = io.Copy(io.Discard, buffered)
	}
	if err != nil {
		t.Error(err)
	}
}

func queryValues(t *testing.T, query url.Values) map[string]any {
	t.Helper()
	if len(query) == 0 {
		return nil
	}
	values := make(map[string]any, len(query))
	for key, value := range query {
		values[key] = value
		if key == "filters" {
			var filters any
			if err := json.Unmarshal([]byte(value[0]), &filters); err != nil {
				t.Errorf("filters %q: %v", value[0], err)
			}
			values[key] = filters
		}
	}
	return values
}

// withoutZeroValues drops what the daemon reads as the zero value when absent: null, "", false, 0, and arrays
// and objects of only those. The entries of ExposedPorts stay, since their keys are the data.
func withoutZeroValues(value any, isSet bool) any {
	switch v := value.(type) {
	case map[string]any:
		for key, field := range v {
			if isSet {
				continue
			}
			if field = withoutZeroValues(field, key == "ExposedPorts"); field == nil {
				delete(v, key)
			} else {
				v[key] = field
			}
		}
		if len(v) == 0 {
			return nil
		}
	case []any:
		zero := true
		for i := range v {
			v[i] = withoutZeroValues(v[i], false)
			zero = zero && v[i] == nil
		}
		if zero {
			return nil
		}
	case string:
		if v == "" {
			return nil
		}
	case bool:
		if !v {
			return nil
		}
	case float64:
		if v == 0 {
			return nil
		}
	}
	return value
}

func compareGolden(t *testing.T, name string, recorded []recordedRequest) {
	t.Helper()
	lines := make([]string, 0, len(recorded))
	for _, request := range recorded {
		line, err := json.Marshal(request)
		if err != nil {
			t.Fatal(err)
		}
		lines = append(lines, string(line))
	}
	got := "[\n" + strings.Join(lines, ",\n") + "\n]\n"
	path := filepath.Join("testdata", "requests", name+".json")
	if *updateGolden {
		if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(got), 0o600); err != nil {
			t.Fatal(err)
		}
		return
	}
	want, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if got != string(want) {
		t.Errorf("requests differ from %s:\ngot:\n%s\nwant:\n%s", path, got, want)
	}
}
