// Package proxy forwards apps' requests to the Altinn Platform's APIs, and adds a platform access token to
// those that have none.
package proxy

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strconv"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/propagation"
	semconv "go.opentelemetry.io/otel/semconv/v1.43.0"
	"go.opentelemetry.io/otel/semconv/v1.43.0/httpconv"
	"go.opentelemetry.io/otel/trace"

	commontelemetry "altinn.studio/common/telemetry"
	"altinn.studio/platform-proxy/internal/accesstoken"
	"altinn.studio/platform-proxy/internal/telemetry"
	"altinn.studio/platform-proxy/internal/telemetry/attr"
)

// The error.type values for requests the proxy could not complete.
const (
	errorTokenUnavailable = "access_token_unavailable"
	errorClientDropped    = "client_dropped"
	errorUpstreamTimeout  = "upstream_timeout"
	errorUpstreamFailed   = "upstream_failed"
	// errorResponseAborted means the upstream's response failed after its status was sent, so the app got a
	// truncated response that the server aborted.
	errorResponseAborted = "response_aborted"
)

// TokenIssuer issues platform access tokens.
type TokenIssuer interface {
	Token() (string, error)
}

// Proxy forwards requests to the platform.
type Proxy struct {
	logger   *slog.Logger
	issuer   TokenIssuer
	reverse  *httputil.ReverseProxy
	tracer   trace.Tracer
	duration metric.Float64Histogram
}

// New returns a proxy to upstream, the platform's origin, such as https://platform.altinn.no. Requests keep
// their path and query, which the platform's APIs are under.
func New(logger *slog.Logger, upstream *url.URL, issuer TokenIssuer) (*Proxy, error) {
	duration, err := httpconv.NewServerRequestDuration(telemetry.Meter())
	if err != nil {
		return nil, fmt.Errorf("create request duration histogram: %w", err)
	}
	p := &Proxy{logger: logger, issuer: issuer, tracer: telemetry.Tracer(), duration: duration.Inst()}
	p.reverse = &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {
			// Sets the Host header to the platform's. ReverseProxy has already removed any X-Forwarded
			// headers the app sent, and none are added: the platform has no use for pod addresses.
			pr.SetURL(upstream)
			// Only the trace context, so the platform's spans join the request's trace. Baggage is sent
			// as the app sent it.
			propagation.TraceContext{}.Inject(pr.Out.Context(), propagation.HeaderCarrier(pr.Out.Header))
		},
		Transport:    newTransport(),
		ErrorHandler: p.handleError,
		// What ReverseProxy logs itself is about the connection to the app, such as an app that goes away
		// during a download, so it is not something to act on.
		ErrorLog: slog.NewLogLogger(logger.Handler(), slog.LevelInfo),
	}
	return p, nil
}

// newTransport has no overall timeout and no timeout for the response headers: an upload of a large data
// element can take minutes, and the app's own HttpClient timeout decides how long it waits.
func newTransport() *http.Transport {
	return &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   5 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		TLSHandshakeTimeout:   5 * time.Second,
		ExpectContinueTimeout: time.Second,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          256,
		MaxIdleConnsPerHost:   256,
		IdleConnTimeout:       90 * time.Second,
	}
}

// request is what the proxy learns about a request while it handles it, for its span and metrics.
type request struct {
	start time.Time
	err   error
	// accessToken is one of the attr.AccessToken* values, or empty if the proxy did not get that far.
	accessToken string
	errorType   string
	method      string
	route       string
}

type requestKey struct{}

func (p *Proxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	req := &request{start: time.Now(), method: requestMethod(r.Method), route: Route(r.URL.Path)}
	ctx := otel.GetTextMapPropagator().Extract(r.Context(), propagation.HeaderCarrier(r.Header))
	// The span has no URL path or query: a path can hold a national identity number, and the route says
	// which of the platform's APIs the request is for.
	ctx, span := p.tracer.Start(
		ctx,
		req.method+" "+req.route,
		trace.WithSpanKind(trace.SpanKindServer),
		trace.WithAttributes(semconv.HTTPRequestMethodKey.String(req.method), semconv.HTTPRoute(req.route)),
	)
	defer span.End()
	ctx = context.WithValue(ctx, requestKey{}, req)
	r = r.WithContext(ctx)

	recorder := &statusRecorder{ResponseWriter: w}
	// Deferred so that a response ReverseProxy aborts with a panic is recorded too.
	defer func() {
		recovered := recover()
		if recovered != nil && req.errorType == "" {
			req.errorType = errorResponseAborted
		}
		p.record(ctx, span, req, recorder.status)
		if recovered != nil {
			panic(recovered)
		}
	}()

	if !p.addAccessToken(r, req) {
		writeProblem(
			ctx,
			p.logger,
			recorder,
			http.StatusServiceUnavailable,
			"The platform proxy cannot sign access tokens",
		)
		return
	}
	p.reverse.ServeHTTP(recorder, r)
}

// addAccessToken adds a platform access token to r if it has none, and reports whether r may be forwarded.
// A token the app sent is kept: the app signs it with the same certificate, and may name itself in it.
func (p *Proxy) addAccessToken(r *http.Request, req *request) bool {
	if r.Header.Get(accesstoken.Header) != "" {
		req.accessToken = attr.AccessTokenFromApp
		return true
	}
	token, err := p.issuer.Token()
	if err != nil {
		req.errorType, req.err = errorTokenUnavailable, err
		p.logger.ErrorContext(r.Context(), "Failed to issue a platform access token", attr.Error, err)
		return false
	}
	r.Header.Set(accesstoken.Header, token)
	req.accessToken = attr.AccessTokenAdded
	return true
}

// handleError answers a request that got no response from the platform.
func (p *Proxy) handleError(w http.ResponseWriter, r *http.Request, err error) {
	req := requestFrom(r.Context())
	status, level, message := http.StatusBadGateway, slog.LevelError, "Failed to forward a request to the platform"
	errorType := errorUpstreamFailed
	var netErr net.Error
	switch {
	// An app that gave up is not the proxy's error.
	case r.Context().Err() != nil:
		level, message, errorType = slog.LevelInfo, "The app gave up before the platform responded", errorClientDropped
	case errors.As(err, &netErr) && netErr.Timeout():
		status, errorType = http.StatusGatewayTimeout, errorUpstreamTimeout
	}
	req.errorType, req.err = errorType, err
	p.logger.Log(r.Context(), level, message, attr.HTTPRoute, req.route, attr.ErrorType, errorType, attr.Error, err)
	writeProblem(r.Context(), p.logger, w, status, "The platform did not respond")
}

func (p *Proxy) record(ctx context.Context, span trace.Span, req *request, status int) {
	attributes := []attribute.KeyValue{
		semconv.HTTPRequestMethodKey.String(req.method),
		semconv.HTTPRoute(req.route),
		// Apps reach the proxy over plain HTTP inside the cluster, where Linkerd encrypts it.
		semconv.URLScheme("http"),
	}
	if status != 0 {
		attributes = append(attributes, semconv.HTTPResponseStatusCode(status))
	}
	if req.accessToken != "" {
		attributes = append(attributes, attribute.String(attr.AccessToken, req.accessToken))
	}
	errorType := req.errorType
	// A 5xx from the platform is a failed request too, as the semantic conventions count it.
	if errorType == "" && status >= http.StatusInternalServerError {
		errorType = strconv.Itoa(status)
	}
	span.SetAttributes(attributes...)
	if errorType != "" {
		commontelemetry.SetError(span, errorType, req.err)
		attributes = append(attributes, semconv.ErrorTypeKey.String(errorType))
	}
	p.duration.Record(ctx, time.Since(req.start).Seconds(), metric.WithAttributes(attributes...))
}

// requestFrom returns the request ServeHTTP put in ctx. ReverseProxy only calls back with requests that
// ServeHTTP passed it, so it is always there.
func requestFrom(ctx context.Context) *request {
	req, ok := ctx.Value(requestKey{}).(*request)
	if !ok {
		panic("the platform proxy's request state is missing from the context")
	}
	return req
}

// requestMethod returns method if the semantic conventions know it, and _OTHER otherwise, so an unknown
// method does not add a series.
func requestMethod(method string) string {
	switch method {
	case http.MethodGet, http.MethodHead, http.MethodPost, http.MethodPut, http.MethodPatch,
		http.MethodDelete, http.MethodOptions, http.MethodConnect, http.MethodTrace:
		return method
	default:
		return "_OTHER"
	}
}

type problemDetails struct {
	Type   string `json:"type"`
	Title  string `json:"title"`
	Detail string `json:"detail"`
	Status int    `json:"status"`
}

func writeProblem(ctx context.Context, logger *slog.Logger, w http.ResponseWriter, status int, detail string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	err := json.NewEncoder(w).Encode(problemDetails{
		Type:   "https://tools.ietf.org/html/rfc9110#section-15.6",
		Title:  http.StatusText(status),
		Detail: detail,
		Status: status,
	})
	if err != nil {
		logger.InfoContext(ctx, "Failed to write an error response", attr.Error, err)
	}
}

// statusRecorder remembers the status of the response. Unwrap lets ReverseProxy flush and hijack the
// connection through http.ResponseController.
type statusRecorder struct {
	http.ResponseWriter

	status int
}

func (s *statusRecorder) WriteHeader(status int) {
	// An informational response, such as 100 Continue, comes before the final one.
	if s.status == 0 && status >= http.StatusOK {
		s.status = status
	}
	s.ResponseWriter.WriteHeader(status)
}

func (s *statusRecorder) Write(b []byte) (int, error) {
	if s.status == 0 {
		s.status = http.StatusOK
	}
	n, err := s.ResponseWriter.Write(b)
	if err != nil {
		return n, fmt.Errorf("write response: %w", err)
	}
	return n, nil
}

func (s *statusRecorder) Unwrap() http.ResponseWriter {
	return s.ResponseWriter
}
