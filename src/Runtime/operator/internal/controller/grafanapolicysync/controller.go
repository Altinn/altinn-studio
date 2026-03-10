package grafanapolicysync

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/go-logr/logr"
	grafanav1beta1 "github.com/grafana/grafana-operator/v5/api/v1beta1"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"altinn.studio/operator/internal/assert"
	"altinn.studio/operator/internal/operatorcontext"
	rt "altinn.studio/operator/internal/runtime"
)

const (
	defaultPollInterval  = 10 * time.Minute
	shortRetryInterval   = 10 * time.Second
	initialRetryAttempts = 10

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
}

func NewReconciler(runtime rt.Runtime, k8sClient client.Client) *Reconciler {
	return &Reconciler{
		logger:    log.FromContext(context.Background()).WithName("grafanapolicysync"),
		k8sClient: k8sClient,
		runtime:   runtime,
		httpClient: &http.Client{
			Timeout:   15 * time.Second,
			Transport: otelhttp.NewTransport(http.DefaultTransport),
		},
		pollInterval: defaultPollInterval,
	}
}

func NewReconcilerForTesting(
	runtime rt.Runtime,
	k8sClient client.Client,
	httpClient *http.Client,
) *Reconciler {
	if httpClient == nil {
		httpClient = &http.Client{
			Timeout: 15 * time.Second,
		}
	}
	return &Reconciler{
		logger:       log.FromContext(context.Background()).WithName("grafanapolicysync"),
		k8sClient:    k8sClient,
		runtime:      runtime,
		httpClient:   httpClient,
		pollInterval: defaultPollInterval,
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

	for range initialRetryAttempts {
		if err := r.SyncAll(ctx); err != nil {
			r.logger.Error(err, "initial sync failed")
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
			if err := r.SyncAll(ctx); err != nil {
				r.logger.Error(err, "sync failed")
			}
		}
	}
}

func (r *Reconciler) SyncAll(ctx context.Context) error {
	opCtx := r.runtime.GetOperatorContext()
	environment := opCtx.Environment
	assert.That(
		hasExternalGrafana(environment),
		"grafanapolicysync.SyncAll must only run in supported environments",
		"environment", environment,
	)

	ctx, span := r.runtime.Tracer().Start(ctx, "grafanapolicysync.SyncAll")
	defer span.End()
	span.SetAttributes(
		attribute.String("serviceOwner", opCtx.ServiceOwner.Id),
		attribute.String("environment", opCtx.Environment),
	)
	withErrorStatus := func(err error, status string) error {
		span.RecordError(err)
		span.SetStatus(codes.Error, status)
		return err
	}

	grafanaURL, token, err := r.getGrafanaCredentials(ctx)
	if err != nil {
		return withErrorStatus(err, "get grafana credentials")
	}
	if host := grafanaHost(grafanaURL); host != "" {
		span.SetAttributes(attribute.String("grafana.host", host))
	}

	rawTree, err := r.getPolicyTree(ctx, grafanaURL, token)
	if err != nil {
		return withErrorStatus(err, "get policy tree")
	}

	updatedTree, changed, err := upsertManagedRoute(rawTree)
	if err != nil {
		return withErrorStatus(err, "upsert managed route")
	}
	span.SetAttributes(attribute.Bool("policy.changed", changed))
	if !changed {
		return nil
	}

	span.SetAttributes(
		attribute.String("altinn.studio.sampling", "always"),
		attribute.Int("policy.updated_bytes", len(updatedTree)),
	)

	if err := r.putPolicyTree(ctx, grafanaURL, token, updatedTree); err != nil {
		return withErrorStatus(err, "put policy tree")
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
		return "", "", fmt.Errorf("token secret missing key %q", tokenSecretKey)
	}

	grafana := &grafanav1beta1.Grafana{}
	grafanaKey := client.ObjectKey{Name: grafanaName, Namespace: grafanaNamespace}
	if err := r.k8sClient.Get(ctx, grafanaKey, grafana); err != nil {
		return "", "", fmt.Errorf("get grafana CR: %w", err)
	}
	if grafana.Spec.External == nil || strings.TrimSpace(grafana.Spec.External.URL) == "" {
		return "", "", errors.New("grafana CR has no external URL")
	}

	return strings.TrimRight(grafana.Spec.External.URL, "/"), string(tokenBytes), nil
}

func (r *Reconciler) getPolicyTree(ctx context.Context, grafanaURL, token string) (json.RawMessage, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, grafanaURL+policiesPath, nil)
	if err != nil {
		return nil, fmt.Errorf("build GET policy request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("GET policy tree: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4*1024))
		return nil, fmt.Errorf("GET policy tree: status %d: %s", resp.StatusCode, string(body))
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
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPut,
		grafanaURL+policiesPath,
		bytes.NewReader(tree),
	)
	if err != nil {
		return fmt.Errorf("build PUT policy request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Disable-Provenance", "true")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("PUT policy tree: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4*1024))
		return fmt.Errorf("PUT policy tree: status %d: %s", resp.StatusCode, string(body))
	}
	return nil
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
		return nil, err
	}
	if obj == nil {
		return rawObject{}, nil
	}
	return obj, nil
}

func marshalRaw(value any) (json.RawMessage, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, err
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
		return fmt.Errorf("policy tree missing required field %q", "receiver")
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
