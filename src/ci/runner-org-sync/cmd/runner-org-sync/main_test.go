package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/metric/metricdata"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"

	"altinn.studio/runner-org-sync/internal/config"
	"altinn.studio/runner-org-sync/internal/reconcile"
)

func TestRunReconciliationOutcomes(t *testing.T) {
	for _, tc := range []struct {
		name       string
		outcome    reconcile.Outcome
		cdnStatus  int
		listStatus int
	}{
		{"cdn unavailable", reconcile.OutcomeFailure, http.StatusGatewayTimeout, http.StatusOK},
		{"kubernetes unavailable", reconcile.OutcomeFailure, http.StatusOK, http.StatusForbidden},
		{"success", reconcile.OutcomeSuccess, http.StatusOK, http.StatusOK},
		{"partial", reconcile.OutcomePartial, http.StatusOK, http.StatusOK},
	} {
		t.Run(tc.name, func(t *testing.T) {
			reader, spans := testTelemetry(t)
			var kedaReads atomic.Int64
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				switch r.Method + " " + r.URL.Path {
				case "GET /orgs":
					w.WriteHeader(tc.cdnStatus)
					orgs := map[string]any{}
					if tc.outcome == reconcile.OutcomePartial {
						orgs["ttd"] = map[string]any{"environments": []string{"tt02"}}
					}
					writeJSON(t, w, map[string]any{"orgs": orgs})
				case "GET /api/v1/namespaces/test/secrets":
					w.WriteHeader(tc.listStatus)
					writeJSON(t, w, map[string]any{"apiVersion": "v1", "kind": "SecretList", "items": []any{}})
				case "GET /api/v1/namespaces/test/secrets/runner-ttd":
					// A registration Secret without a token produces a per-org failure.
					writeJSON(t, w, map[string]any{"apiVersion": "v1", "kind": "Secret"})
				case "GET /api/v1/namespaces/test/secrets/keda-pat":
					kedaReads.Add(1)
					writeJSON(t, w, map[string]any{
						"apiVersion": "v1", "kind": "Secret",
						"metadata": map[string]any{
							"name":   "keda-pat",
							"labels": map[string]string{"app.kubernetes.io/managed-by": serviceName},
						},
						"data": map[string][]byte{"token": []byte("test-keda-pat")},
					})
				case "GET /api/v1/namespaces/test/configmaps/runners":
					w.WriteHeader(http.StatusNotFound)
					writeJSON(t, w, map[string]any{"apiVersion": "v1", "kind": "Status", "reason": "NotFound"})
				case "POST /api/v1/namespaces/test/configmaps":
					w.WriteHeader(http.StatusCreated)
					writeJSON(t, w, map[string]any{"apiVersion": "v1", "kind": "ConfigMap"})
				default:
					t.Errorf("unexpected request: %s %s", r.Method, r.URL.Path)
					w.WriteHeader(http.StatusBadRequest)
				}
			}))
			defer server.Close()
			configureTestRun(t, server.URL)

			if err := run(); err != nil {
				t.Fatalf("run() should return normally after reporting %s: %v", tc.outcome, err)
			}
			if kedaReads.Load() != 1 {
				t.Fatalf("KEDA sync should still run, got %d reads", kedaReads.Load())
			}
			assertOutcomeMetric(t, reader, tc.outcome)
			assertReconcileSpan(t, spans, tc.outcome)
		})
	}
}

func assertReconcileSpan(t *testing.T, spans *tracetest.SpanRecorder, outcome reconcile.Outcome) {
	t.Helper()
	ended := spans.Ended()
	if len(ended) != 1 {
		t.Fatalf("expected one ended reconcile span, got %d", len(ended))
	}
	wantCode := codes.Ok
	if outcome == reconcile.OutcomeFailure {
		wantCode = codes.Error
		foundException := false
		for _, event := range ended[0].Events() {
			foundException = foundException || event.Name == "exception"
		}
		if !foundException {
			t.Error("failed reconciliation must record an exception event")
		}
	}
	if got := ended[0].Status().Code; got != wantCode {
		t.Errorf("span status = %v, want %v", got, wantCode)
	}
}

func TestRunInvalidConfigurationStillFails(t *testing.T) {
	t.Setenv(config.EnvGiteaURL, "")
	if err := run(); err == nil || !strings.Contains(err.Error(), "config:") {
		t.Fatalf("expected configuration error, got %v", err)
	}
}

func testTelemetry(t *testing.T) (*sdkmetric.ManualReader, *tracetest.SpanRecorder) {
	t.Helper()
	oldMeter, oldTracer, oldLogger := otel.GetMeterProvider(), otel.GetTracerProvider(), slog.Default()
	oldPropagator := otel.GetTextMapPropagator()
	reader := sdkmetric.NewManualReader()
	meterProvider := sdkmetric.NewMeterProvider(sdkmetric.WithReader(reader))
	spans := tracetest.NewSpanRecorder()
	tracerProvider := sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(spans))
	otel.SetMeterProvider(meterProvider)
	otel.SetTracerProvider(tracerProvider)
	t.Cleanup(func() {
		otel.SetMeterProvider(oldMeter)
		otel.SetTracerProvider(oldTracer)
		otel.SetTextMapPropagator(oldPropagator)
		slog.SetDefault(oldLogger)
		if err := meterProvider.Shutdown(context.Background()); err != nil {
			t.Error(err)
		}
		if err := tracerProvider.Shutdown(context.Background()); err != nil {
			t.Error(err)
		}
	})
	return reader, spans
}

func configureTestRun(t *testing.T, serverURL string) {
	t.Helper()
	for key, value := range map[string]string{
		config.EnvGiteaURL: serverURL, config.EnvOrgsJSONURL: serverURL + "/orgs",
		config.EnvOutputNamespace: "test", config.EnvSecretNamePattern: "runner-{org}",
		config.EnvConfigMapName: "runners", config.EnvSyncAll: "true",
		config.EnvGiteaPATOverride: "test-admin-pat", config.EnvKedaPATOverride: "test-keda-pat",
		config.EnvKedaPATSecretName: "keda-pat", config.EnvKedaPATSecretKey: "token",
		"KUBERNETES_SERVICE_HOST": "", "KUBERNETES_SERVICE_PORT": "",
		"OTEL_EXPORTER_OTLP_ENDPOINT": "", "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT": "",
		"OTEL_EXPORTER_OTLP_METRICS_ENDPOINT": "", "OTEL_RESOURCE_ATTRIBUTES": "",
	} {
		t.Setenv(key, value)
	}
	kubeconfig := filepath.Join(t.TempDir(), "config")
	content := fmt.Sprintf(`apiVersion: v1
kind: Config
clusters:
- name: test
  cluster:
    server: %s
contexts:
- name: test
  context:
    cluster: test
current-context: test
`, serverURL)
	if err := os.WriteFile(kubeconfig, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("KUBECONFIG", kubeconfig)
}

func assertOutcomeMetric(t *testing.T, reader *sdkmetric.ManualReader, outcome reconcile.Outcome) {
	t.Helper()
	var data metricdata.ResourceMetrics
	if err := reader.Collect(context.Background(), &data); err != nil {
		t.Fatal(err)
	}
	for _, scope := range data.ScopeMetrics {
		for _, m := range scope.Metrics {
			if m.Name != "runner_org_sync.reconcile.runs" {
				continue
			}
			sum, ok := m.Data.(metricdata.Sum[int64])
			if !ok || len(sum.DataPoints) != 1 {
				t.Fatalf("unexpected reconcile counter: %#v", m.Data)
			}
			point := sum.DataPoints[0]
			value, found := point.Attributes.Value(attribute.Key("outcome"))
			if point.Value != 1 || !found || value.AsString() != string(outcome) {
				t.Fatalf("expected one %s run, got %#v", outcome, point)
			}
			return
		}
	}
	t.Fatal("missing reconcile outcome metric")
}

func writeJSON(t *testing.T, w http.ResponseWriter, value any) {
	t.Helper()
	if err := json.NewEncoder(w).Encode(value); err != nil {
		t.Error(err)
	}
}
