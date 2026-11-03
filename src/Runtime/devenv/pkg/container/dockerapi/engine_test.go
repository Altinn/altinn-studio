package dockerapi

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"altinn.studio/devenv/pkg/container/types"
)

func TestExecWithIO_Upgrade(t *testing.T) {
	t.Parallel()
	c := newHTTPTestClient(t, func(w http.ResponseWriter, req *http.Request) {
		switch {
		case strings.HasSuffix(req.URL.Path, "/start"):
			drainAndClose(req.Body)
			conn, buffered, err := http.NewResponseController(w).Hijack()
			if err != nil {
				t.Error(err)
				return
			}
			defer closeBestEffort(conn)
			// The first frames arrive in the same packet as the headers, so the client has them buffered.
			_, err = conn.Write([]byte("HTTP/1.1 101 UPGRADED\r\nConnection: Upgrade\r\nUpgrade: tcp\r\n\r\n" +
				dockerLogFrame(1, "early ") + dockerLogFrame(2, "warning")))
			if err != nil {
				t.Error(err)
				return
			}
			stdin, err := io.ReadAll(buffered) // Ends when the client closes stdin.
			if err == nil {
				_, err = conn.Write([]byte(dockerLogFrame(1, "echo "+string(stdin))))
			}
			if err != nil {
				t.Error(err)
			}
		case strings.HasSuffix(req.URL.Path, "/json"):
			respond(t, w, `{"ExitCode":0}`)
		default:
			respond(t, w, `{"Id":"exec1"}`)
		}
	})

	var stdout, stderr bytes.Buffer
	if err := c.ExecWithIO(
		t.Context(),
		"ctr",
		[]string{"cat"},
		strings.NewReader("input"),
		&stdout,
		&stderr,
	); err != nil {
		t.Fatalf("ExecWithIO() error = %v", err)
	}
	if stdout.String() != "early echo input" || stderr.String() != "warning" {
		t.Fatalf(
			"stdout = %q, stderr = %q, want %q and %q",
			stdout.String(),
			stderr.String(),
			"early echo input",
			"warning",
		)
	}
}

func TestExecWithIO_Cancellation(t *testing.T) {
	t.Parallel()
	for _, tt := range []struct {
		name     string
		upgraded bool
	}{
		{name: "during the handshake"},
		{name: "after the handshake", upgraded: true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			ctx, cancel := context.WithCancel(t.Context())
			c := newHTTPTestClient(t, func(w http.ResponseWriter, req *http.Request) {
				if !strings.HasSuffix(req.URL.Path, "/start") {
					respond(t, w, `{"Id":"exec1"}`)
					return
				}
				conn, buffered, err := http.NewResponseController(w).Hijack()
				if err != nil {
					t.Error(err)
					return
				}
				defer closeBestEffort(conn)
				if tt.upgraded {
					respond(t, conn, "HTTP/1.1 101 UPGRADED\r\nConnection: Upgrade\r\nUpgrade: tcp\r\n\r\n")
				}
				cancel()
				holdUntilClosed(buffered)
			})

			done := make(chan error, 1)
			go func() { done <- c.ExecWithIO(ctx, "ctr", []string{"sleep", "60"}, nil, io.Discard, io.Discard) }()
			select {
			case err := <-done:
				if !errors.Is(err, context.Canceled) {
					t.Fatalf("ExecWithIO() error = %v, want context.Canceled", err)
				}
			case <-time.After(5 * time.Second):
				t.Fatal("ExecWithIO() did not return after cancellation")
			}
		})
	}
}

func TestDemux(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name, input, wantStdout, wantStderr, wantErr string
	}{
		{name: "empty"},
		{
			name:       "stdin stdout and stderr",
			input:      dockerLogFrame(0, "in ") + dockerLogFrame(1, "out") + dockerLogFrame(2, "err"),
			wantStdout: "in out", wantStderr: "err",
		},
		{name: "empty frame", input: dockerLogFrame(1, "") + dockerLogFrame(1, "out"), wantStdout: "out"},
		{
			name:       "daemon error in stream 3",
			input:      dockerLogFrame(1, "out") + dockerLogFrame(3, "boom") + dockerLogFrame(1, "ignored"),
			wantStdout: "out", wantErr: "error from daemon in stream: boom",
		},
		{name: "unknown stream", input: dockerLogFrame(4, "x"), wantErr: "unrecognized stream: 4"},
		{name: "truncated header", input: dockerLogFrame(1, "out")[:5]},
		{
			name:       "truncated frame",
			input:      dockerLogFrame(1, "out") + dockerLogFrame(2, "error")[:10],
			wantStdout: "out",
		},
		{name: "truncated daemon error", input: dockerLogFrame(3, "boom")[:10]},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			var stdout, stderr bytes.Buffer
			err := demux(&stdout, &stderr, strings.NewReader(tt.input))
			if gotErr := errorText(err); gotErr != tt.wantErr {
				t.Fatalf("demux() error = %q, want %q", gotErr, tt.wantErr)
			}
			if stdout.String() != tt.wantStdout || stderr.String() != tt.wantStderr {
				t.Fatalf("stdout = %q, stderr = %q, want %q and %q",
					stdout.String(), stderr.String(), tt.wantStdout, tt.wantStderr)
			}
		})
	}
}

func TestDemux_WriterErrors(t *testing.T) {
	t.Parallel()
	for _, want := range []error{io.EOF, io.ErrShortWrite} {
		t.Run(want.Error(), func(t *testing.T) {
			t.Parallel()
			writer := streamErrorWriter{err: want}
			err := demux(writer, io.Discard, strings.NewReader(dockerLogFrame(1, "output")))
			if !errors.Is(err, want) {
				t.Fatalf("demux() = %v, want %v", err, want)
			}
		})
	}
}

type streamErrorWriter struct{ err error }

func (w streamErrorWriter) Write([]byte) (int, error) {
	if errors.Is(w.err, io.ErrShortWrite) {
		return 0, nil
	}
	return 0, w.err
}

func TestNegotiate_PingFallsBackToGet(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name        string
		wantMethods string
		wantVersion string
		wantErr     string
		headStatus  int
		getStatus   int
	}{
		{name: "HEAD answers", headStatus: http.StatusOK, wantMethods: "HEAD", wantVersion: "1.43"},
		{
			name: "HEAD not allowed", headStatus: http.StatusMethodNotAllowed, getStatus: http.StatusOK,
			wantMethods: "HEAD GET", wantVersion: "1.43",
		},
		{
			name: "GET explains the error", headStatus: http.StatusInternalServerError,
			getStatus: http.StatusInternalServerError, wantMethods: "HEAD GET",
			wantErr: "Error response from daemon: daemon is starting",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			var methods []string
			var mu sync.Mutex
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
				mu.Lock()
				methods = append(methods, req.Method)
				mu.Unlock()
				w.Header().Set("Api-Version", "1.43")
				w.Header().Set("Content-Type", "application/json")
				status := tt.getStatus
				if req.Method == http.MethodHead {
					status = tt.headStatus
				}
				w.WriteHeader(status)
				if status != http.StatusOK {
					respond(t, w, `{"message":"daemon is starting"}`)
				}
			}))
			t.Cleanup(server.Close)
			api, err := newEngine("tcp://"+server.Listener.Addr().String(), nil)
			if err != nil {
				t.Fatal(err)
			}

			err = api.negotiate(t.Context())
			if errorText(err) != tt.wantErr || api.version != tt.wantVersion && err == nil {
				t.Fatalf("negotiate() = %q, %v; want %q, %q", api.version, err, tt.wantVersion, tt.wantErr)
			}
			mu.Lock()
			defer mu.Unlock()
			if got := strings.Join(methods, " "); got != tt.wantMethods {
				t.Fatalf("methods = %q, want %q", got, tt.wantMethods)
			}
		})
	}
}

func TestNew_TLSFromCertPath(t *testing.T) {
	recorder := &requestRecorder{t: t}
	server := httptest.NewUnstartedServer(http.HandlerFunc(recorder.serve))
	server.TLS = &tls.Config{ClientAuth: tls.RequireAnyClientCert, MinVersion: tls.VersionTLS12}
	server.StartTLS()
	t.Cleanup(server.Close)
	t.Setenv("DOCKER_HOST", "tcp://"+server.Listener.Addr().String())
	t.Setenv("DOCKER_API_VERSION", "")

	tests := []struct {
		name    string
		verify  string
		wantErr string
		files   []string
	}{
		{name: "verified", verify: "1", files: []string{"ca.pem", "cert.pem", "key.pem"}},
		{name: "unverified without a CA", files: []string{"cert.pem", "key.pem"}},
		{
			name:    "verified without a CA",
			verify:  "1",
			files:   []string{"cert.pem", "key.pem"},
			wantErr: "could not read CA certificate",
		},
		{name: "without a client certificate", files: []string{"ca.pem"}, wantErr: "could not load X509 key pair"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("DOCKER_CERT_PATH", writeCertPath(t, server, tt.files))
			t.Setenv("DOCKER_TLS_VERIFY", tt.verify)

			c, err := New(t.Context(), types.ContainerToolchain{})
			if tt.wantErr != "" {
				if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
					t.Fatalf("New() error = %v, want %q", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("New() error = %v", err)
			}
			t.Cleanup(func() { closeBestEffort(c) })
			var stdout bytes.Buffer
			if err := c.ExecWithIO(
				t.Context(),
				"ctr",
				[]string{"cat"},
				strings.NewReader("in"),
				&stdout,
				nil,
			); err != nil {
				t.Fatalf("ExecWithIO() over TLS error = %v", err)
			}
			if stdout.String() != "out" {
				t.Fatalf("stdout = %q, want %q", stdout.String(), "out")
			}
		})
	}
}

// writeCertPath writes the server's certificate as ca.pem and, as the client's own, cert.pem and key.pem.
func writeCertPath(t *testing.T, server *httptest.Server, files []string) string {
	t.Helper()
	cert := server.TLS.Certificates[0]
	key, err := x509.MarshalPKCS8PrivateKey(cert.PrivateKey)
	if err != nil {
		t.Fatal(err)
	}
	certPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: cert.Certificate[0]})
	contents := map[string][]byte{
		"ca.pem":   certPEM,
		"cert.pem": certPEM,
		"key.pem":  pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: key}),
	}
	dir := t.TempDir()
	for _, name := range files {
		if err := os.WriteFile(filepath.Join(dir, name), contents[name], 0o600); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}

func TestNewWithHost_ConnectionErrors(t *testing.T) {
	t.Parallel()
	listener, err := (&net.ListenConfig{}).Listen(t.Context(), "tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	closedPort := "tcp://" + listener.Addr().String()
	closeBestEffort(listener)
	missingSocket := "unix://" + filepath.Join(t.TempDir(), "docker.sock")

	tests := []struct{ host, want string }{
		{
			host: closedPort,
			want: "Cannot connect to the Docker daemon at " + closedPort + ". Is the docker daemon running?",
		},
		{host: missingSocket, want: "failed to connect to the docker API at " + missingSocket +
			"; check if the path is correct and if the daemon is running: dial unix"},
		{host: "/var/run/docker.sock", want: "unable to parse docker host `/var/run/docker.sock`"},
	}
	for _, tt := range tests {
		_, err := NewWithHost(t.Context(), tt.host, types.ContainerToolchain{})
		if err == nil || !strings.Contains(err.Error(), tt.want) {
			t.Errorf("NewWithHost(%s) error = %v, want %q", tt.host, err, tt.want)
		}
	}
}

// An unresolvable DOCKER_HOST is checked without a resolver, so the result does not depend on the network.
func TestConnectError_UnresolvedHost(t *testing.T) {
	t.Parallel()
	lookup := &net.DNSError{Err: "no such host", Name: "docker.invalid", IsNotFound: true}
	err := connectError("tcp://docker.invalid:2375", &url.Error{
		Op: "Head", URL: "http://docker.invalid:2375/_ping", Err: &net.OpError{Op: "dial", Net: "tcp", Err: lookup},
	})
	want := "failed to connect to the docker API at tcp://docker.invalid:2375: lookup docker.invalid: no such host"
	if errorText(err) != want {
		t.Fatalf("connectError() = %v, want %q", err, want)
	}
}

func TestEngine_ResponseErrors(t *testing.T) {
	t.Parallel()
	for _, tt := range []struct{ name, contentType, body, want string }{
		{"JSON message", "application/json", `{"message":" denied "}`, "Error response from daemon: denied"},
		{"JSON with charset", "application/json; charset=utf-8", `{"message":"denied"}`, "Error response from daemon: denied"},
		{"empty JSON message", "application/json", `{}`, "Error response from daemon: API returned a 403 (Forbidden) but provided no error-message"},
		{"malformed JSON", "application/json", `{`, "error reading JSON: unexpected end of JSON input"},
		{"plain text", "text/plain", " denied ", "Error response from daemon: denied"},
		{"JSON served as text", "text/plain", `{"message":"denied"}`, `Error response from daemon: {"message":"denied"}`},
		{"empty body", "application/json", "", "request returned 403 Forbidden for API route and version"},
		{"oversized body", "text/plain", strings.Repeat("x", maxErrorBodySize), "request returned 403 Forbidden with a message (> 1048576 bytes)"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			c := newHTTPTestClient(t, func(w http.ResponseWriter, _ *http.Request) {
				w.Header().Set("Content-Type", tt.contentType)
				w.WriteHeader(http.StatusForbidden)
				respond(t, w, tt.body)
			})
			_, err := c.ImageInspect(t.Context(), "image")
			if !hasStatus(err, http.StatusForbidden) || !strings.Contains(err.Error(), tt.want) {
				t.Fatalf("ImageInspect() error = %v, want status 403 and %q", err, tt.want)
			}
		})
	}
}

func TestEngine_DoesNotFollowRedirects(t *testing.T) {
	t.Parallel()
	for _, method := range []string{http.MethodGet, http.MethodPost} {
		t.Run(method, func(t *testing.T) {
			t.Parallel()
			c := newHTTPTestClient(t, func(w http.ResponseWriter, req *http.Request) {
				if strings.HasSuffix(req.URL.Path, "/redirected") {
					t.Error("client followed the redirect")
					return
				}
				http.Redirect(w, req, "/redirected", http.StatusMovedPermanently)
			})
			err := c.api.call(t.Context(), method, "/redirect", nil, nil, nil)
			if method == http.MethodGet && !hasStatus(err, http.StatusMovedPermanently) ||
				method != http.MethodGet && !errors.Is(err, errRedirect) {
				t.Fatalf("%s redirect error = %v", method, err)
			}
		})
	}
}

func TestEngine_NotModifiedIsSuccess(t *testing.T) {
	t.Parallel()
	c := newHTTPTestClient(t, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotModified)
	})
	if err := c.ContainerStart(t.Context(), "ctr"); err != nil {
		t.Fatalf("ContainerStart() error = %v, want nil for 304", err)
	}
	if err := c.ContainerStop(t.Context(), "ctr", nil); err != nil {
		t.Fatalf("ContainerStop() error = %v, want nil for 304", err)
	}
}

func TestExecWithIO_UpgradeRefused(t *testing.T) {
	t.Parallel()
	c := newHTTPTestClient(t, func(w http.ResponseWriter, req *http.Request) {
		if strings.HasSuffix(req.URL.Path, "/start") {
			w.WriteHeader(http.StatusNotFound)
			respond(t, w, `{"message":"exec disappeared"}`)
			return
		}
		respond(t, w, `{"Id":"exec1"}`)
	})
	err := c.Exec(t.Context(), "ctr", []string{"true"})
	if !errors.Is(err, errUpgradeRefused) || !strings.Contains(err.Error(), "received 404") {
		t.Fatalf("Exec() error = %v, want refused upgrade with status 404", err)
	}
}

// TestUserAgent is not parallel, since it sets the package's User-Agent.
func TestUserAgent(t *testing.T) {
	tests := []struct {
		name string
		set  string
		want string
	}{
		{name: "default", want: "altinn-devenv"},
		{name: "set", set: "studioctl/v1.2.3", want: "studioctl/v1.2.3"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.set != "" {
				previous := userAgent
				SetUserAgent(tt.set)
				t.Cleanup(func() { SetUserAgent(previous) })
			}
			var mu sync.Mutex
			got := map[string]string{}
			c := newHTTPTestClient(t, func(w http.ResponseWriter, req *http.Request) {
				mu.Lock()
				got[req.URL.Path] = req.Header.Get("User-Agent")
				mu.Unlock()
				if strings.HasSuffix(req.URL.Path, "/start") {
					w.WriteHeader(http.StatusNotFound)
					respond(t, w, `{"message":"no upgrade"}`)
					return
				}
				respond(t, w, `{"Id":"exec1"}`)
			})
			if err := c.Exec(t.Context(), "ctr", []string{"true"}); !errors.Is(err, errUpgradeRefused) {
				t.Fatalf("Exec() error = %v, want refused upgrade", err)
			}
			for _, path := range []string{"/v1.41/containers/ctr/exec", "/v1.41/exec/exec1/start"} {
				if got[path] != tt.want {
					t.Errorf("User-Agent of %s = %q, want %q", path, got[path], tt.want)
				}
			}
		})
	}
}

func respond(t *testing.T, w io.Writer, body string) {
	t.Helper()
	if _, err := io.WriteString(w, body); err != nil {
		t.Error(err)
	}
}

// holdUntilClosed reads until the client closes the connection, which ends the read with an error.
func holdUntilClosed(r io.Reader) {
	io.Copy(io.Discard, r) //nolint:errcheck // The error is the client closing the connection.
}

func errorText(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}
