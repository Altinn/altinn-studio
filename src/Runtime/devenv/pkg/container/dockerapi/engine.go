package dockerapi

import (
	"bytes"
	"cmp"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const (
	// minAPIVersion is the oldest API that negotiation accepts: Docker 19.03 and Podman 2.2.
	minAPIVersion = "1.40"
	// maxAPIVersion caps negotiation at the newest API the e2e tests ran against (Docker 29).
	maxAPIVersion = "1.56"

	// dummyHost is the HTTP host of requests over a socket or pipe, as moby's client sends it.
	dummyHost = "api.moby.localhost"
	// The connection settings are those of moby's client.
	dialTimeout      = 10 * time.Second
	maxIdleConns     = 6
	idleConnTimeout  = 30 * time.Second
	maxErrorBodySize = 1 << 20
)

// The error texts follow moby's client, since users read them in studioctl's output.
var (
	errInvalidHost       = errors.New("unable to parse docker host")
	errInvalidAPIVersion = errors.New("invalid API version")
	errAPIVersionFormat  = errors.New("must be formatted <major>.<minor>")
	errMinimumAPIVersion = errors.New("the minimum supported API version is")
	errNoCertificates    = errors.New("failed to append certificates from PEM file")
	errPermissionDenied  = errors.New("permission denied while trying to connect to the docker API")
	//nolint:staticcheck // ST1005: moby's capitalized text.
	errDaemonNotListening = errors.New("Cannot connect to the Docker daemon")
)

// apiError is a non-2xx daemon response.
type apiError struct {
	Message    string
	StatusCode int
}

func (e *apiError) Error() string {
	return e.Message
}

func isNotFound(err error) bool { return hasStatus(err, http.StatusNotFound) }
func isConflict(err error) bool { return hasStatus(err, http.StatusConflict) }

func hasStatus(err error, status int) bool {
	var apiErr *apiError
	return errors.As(err, &apiErr) && apiErr.StatusCode == status
}

// engine is a minimal Docker Engine API client.
type engine struct {
	http     *http.Client
	dial     func(context.Context) (net.Conn, error)
	daemon   string // The host as configured, for error messages.
	scheme   string
	host     string
	basePath string
	version  string
}

// newEngineFromEnv reads DOCKER_HOST, DOCKER_API_VERSION, DOCKER_CERT_PATH and DOCKER_TLS_VERIFY.
func newEngineFromEnv() (*engine, error) {
	var tlsConfig *tls.Config
	if certPath := os.Getenv("DOCKER_CERT_PATH"); certPath != "" {
		var err error
		if tlsConfig, err = tlsConfigFromCertPath(certPath, os.Getenv("DOCKER_TLS_VERIFY") != ""); err != nil {
			return nil, fmt.Errorf("configure TLS from %q: %w", "DOCKER_CERT_PATH="+certPath, err)
		}
	}
	host := os.Getenv("DOCKER_HOST")
	if host == "" {
		host = defaultHost
	}
	e, err := newEngine(host, tlsConfig)
	if err != nil {
		return nil, err
	}
	if version := strings.TrimSpace(os.Getenv("DOCKER_API_VERSION")); strings.TrimPrefix(version, "v") != "" {
		if e.version, err = parseAPIVersion(strings.TrimPrefix(version, "v")); err != nil {
			return nil, fmt.Errorf("%w (%s): %w", errInvalidAPIVersion, version, err)
		}
	}
	return e, nil
}

func newEngine(host string, tlsConfig *tls.Config) (*engine, error) {
	proto, address, ok := strings.Cut(host, "://")
	if !ok || address == "" {
		return nil, fmt.Errorf("%w `%s`", errInvalidHost, host)
	}
	e := &engine{daemon: host, scheme: "http", host: dummyHost}
	dialer := &net.Dialer{Timeout: dialTimeout}
	transport := &http.Transport{MaxIdleConns: maxIdleConns, IdleConnTimeout: idleConnTimeout, DisableCompression: true}
	transport.DialContext = func(ctx context.Context, _, _ string) (net.Conn, error) { return e.dial(ctx) }
	switch proto {
	case "unix":
		e.dial = func(ctx context.Context) (net.Conn, error) { return dialer.DialContext(ctx, proto, address) }
	case "npipe":
		e.dial = func(ctx context.Context) (net.Conn, error) { return dialPipe(ctx, address) }
	case "tcp":
		parsed, err := url.Parse(host)
		if err != nil {
			return nil, fmt.Errorf("%w `%s`: %w", errInvalidHost, host, err)
		}
		e.host, e.basePath = parsed.Host, strings.TrimSuffix(parsed.Path, "/")
		// Requests go through the proxy that HTTPS_PROXY names, and upgrades go direct, as with moby's client.
		transport.DialContext, transport.Proxy, transport.TLSClientConfig = dialer.DialContext, http.ProxyFromEnvironment, tlsConfig
		transport.DisableCompression = false
		e.dial = func(ctx context.Context) (net.Conn, error) { return dialer.DialContext(ctx, proto, e.host) }
		if tlsConfig != nil {
			e.scheme = "https"
			tlsDialer := &tls.Dialer{NetDialer: dialer, Config: tlsConfig}
			e.dial = func(ctx context.Context) (net.Conn, error) { return tlsDialer.DialContext(ctx, proto, e.host) }
		}
	default:
		return nil, fmt.Errorf("%w `%s`: unsupported protocol %q", errInvalidHost, host, proto)
	}
	e.http = &http.Client{Transport: transport}
	return e, nil
}

// tlsConfigFromCertPath loads cert.pem and key.pem, and ca.pem when the server is verified, as moby's client does.
func tlsConfigFromCertPath(certPath string, verify bool) (*tls.Config, error) {
	//nolint:gosec // DOCKER_TLS_VERIFY turns verification on, as with the docker CLI.
	cfg := &tls.Config{MinVersion: tls.VersionTLS12, InsecureSkipVerify: !verify}
	if verify {
		caFile := filepath.Join(certPath, "ca.pem")
		pem, err := os.ReadFile(caFile) //nolint:gosec // G304: DOCKER_CERT_PATH names the file.
		if err != nil {
			return nil, fmt.Errorf("could not read CA certificate %q: %w", caFile, err)
		}
		if cfg.RootCAs, err = x509.SystemCertPool(); err != nil {
			return nil, fmt.Errorf("failed to read system certificates: %w", err)
		}
		if !cfg.RootCAs.AppendCertsFromPEM(pem) {
			return nil, fmt.Errorf("%w: %q", errNoCertificates, caFile)
		}
	}
	cert, err := tls.LoadX509KeyPair(filepath.Join(certPath, "cert.pem"), filepath.Join(certPath, "key.pem"))
	if err != nil {
		return nil, fmt.Errorf("could not load X509 key pair: %w", err)
	}
	cfg.Certificates = []tls.Certificate{cert}
	return cfg, nil
}

// negotiate pings the daemon and picks min(daemon, maxAPIVersion) unless DOCKER_API_VERSION pinned one.
func (e *engine) negotiate(ctx context.Context) error {
	daemonVersion, err := e.ping(ctx)
	if err != nil || e.version != "" {
		return err
	}
	e.version = maxAPIVersion
	if daemonVersion == "" {
		return nil
	}
	if daemonVersion, err = parseAPIVersion(daemonVersion); err != nil {
		return err
	}
	if versionLess(daemonVersion, minAPIVersion) {
		return fmt.Errorf("API version %s is not supported by this client: %w %s",
			daemonVersion, errMinimumAPIVersion, minAPIVersion)
	}
	if versionLess(daemonVersion, maxAPIVersion) {
		e.version = daemonVersion
	}
	return nil
}

// ping reads the daemon's API version with HEAD /_ping, and retries with GET as moby's client does,
// since only a GET response has a body to explain an error.
func (e *engine) ping(ctx context.Context) (string, error) {
	resp, err := e.roundTrip(ctx, http.MethodHead, "/_ping", nil, nil) //nolint:bodyclose // drainAndClose closes it.
	if err == nil {
		drainAndClose(resp.Body)
		if resp.StatusCode == http.StatusOK {
			return resp.Header.Get("Api-Version"), nil
		}
	}
	//nolint:bodyclose // drainAndClose closes it.
	if resp, err = e.roundTrip(ctx, http.MethodGet, "/_ping", nil, nil); err != nil {
		return "", err
	}
	defer drainAndClose(resp.Body)
	if err := checkStatus(resp); err != nil {
		return "", err
	}
	return resp.Header.Get("Api-Version"), nil
}

// parseAPIVersion reads major.minor as moby's client does: 1.041 is 1.41, and 1.41.0 is invalid.
func parseAPIVersion(version string) (string, error) {
	major, minor, ok := strings.Cut(version, ".")
	if !ok {
		return "", errAPIVersionFormat
	}
	majorNumber, err := strconv.Atoi(major)
	if err != nil {
		return "", fmt.Errorf("invalid major version: %w", errAPIVersionFormat)
	}
	minorNumber, err := strconv.Atoi(minor)
	if err != nil {
		return "", fmt.Errorf("invalid minor version: %w", errAPIVersionFormat)
	}
	return strconv.Itoa(majorNumber) + "." + strconv.Itoa(minorNumber), nil
}

// versionLess compares versions that parseAPIVersion returned, whose numbers have no leading zeros.
func versionLess(a, b string) bool {
	aMajor, aMinor, _ := strings.Cut(a, ".")
	bMajor, bMinor, _ := strings.Cut(b, ".")
	return cmp.Or(compareNumbers(aMajor, bMajor), compareNumbers(aMinor, bMinor)) < 0
}

func compareNumbers(a, b string) int {
	return cmp.Or(cmp.Compare(len(a), len(b)), strings.Compare(a, b))
}

func (e *engine) url(path string, query url.Values) string {
	if path != "/_ping" {
		path = "/v" + e.version + path
	}
	u := url.URL{Scheme: e.scheme, Host: e.host, Path: e.basePath + path, RawQuery: query.Encode()}
	return u.String()
}

func (e *engine) newRequest(
	ctx context.Context,
	method, path string,
	query url.Values,
	body any,
) (*http.Request, error) {
	var reader io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("encode %s request: %w", path, err)
		}
		reader = bytes.NewReader(data)
	}
	req, err := http.NewRequestWithContext(ctx, method, e.url(path, query), reader)
	if err != nil {
		return nil, fmt.Errorf("build %s request: %w", path, err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	return req, nil
}

func (e *engine) roundTrip(
	ctx context.Context,
	method, path string,
	query url.Values,
	body any,
) (*http.Response, error) {
	req, err := e.newRequest(ctx, method, path, query, body)
	if err != nil {
		return nil, err
	}
	resp, err := e.http.Do(req)
	if err != nil {
		return nil, connectError(e.daemon, err)
	}
	return resp, nil
}

// connectError words a failed connection as moby's client does.
func connectError(host string, err error) error {
	var netErr net.Error
	switch {
	case errors.Is(err, context.Canceled), errors.Is(err, context.DeadlineExceeded):
		return err
	case errors.Is(err, os.ErrPermission):
		return fmt.Errorf("%w at %s", errPermissionDenied, host)
	case errors.Is(err, os.ErrNotExist):
		return fmt.Errorf("failed to connect to the docker API at %s; "+
			"check if the path is correct and if the daemon is running: %w", host, errors.Unwrap(err))
	case errors.As(err, &netErr) && (netErr.Timeout() || strings.Contains(err.Error(), "connection refused")):
		return fmt.Errorf("%w at %s. Is the docker daemon running?", errDaemonNotListening, host)
	}
	return fmt.Errorf("error during connect: %w", err)
}

// stream sends a request and returns the open response body for a 2xx status.
func (e *engine) stream(ctx context.Context, method, path string, query url.Values, body any) (io.ReadCloser, error) {
	resp, err := e.roundTrip(ctx, method, path, query, body)
	if err != nil {
		return nil, err
	}
	if err := checkStatus(resp); err != nil {
		drainAndClose(resp.Body)
		return nil, err
	}
	return resp.Body, nil
}

// call sends a request and decodes a JSON response into out when out is non-nil.
func (e *engine) call(ctx context.Context, method, path string, query url.Values, body, out any) error {
	rc, err := e.stream(ctx, method, path, query, body)
	if err != nil {
		return err
	}
	defer drainAndClose(rc)
	if out == nil {
		return nil
	}
	if err := json.NewDecoder(rc).Decode(out); err != nil {
		return fmt.Errorf("decode %s response: %w", path, err)
	}
	return nil
}

// checkStatus returns the daemon's error for a 4xx or 5xx status.
func checkStatus(resp *http.Response) error {
	if resp.StatusCode >= http.StatusOK && resp.StatusCode < http.StatusBadRequest {
		return nil
	}
	return responseError(resp)
}

func responseError(resp *http.Response) error {
	data, err := io.ReadAll(io.LimitReader(resp.Body, maxErrorBodySize))
	message := strings.TrimSpace(string(data))
	var body struct {
		Message string `json:"message"`
	}
	if json.Unmarshal(data, &body) == nil && body.Message != "" {
		message = strings.TrimSpace(body.Message)
	}
	if message == "" || err != nil {
		message = fmt.Sprintf("request returned %s for API route and version %s, "+
			"check if the server supports the requested API version", resp.Status, resp.Request.URL)
	} else {
		message = "Error response from daemon: " + message
	}
	return &apiError{StatusCode: resp.StatusCode, Message: message}
}

//nolint:errcheck,gosec // Draining lets the transport reuse the connection; errors are irrelevant.
func drainAndClose(rc io.ReadCloser) {
	io.Copy(io.Discard, io.LimitReader(rc, maxErrorBodySize))
	rc.Close()
}

func (e *engine) close() {
	e.http.CloseIdleConnections()
}

func forceQuery(force bool) url.Values {
	query := url.Values{}
	if force {
		query.Set("force", "1")
	}
	return query
}

// filtersQuery sets the filters parameter that list endpoints take: {"label": {"key=value": true}}.
func filtersQuery(query url.Values, labels map[string]string) {
	if len(labels) == 0 {
		return
	}
	set := make(map[string]bool, len(labels))
	for key, value := range labels {
		if value != "" {
			key += "=" + value
		}
		set[key] = true
	}
	data, _ := json.Marshal(map[string]map[string]bool{"label": set}) //nolint:errcheck,errchkjson // Always encodes.
	query.Set("filters", string(data))
}
