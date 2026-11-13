// Package proxy forwards apps' requests to the Altinn Platform's APIs, and adds a platform access token to
// those that have none.
package proxy

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strconv"
	"strings"
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
	// errorUpstreamUnreachable means the proxy could not connect to the platform.
	errorUpstreamUnreachable = "upstream_unreachable"
	// errorUpstreamCertificate means the platform's certificate did not verify.
	errorUpstreamCertificate = "upstream_certificate"
	errorUpstreamFailed      = "upstream_failed"
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
			// Set on the outgoing request, after ReverseProxy has removed the hop-by-hop headers, and
			// replacing any empty values the app sent.
			if token := requestFrom(pr.In.Context()).token; token != "" {
				pr.Out.Header.Set(accesstoken.Header, token)
			}
			// Only the trace context, so the platform's spans join the request's trace. Baggage is sent
			// as the app sent it.
			propagation.TraceContext{}.Inject(pr.Out.Context(), propagation.HeaderCarrier(pr.Out.Header))
		},
		Transport:    newTransport(),
		ErrorHandler: p.handleError,
		// ReverseProxy's own messages quote errors that can hold the request or the response, such as a
		// malformed trailer. What they report, a response cut off on the way to the app, is in the request's
		// span and metrics as response_aborted.
		ErrorLog: log.New(io.Discard, "", 0),
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
	// err is the proxy's own error, never one from the transport, whose message can hold request content.
	err error
	// accessToken is one of the attr.AccessToken* values, or empty if the proxy did not get that far.
	accessToken string
	// token is the token the proxy adds, if the app sent none.
	token     string
	errorType string
	method    string
	route     string
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

	switch {
	// ReverseProxy would remove the header the token is in, so the platform would get none.
	case namesAccessTokenHopByHop(r.Header):
		writeProblem(ctx, p.logger, recorder, http.StatusBadRequest,
			"The Connection header must not name "+accesstoken.Header)
		return
	// A token the app sent is passed on as it is, even with more than one value, which the platform rejects:
	// the app signs it with the same certificate, and may name itself in it.
	case hasAccessToken(r.Header):
		req.accessToken = attr.AccessTokenFromApp
	default:
		token, err := p.issuer.Token()
		if err != nil {
			req.errorType, req.err = errorTokenUnavailable, err
			p.logger.ErrorContext(ctx, "Failed to issue a platform access token", attr.Error, err)
			writeProblem(ctx, p.logger, recorder, http.StatusServiceUnavailable,
				"The platform proxy cannot sign access tokens")
			return
		}
		req.token, req.accessToken = token, attr.AccessTokenAdded
	}
	p.reverse.ServeHTTP(recorder, r)
}

// hasAccessToken reports whether header has a token that is not empty.
func hasAccessToken(header http.Header) bool {
	for _, value := range header.Values(accesstoken.Header) {
		if value != "" {
			return true
		}
	}
	return false
}

// namesAccessTokenHopByHop reports whether the Connection header names the token's header, which makes it a
// hop-by-hop header that a proxy removes.
func namesAccessTokenHopByHop(header http.Header) bool {
	for _, value := range header.Values("Connection") {
		for name := range strings.SplitSeq(value, ",") {
			if strings.EqualFold(strings.TrimSpace(name), accesstoken.Header) {
				return true
			}
		}
	}
	return false
}

// handleError answers a request that got no response from the platform. It logs and records only what kind
// of failure it was: the error's message can quote the request or the response, such as a malformed header.
func (p *Proxy) handleError(w http.ResponseWriter, r *http.Request, err error) {
	req := requestFrom(r.Context())
	status, errorType := classify(err)
	level, message := slog.LevelError, "Failed to forward a request to the platform"
	// An app that gave up is not the proxy's error.
	if r.Context().Err() != nil {
		status, errorType = http.StatusBadGateway, errorClientDropped
		level, message = slog.LevelInfo, "The app gave up before the platform responded"
	}
	req.errorType = errorType
	p.logger.Log(r.Context(), level, message, attr.HTTPRoute, req.route, attr.ErrorType, errorType)
	writeProblem(r.Context(), p.logger, w, status, "The platform did not respond")
}

// classify returns the status to answer and the error.type for err, a failure to get a response from the
// platform.
func classify(err error) (int, string) {
	var netErr net.Error
	var opErr *net.OpError
	var certErr *tls.CertificateVerificationError
	switch {
	case errors.As(err, &netErr) && netErr.Timeout():
		return http.StatusGatewayTimeout, errorUpstreamTimeout
	case errors.As(err, &certErr):
		return http.StatusBadGateway, errorUpstreamCertificate
	case errors.As(err, &opErr) && opErr.Op == "dial":
		return http.StatusBadGateway, errorUpstreamUnreachable
	default:
		return http.StatusBadGateway, errorUpstreamFailed
	}
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

// problemDetails is an RFC 9457 problem. Its type is about:blank, so its title is the status's.
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
		Type:   "about:blank",
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
