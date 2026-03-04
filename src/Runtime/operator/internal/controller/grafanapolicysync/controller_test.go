package grafanapolicysync

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"altinn.studio/operator/internal"
	"altinn.studio/operator/internal/operatorcontext"
	"github.com/gkampitakis/go-snaps/snaps"
	grafanav1beta1 "github.com/grafana/grafana-operator/v5/api/v1beta1"
	"github.com/jonboulle/clockwork"
	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func newFakeK8sClient(initObjs ...client.Object) client.Client {
	scheme := k8sruntime.NewScheme()
	_ = corev1.AddToScheme(scheme)
	_ = grafanav1beta1.AddToScheme(scheme)
	return fake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(initObjs...).
		Build()
}

func newTestReconciler(
	t *testing.T,
	k8sClient client.Client,
	httpClient *http.Client,
) *Reconciler {
	t.Helper()

	clock := clockwork.NewFakeClock()
	rt, err := internal.NewRuntime(
		context.Background(),
		internal.WithClock(clock),
		internal.WithOperatorContext(&operatorcontext.Context{
			Environment: "tt02",
			ServiceOwner: operatorcontext.ServiceOwner{
				Id: "ttd",
			},
		}),
	)
	if err != nil {
		t.Fatalf("failed to create runtime: %v", err)
	}

	return NewReconcilerForTesting(rt, k8sClient, httpClient)
}

func newGrafanaSecret() *corev1.Secret {
	return &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      tokenSecretName,
			Namespace: grafanaNamespace,
		},
		Data: map[string][]byte{
			tokenSecretKey: []byte("test-token"),
		},
	}
}

func newGrafanaCR(url string) *grafanav1beta1.Grafana {
	return &grafanav1beta1.Grafana{
		ObjectMeta: metav1.ObjectMeta{
			Name:      grafanaName,
			Namespace: grafanaNamespace,
		},
		Spec: grafanav1beta1.GrafanaSpec{
			External: &grafanav1beta1.External{
				URL: url,
			},
		},
	}
}

func matchPayloadSnapshot(t *testing.T, payload map[string]any) {
	t.Helper()
	data, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	snaps.MatchJSON(t, data)
}

func TestReconciler_SyncAll_AppendsManagedRouteAndPreservesUnrelated(t *testing.T) {
	g := NewWithT(t)

	initialTree := map[string]any{
		"receiver": "grafana-default-email",
		"routes": []any{
			map[string]any{
				"receiver": "team-a",
				"object_matchers": []any{
					[]any{"Type", "=", "Unrelated"},
				},
			},
		},
	}

	var putCalls int
	var putPayload map[string]any

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			_ = json.NewEncoder(w).Encode(initialTree)
		case http.MethodPut:
			putCalls++
			defer func() { _ = r.Body.Close() }()
			var payload map[string]any
			_ = json.NewDecoder(r.Body).Decode(&payload)
			putPayload = payload
			w.WriteHeader(http.StatusOK)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))
	defer server.Close()

	k8sClient := newFakeK8sClient(
		newGrafanaSecret(),
		newGrafanaCR(server.URL),
	)
	reconciler := newTestReconciler(t, k8sClient, server.Client())

	err := reconciler.SyncAll(context.Background())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(putCalls).To(Equal(1))
	matchPayloadSnapshot(t, putPayload)
}

func TestReconciler_SyncAll_PreservesUnknownFieldsOnRoundTrip(t *testing.T) {
	g := NewWithT(t)

	initialTree := map[string]any{
		"receiver": "grafana-default-email",
		"group_by": []any{"grafana_folder", "alertname"},
		"routes": []any{
			map[string]any{
				"receiver": "team-a",
				"object_matchers": []any{
					[]any{"Type", "=", "Unrelated"},
				},
				"continue": true,
			},
		},
	}

	var putPayload map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			_ = json.NewEncoder(w).Encode(initialTree)
		case http.MethodPut:
			defer func() { _ = r.Body.Close() }()
			var payload map[string]any
			_ = json.NewDecoder(r.Body).Decode(&payload)
			putPayload = payload
			w.WriteHeader(http.StatusOK)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))
	defer server.Close()

	k8sClient := newFakeK8sClient(
		newGrafanaSecret(),
		newGrafanaCR(server.URL),
	)
	reconciler := newTestReconciler(t, k8sClient, server.Client())

	err := reconciler.SyncAll(context.Background())
	g.Expect(err).NotTo(HaveOccurred())
	matchPayloadSnapshot(t, putPayload)
}

func TestReconciler_SyncAll_NoChangesDoesNotPut(t *testing.T) {
	g := NewWithT(t)

	initialTree := map[string]any{
		"receiver": "grafana-default-email",
		"routes": []any{
			map[string]any{
				"receiver":        managedReceiver,
				"repeat_interval": managedRepeatInterval,
				"group_by":        []any{"grafana_folder", "alertname"},
				"object_matchers": []any{
					[]any{matcherLabel, matcherOperator, matcherValue},
				},
			},
		},
	}

	var putCalls int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			_ = json.NewEncoder(w).Encode(initialTree)
		case http.MethodPut:
			putCalls++
			w.WriteHeader(http.StatusOK)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))
	defer server.Close()

	k8sClient := newFakeK8sClient(
		newGrafanaSecret(),
		newGrafanaCR(server.URL),
	)
	reconciler := newTestReconciler(t, k8sClient, server.Client())

	err := reconciler.SyncAll(context.Background())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(putCalls).To(Equal(0))
}

func TestReconciler_SyncAll_UpdatesManagedRoute(t *testing.T) {
	g := NewWithT(t)

	initialTree := map[string]any{
		"receiver": "grafana-default-email",
		"routes": []any{
			map[string]any{
				"receiver":        managedReceiver,
				"repeat_interval": "1h",
				"object_matchers": []any{
					[]any{matcherLabel, matcherOperator, matcherValue},
					[]any{"extra", "=", "tag"},
				},
			},
		},
	}

	var putPayload map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			_ = json.NewEncoder(w).Encode(initialTree)
		case http.MethodPut:
			defer func() { _ = r.Body.Close() }()
			var payload map[string]any
			_ = json.NewDecoder(r.Body).Decode(&payload)
			putPayload = payload
			w.WriteHeader(http.StatusOK)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))
	defer server.Close()

	k8sClient := newFakeK8sClient(
		newGrafanaSecret(),
		newGrafanaCR(server.URL),
	)
	reconciler := newTestReconciler(t, k8sClient, server.Client())

	err := reconciler.SyncAll(context.Background())
	g.Expect(err).NotTo(HaveOccurred())
	matchPayloadSnapshot(t, putPayload)
}

func TestReconciler_SyncAll_DoesNotOverwriteUnmanagedAltinnMatcherRoute(t *testing.T) {
	g := NewWithT(t)

	initialTree := map[string]any{
		"receiver": "grafana-default-email",
		"routes": []any{
			map[string]any{
				"receiver":        "team-a",
				"repeat_interval": "10m",
				"object_matchers": []any{
					[]any{matcherLabel, matcherOperator, matcherValue},
				},
			},
		},
	}

	var putPayload map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			_ = json.NewEncoder(w).Encode(initialTree)
		case http.MethodPut:
			defer func() { _ = r.Body.Close() }()
			var payload map[string]any
			_ = json.NewDecoder(r.Body).Decode(&payload)
			putPayload = payload
			w.WriteHeader(http.StatusOK)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))
	defer server.Close()

	k8sClient := newFakeK8sClient(
		newGrafanaSecret(),
		newGrafanaCR(server.URL),
	)
	reconciler := newTestReconciler(t, k8sClient, server.Client())

	err := reconciler.SyncAll(context.Background())
	g.Expect(err).NotTo(HaveOccurred())
	matchPayloadSnapshot(t, putPayload)
}

func TestReconciler_SyncAll_OverwritesSameReceiverWithOtherMatcher(t *testing.T) {
	g := NewWithT(t)

	initialTree := map[string]any{
		"receiver": "grafana-default-email",
		"routes": []any{
			map[string]any{
				"receiver":        managedReceiver,
				"repeat_interval": "10m",
				"object_matchers": []any{
					[]any{"Type", "=", "AnotherType"},
				},
			},
		},
	}

	var putPayload map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			_ = json.NewEncoder(w).Encode(initialTree)
		case http.MethodPut:
			defer func() { _ = r.Body.Close() }()
			var payload map[string]any
			_ = json.NewDecoder(r.Body).Decode(&payload)
			putPayload = payload
			w.WriteHeader(http.StatusOK)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))
	defer server.Close()

	k8sClient := newFakeK8sClient(
		newGrafanaSecret(),
		newGrafanaCR(server.URL),
	)
	reconciler := newTestReconciler(t, k8sClient, server.Client())

	err := reconciler.SyncAll(context.Background())
	g.Expect(err).NotTo(HaveOccurred())
	matchPayloadSnapshot(t, putPayload)
}

func TestReconciler_SyncAll_RemovesDuplicateManagedRoutes(t *testing.T) {
	g := NewWithT(t)

	initialTree := map[string]any{
		"receiver": "grafana-default-email",
		"routes": []any{
			map[string]any{
				"receiver":        managedReceiver,
				"repeat_interval": managedRepeatInterval,
				"object_matchers": []any{
					[]any{matcherLabel, matcherOperator, matcherValue},
				},
			},
			map[string]any{
				"receiver":        managedReceiver,
				"repeat_interval": managedRepeatInterval,
				"object_matchers": []any{
					[]any{matcherLabel, matcherOperator, matcherValue},
				},
			},
		},
	}

	var putPayload map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			_ = json.NewEncoder(w).Encode(initialTree)
		case http.MethodPut:
			defer func() { _ = r.Body.Close() }()
			var payload map[string]any
			_ = json.NewDecoder(r.Body).Decode(&payload)
			putPayload = payload
			w.WriteHeader(http.StatusOK)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))
	defer server.Close()

	k8sClient := newFakeK8sClient(
		newGrafanaSecret(),
		newGrafanaCR(server.URL),
	)
	reconciler := newTestReconciler(t, k8sClient, server.Client())

	err := reconciler.SyncAll(context.Background())
	g.Expect(err).NotTo(HaveOccurred())
	matchPayloadSnapshot(t, putPayload)
}

func TestReconciler_SyncAll_ErrorsWhenPolicyTreeMissingReceiver(t *testing.T) {
	g := NewWithT(t)

	initialTree := map[string]any{
		"routes": []any{},
	}

	var putCalls int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			_ = json.NewEncoder(w).Encode(initialTree)
		case http.MethodPut:
			putCalls++
			w.WriteHeader(http.StatusOK)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))
	defer server.Close()

	k8sClient := newFakeK8sClient(
		newGrafanaSecret(),
		newGrafanaCR(server.URL),
	)
	reconciler := newTestReconciler(t, k8sClient, server.Client())

	err := reconciler.SyncAll(context.Background())
	g.Expect(err).To(HaveOccurred())
	g.Expect(err.Error()).To(ContainSubstring(`policy tree missing required field "receiver"`))
	g.Expect(putCalls).To(Equal(0))
}

func TestReconciler_SyncAll_ErrorsWhenPolicyTreeBodyIsEmpty(t *testing.T) {
	g := NewWithT(t)

	var putCalls int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			w.WriteHeader(http.StatusOK)
		case http.MethodPut:
			putCalls++
			w.WriteHeader(http.StatusOK)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))
	defer server.Close()

	k8sClient := newFakeK8sClient(
		newGrafanaSecret(),
		newGrafanaCR(server.URL),
	)
	reconciler := newTestReconciler(t, k8sClient, server.Client())

	err := reconciler.SyncAll(context.Background())
	g.Expect(err).To(HaveOccurred())
	g.Expect(err.Error()).To(ContainSubstring(`policy tree missing required field "receiver"`))
	g.Expect(putCalls).To(Equal(0))
}

func TestReconciler_SyncAll_AppendsManagedRouteWhenRoutesMissing(t *testing.T) {
	g := NewWithT(t)

	initialTree := map[string]any{
		"receiver": "grafana-default-email",
	}

	var putPayload map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			_ = json.NewEncoder(w).Encode(initialTree)
		case http.MethodPut:
			defer func() { _ = r.Body.Close() }()
			var payload map[string]any
			_ = json.NewDecoder(r.Body).Decode(&payload)
			putPayload = payload
			w.WriteHeader(http.StatusOK)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))
	defer server.Close()

	k8sClient := newFakeK8sClient(
		newGrafanaSecret(),
		newGrafanaCR(server.URL),
	)
	reconciler := newTestReconciler(t, k8sClient, server.Client())

	err := reconciler.SyncAll(context.Background())
	g.Expect(err).NotTo(HaveOccurred())
	matchPayloadSnapshot(t, putPayload)
}

func TestHasExternalGrafana(t *testing.T) {
	g := NewWithT(t)
	g.Expect(hasExternalGrafana("tt02")).To(BeTrue())
	g.Expect(hasExternalGrafana(operatorcontext.EnvironmentProd)).To(BeTrue())
	g.Expect(hasExternalGrafana(operatorcontext.EnvironmentLocal)).To(BeFalse())
}
