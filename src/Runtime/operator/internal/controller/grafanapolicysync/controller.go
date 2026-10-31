//nolint:cyclop,errcheck,funlen,gocognit,gocyclo,govet,nestif // Production controller behavior is kept close to the pre-refactor implementation; suppress controller-local lint findings rather than riskier rewrites.
package grafanapolicysync

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	commontelemetry "altinn.studio/common/telemetry"
	"altinn.studio/operator/internal/telemetry"

	"github.com/go-logr/logr"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/attribute"
	semconv "go.opentelemetry.io/otel/semconv/v1.43.0"
	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"altinn.studio/operator/internal/assert"
	"altinn.studio/operator/internal/grafanaapi"
	"altinn.studio/operator/internal/operatorcontext"
	rt "altinn.studio/operator/internal/runtime"
)

const (
	defaultPollInterval  = 10 * time.Minute
	shortRetryInterval   = 10 * time.Second
	initialRetryAttempts = 10

	// Grafana is close by, so a connection that takes seconds to set up has stalled. A fresh one
	// on the next attempt usually gets through, so fail fast instead of waiting out Go's
	// defaults (30 s to connect, 10 s for the TLS handshake).
	connectTimeout      = 5 * time.Second
	requestTimeout      = 15 * time.Second
	requestAttempts     = 3
	initialRequestDelay = 1 * time.Second

	grafanaNamespace = "grafana"
	grafanaName      = "external-grafana"

	tokenSecretName = "external-grafana-altinn-studio-gateway-token"
	tokenSecretKey  = "token"

	policiesPath = "/api/v1/provisioning/policies"

	managedReceiver       = "altinn-studio-gateway"
	managedRepeatInterval = "5m"
	matcherLabel          = "Type"
	matcherOperator       = "="
	matcherValue          = "Altinn"
)

type rawObject map[string]json.RawMessage

var (
	errTokenSecretKeyMissing   = errors.New("token secret missing key")
	errGrafanaExternalURLUnset = errors.New("grafana CR has no external URL")
	errGetPolicyTreeStatus     = errors.New("GET policy tree returned non-success status")
	errPutPolicyTreeStatus     = errors.New("PUT policy tree returned non-success status")
	errPolicyTreeFieldMissing  = errors.New("policy tree missing required field")
)

// +kubebuilder:rbac:groups="",resources=secrets,verbs=get;list;watch
// +kubebuilder:rbac:groups=grafana.integreatly.org,resources=grafanas,verbs=get;list;watch

// Reconciler periodically syncs the Altinn route into Grafana notification policies
// using read-modify-write to avoid overwriting unrelated UI-managed routes.
type Reconciler struct {
	k8sClient    client.Client
	runtime      rt.Runtime
	httpClient   *http.Client
	logger       logr.Logger
	pollInterval time.Duration
	retryDelay   time.Duration
}

func NewReconciler(runtime rt.Runtime, k8sClient client.Client) *Reconciler {
	return &Reconciler{
		logger:    log.FromContext(context.Background()).WithName("grafanapolicysync"),
		k8sClient: k8sClient,
		runtime:   runtime,
		httpClient: &http.Client{
			Timeout:   requestTimeout,
			Transport: otelhttp.NewTransport(newTransport()),
		},
		pollInterval: defaultPollInterval,
		retryDelay:   initialRequestDelay,
	}
}

func newTransport() *http.Transport {
	defaultTransport, ok := http.DefaultTransport.(*http.Transport)
	assert.That(ok, "http.DefaultTransport should be an *http.Transport")
	transport := defaultTransport.Clone()
	transport.DialContext = (&net.Dialer{
		Timeout:   connectTimeout,
		KeepAlive: 30 * time.Second,
	}).DialContext
	transport.TLSHandshakeTimeout = connectTimeout
	return transport
}

func NewReconcilerForTesting(
	runtime rt.Runtime,
	k8sClient client.Client,
	httpClient *http.Client,
) *Reconciler {
	if httpClient == nil {
		httpClient = &http.Client{
			Timeout: requestTimeout,
		}
	}
	return &Reconciler{
		logger:       log.FromContext(context.Background()).WithName("grafanapolicysync"),
		k8sClient:    k8sClient,
		runtime:      runtime,
		httpClient:   httpClient,
		pollInterval: defaultPollInterval,
		retryDelay:   initialRequestDelay,
	}
}

func (r *Reconciler) NeedLeaderElection() bool {
	return true
}

func (r *Reconciler) Start(ctx context.Context) error {
	environment := r.runtime.GetOperatorContext().Environment
	if !hasExternalGrafana(environment) {
		r.logger.Info(
			"skipping Grafana policy sync controller",
			"environment", environment,
		)
		return nil
	}

	clock := r.runtime.GetClock()
	defer func() {
		r.logger.Info("exiting Grafana policy sync controller")
		assert.That(ctx.Err() != nil, "context should be cancelled when shutting down")
	}()

	r.logger.Info(
		"starting Grafana policy sync controller",
		"pollInterval", r.pollInterval,
		"environment", environment,
	)

	// A failed run logs its own ERROR, linked to its trace.
	for range initialRetryAttempts {
		if err := r.SyncAll(ctx); err != nil {
			select {
			case <-ctx.Done():
				return nil
			case <-clock.After(shortRetryInterval):
				continue
			}
		}
		break
	}

	ticker := clock.NewTicker(r.pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.Chan():
			_ = r.SyncAll(ctx) //nolint:errcheck // A failed run logs its own ERROR, linked to its trace.
		}
	}
}

const controllerName = "grafanapolicysync"

func (r *Reconciler) SyncAll(ctx context.Context) error {
	opCtx := r.runtime.GetOperatorContext()
	environment := opCtx.Environment
	assert.That(
		hasExternalGrafana(environment),
		"grafanapolicysync.SyncAll must only run in supported environments",
		"environment", environment,
	)

	ctx, span := telemetry.StartRun(ctx, controllerName, "grafanapolicysync.SyncAll")
	defer span.End()
	withErrorStatus := func(err error, errorType string) error {
		commontelemetry.SetError(span, errorType, err)
		return err
	}

	grafanaURL, token, err := r.getGrafanaCredentials(ctx)
	if err != nil {
		return withErrorStatus(err, "get_grafana_credentials")
	}
	if host := grafanaHost(grafanaURL); host != "" {
		span.SetAttributes(semconv.ServerAddress(host))
	}

	rawTree, err := r.getPolicyTree(ctx, grafanaURL, token)
	if err != nil {
		return withErrorStatus(err, "get_policy_tree")
	}

	updatedTree, changed, err := upsertManagedRoute(rawTree)
	if err != nil {
		return withErrorStatus(err, "upsert_managed_route")
	}
	span.SetAttributes(attribute.Bool("altinn.operator.grafanapolicysync.policy_changed", changed))
	if !changed {
		return nil
	}

	span.SetAttributes(
		attribute.String("altinn.studio.sampling", "always"),
		attribute.Int("altinn.operator.grafanapolicysync.policy_bytes", len(updatedTree)),
	)

	if err := r.putPolicyTree(ctx, grafanaURL, token, updatedTree); err != nil {
		return withErrorStatus(err, "put_policy_tree")
	}
	r.logger.Info("synced managed Grafana notification route")
	return nil
}

func (r *Reconciler) getGrafanaCredentials(ctx context.Context) (string, string, error) {
	secret := &corev1.Secret{}
	secretKey := client.ObjectKey{Name: tokenSecretName, Namespace: grafanaNamespace}
	if err := r.k8sClient.Get(ctx, secretKey, secret); err != nil {
		return "", "", fmt.Errorf("get token secret: %w", err)
	}
	tokenBytes, ok := secret.Data[tokenSecretKey]
	if !ok || len(tokenBytes) == 0 {
		return "", "", fmt.Errorf("%w %q", errTokenSecretKeyMissing, tokenSecretKey)
	}

	grafana := grafanaapi.NewGrafana(grafanaNamespace, grafanaName)
	grafanaKey := client.ObjectKey{Name: grafanaName, Namespace: grafanaNamespace}
	if err := r.k8sClient.Get(ctx, grafanaKey, grafana); err != nil {
		return "", "", fmt.Errorf("get grafana CR: %w", err)
	}
	grafanaURL, hasExternal, err := grafanaapi.ExternalURL(grafana)
	if err != nil {
		return "", "", fmt.Errorf("read grafana external URL: %w", err)
	}
	if !hasExternal || strings.TrimSpace(grafanaURL) == "" {
		return "", "", errGrafanaExternalURLUnset
	}

	return strings.TrimRight(grafanaURL, "/"), string(tokenBytes), nil
}

func (r *Reconciler) getPolicyTree(ctx context.Context, grafanaURL, token string) (json.RawMessage, error) {
	resp, err := r.doWithRetry(ctx, func() (*http.Request, error) {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, grafanaURL+policiesPath, nil)
		if err != nil {
			return nil, fmt.Errorf("build GET policy request: %w", err)
		}
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Accept", "application/json")
		return req, nil
	})
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4*1024))
		return nil, fmt.Errorf("%w: %d: %s", errGetPolicyTreeStatus, resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read GET policy tree response: %w", err)
	}
	if len(bytes.TrimSpace(body)) == 0 {
		return json.RawMessage(`{}`), nil
	}
	return json.RawMessage(body), nil
}

func (r *Reconciler) putPolicyTree(ctx context.Context, grafanaURL, token string, tree json.RawMessage) error {
	resp, err := r.doWithRetry(ctx, func() (*http.Request, error) {
		req, err := http.NewRequestWithContext(
			ctx,
			http.MethodPut,
			grafanaURL+policiesPath,
			bytes.NewReader(tree),
		)
		if err != nil {
			return nil, fmt.Errorf("build PUT policy request: %w", err)
		}
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Disable-Provenance", "true")
		return req, nil
	})
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4*1024))
		return fmt.Errorf("%w: %d: %s", errPutPolicyTreeStatus, resp.StatusCode, string(body))
	}
	return nil
}

// doWithRetry sends a request built by newRequest, and sends it again after a transport error, a
// 429 or a 5xx, up to requestAttempts times with doubling delays. Each attempt is its own client
// span, so the trace keeps the failed attempts, but the run fails only when the last one does. It
// returns the last attempt's response or error. Both requests are idempotent: a PUT that reached
// Grafana before its response was lost writes the same tree again.
func (r *Reconciler) doWithRetry(
	ctx context.Context,
	newRequest func() (*http.Request, error),
) (*http.Response, error) {
	clock := r.runtime.GetClock()
	delay := r.retryDelay
	for attempt := 1; ; attempt++ {
		req, err := newRequest()
		if err != nil {
			return nil, err
		}
		resp, err := r.httpClient.Do(req)
		if attempt == requestAttempts || ctx.Err() != nil || !isRetryable(resp, err) {
			if err != nil {
				return nil, fmt.Errorf("%s policy tree: %w", req.Method, err)
			}
			return resp, nil
		}

		var reason string
		if err != nil {
			reason = err.Error()
		} else {
			reason = resp.Status
			_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4*1024))
			_ = resp.Body.Close()
		}
		log.FromContext(ctx).Info(
			"retrying Grafana request",
			"method", req.Method,
			"attempt", attempt,
			"reason", reason,
			"delay", delay,
		)

		select {
		case <-ctx.Done():
			return nil, fmt.Errorf("wait to retry Grafana request: %w", ctx.Err())
		case <-clock.After(delay):
		}
		delay *= 2
	}
}

func isRetryable(resp *http.Response, err error) bool {
	if err != nil {
		return true
	}
	return resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= http.StatusInternalServerError
}

func hasExternalGrafana(environment string) bool {
	return environment == operatorcontext.EnvironmentProd || environment == "tt02"
}

func upsertManagedRoute(rawTree json.RawMessage) (json.RawMessage, bool, error) {
	root, err := decodeObject(rawTree)
	if err != nil {
		return nil, false, fmt.Errorf("decode policy tree: %w", err)
	}
	if err := validateRequiredPolicyFields(root); err != nil {
		return nil, false, err
	}

	changed := false

	routes, err := getRoutes(root)
	if err != nil {
		return nil, false, err
	}
	if len(routes) == 0 {
		managedRouteRaw, marshalErr := marshalRaw(newManagedRouteObject())
		if marshalErr != nil {
			return nil, false, marshalErr
		}
		updatedRoutes, marshalErr := marshalRaw([]json.RawMessage{managedRouteRaw})
		if marshalErr != nil {
			return nil, false, marshalErr
		}
		root["routes"] = updatedRoutes
		updatedTree, marshalErr := marshalRaw(root)
		return updatedTree, true, marshalErr
	}

	managedRouteIndexes := make([]int, 0, 1)
	for i := range routes {
		routeObj, decodeErr := decodeObject(routes[i])
		if decodeErr != nil {
			return nil, false, fmt.Errorf("decode route index %d: %w", i, decodeErr)
		}
		if isManagedRoute(routeObj) {
			managedRouteIndexes = append(managedRouteIndexes, i)
		}
	}

	if len(managedRouteIndexes) == 0 {
		managedRouteRaw, marshalErr := marshalRaw(newManagedRouteObject())
		if marshalErr != nil {
			return nil, false, marshalErr
		}
		routes = append(routes, managedRouteRaw)
		changed = true
	} else {
		primaryIndex := managedRouteIndexes[0]
		primaryRoute, decodeErr := decodeObject(routes[primaryIndex])
		if decodeErr != nil {
			return nil, false, fmt.Errorf("decode managed route: %w", decodeErr)
		}
		routeChanged, applyErr := applyManagedRoute(primaryRoute)
		if applyErr != nil {
			return nil, false, applyErr
		}
		if routeChanged {
			primaryRaw, marshalErr := marshalRaw(primaryRoute)
			if marshalErr != nil {
				return nil, false, marshalErr
			}
			routes[primaryIndex] = primaryRaw
			changed = true
		}

		if len(managedRouteIndexes) > 1 {
			for i := len(managedRouteIndexes) - 1; i >= 1; i-- {
				index := managedRouteIndexes[i]
				routes = append(routes[:index], routes[index+1:]...)
			}
			changed = true
		}
	}

	if !changed {
		return rawTree, false, nil
	}

	routesRaw, err := marshalRaw(routes)
	if err != nil {
		return nil, false, err
	}
	root["routes"] = routesRaw
	updatedTree, err := marshalRaw(root)
	if err != nil {
		return nil, false, err
	}
	return updatedTree, true, nil
}

func decodeObject(raw json.RawMessage) (rawObject, error) {
	if len(bytes.TrimSpace(raw)) == 0 {
		return rawObject{}, nil
	}
	obj := rawObject{}
	if err := json.Unmarshal(raw, &obj); err != nil {
		return nil, fmt.Errorf("decode raw object: %w", err)
	}
	if obj == nil {
		return rawObject{}, nil
	}
	return obj, nil
}

func marshalRaw(value any) (json.RawMessage, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, fmt.Errorf("marshal raw object: %w", err)
	}
	return json.RawMessage(raw), nil
}

func getString(obj rawObject, key string) string {
	raw, exists := obj[key]
	if !exists || len(raw) == 0 {
		return ""
	}
	value := ""
	if err := json.Unmarshal(raw, &value); err != nil {
		return ""
	}
	return value
}

func getRoutes(obj rawObject) ([]json.RawMessage, error) {
	rawRoutes, exists := obj["routes"]
	if !exists || len(rawRoutes) == 0 || bytes.Equal(bytes.TrimSpace(rawRoutes), []byte("null")) {
		return nil, nil
	}

	routes := make([]json.RawMessage, 0)
	if err := json.Unmarshal(rawRoutes, &routes); err != nil {
		return nil, fmt.Errorf("decode routes: %w", err)
	}
	return routes, nil
}

func isManagedRoute(route rawObject) bool {
	return getString(route, "receiver") == managedReceiver
}

func applyManagedRoute(route rawObject) (bool, error) {
	assert.That(
		getString(route, "receiver") == managedReceiver,
		"applyManagedRoute requires managed receiver",
		"receiver", getString(route, "receiver"),
	)

	changed := false

	if getString(route, "repeat_interval") != managedRepeatInterval {
		repeatRaw, err := marshalRaw(managedRepeatInterval)
		if err != nil {
			return false, err
		}
		route["repeat_interval"] = repeatRaw
		changed = true
	}

	if !hasOnlyManagedMatcher(getMatchers(route["object_matchers"])) {
		matchersRaw, err := marshalRaw(managedMatchers())
		if err != nil {
			return false, err
		}
		route["object_matchers"] = matchersRaw
		changed = true
	}
	return changed, nil
}

func getMatchers(raw json.RawMessage) [][]string {
	if len(raw) == 0 {
		return nil
	}
	matchers := make([][]string, 0)
	if err := json.Unmarshal(raw, &matchers); err != nil {
		return nil
	}
	return matchers
}

func hasOnlyManagedMatcher(matchers [][]string) bool {
	if len(matchers) != 1 {
		return false
	}
	matcher := matchers[0]
	if len(matcher) != 3 {
		return false
	}
	return matcher[0] == matcherLabel &&
		matcher[1] == matcherOperator &&
		matcher[2] == matcherValue
}

func newManagedRouteObject() rawObject {
	receiverRaw := mustMarshalRaw(managedReceiver)
	repeatRaw := mustMarshalRaw(managedRepeatInterval)
	matchersRaw := mustMarshalRaw(managedMatchers())
	return rawObject{
		"receiver":        receiverRaw,
		"repeat_interval": repeatRaw,
		"object_matchers": matchersRaw,
	}
}

func mustMarshalRaw(value any) json.RawMessage {
	raw, err := marshalRaw(value)
	assert.That(err == nil, "marshal managed route literal", "error", err)
	return raw
}

func managedMatchers() [][]string {
	return [][]string{{matcherLabel, matcherOperator, matcherValue}}
}

func validateRequiredPolicyFields(root rawObject) error {
	if strings.TrimSpace(getString(root, "receiver")) == "" {
		return fmt.Errorf("%w %q", errPolicyTreeFieldMissing, "receiver")
	}

	return nil
}

func grafanaHost(grafanaURL string) string {
	parsed, err := url.Parse(grafanaURL)
	if err != nil {
		return ""
	}
	return parsed.Host
}
