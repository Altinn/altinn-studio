package integration_test

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"altinn.studio/kubernetes-wrapper/internal/api"
	"altinn.studio/kubernetes-wrapper/internal/kube"

	"github.com/gkampitakis/go-snaps/snaps"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/envtest"
)

const namespaceCleanupTimeout = 10 * time.Second

func TestDeploymentsEndpointSnapshot(t *testing.T) {
	t.Parallel()
	fixture := setupFixture(context.Background(), t)

	response := fixture.get(context.Background(), t, "/api/v1/deployments")
	defer closeBody(t, response.Body)

	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", response.StatusCode)
	}

	snaps.MatchJSON(t, readAndNormalizeJSON(t, response.Body))
}

func TestDaemonSetsEndpointSnapshot(t *testing.T) {
	t.Parallel()
	fixture := setupFixture(context.Background(), t)

	response := fixture.get(context.Background(), t, "/api/v1/daemonsets")
	defer closeBody(t, response.Body)

	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", response.StatusCode)
	}

	snaps.MatchJSON(t, readAndNormalizeJSON(t, response.Body))
}

func TestSelectorsAndValidation(t *testing.T) {
	t.Parallel()
	fixture := setupFixture(context.Background(), t)

	testCases := []struct {
		name          string
		path          string
		statusCode    int
		expectedCount int
	}{
		{
			name:          "label selector match",
			path:          "/api/v1/deployments?labelSelector=release%3Ddummy-deployment",
			statusCode:    http.StatusOK,
			expectedCount: 1,
		},
		{
			name:          "field selector name match",
			path:          "/api/v1/deployments?fieldSelector=metadata.name%3Ddummy-deployment",
			statusCode:    http.StatusOK,
			expectedCount: 1,
		},
		{
			name:          "field selector namespace match",
			path:          "/api/v1/deployments?fieldSelector=metadata.namespace%3D%s",
			statusCode:    http.StatusOK,
			expectedCount: 2,
		},
		{
			name:          "field selector not equals",
			path:          "/api/v1/deployments?fieldSelector=metadata.name!%3Ddummy-deployment",
			statusCode:    http.StatusOK,
			expectedCount: 1,
		},
		{
			name:          "combined label and field selector",
			path:          "/api/v1/deployments?labelSelector=release%3Dkuberneteswrapper&fieldSelector=metadata.name%3Dkuberneteswrapper",
			statusCode:    http.StatusOK,
			expectedCount: 1,
		},
		{
			name:       "invalid label selector",
			path:       "/api/v1/deployments?labelSelector=release+in+%28dummy",
			statusCode: http.StatusBadRequest,
		},
		{
			name:       "unsupported field selector key",
			path:       "/api/v1/deployments?fieldSelector=spec.replicas%3D1",
			statusCode: http.StatusBadRequest,
		},
		{
			name:       "invalid field selector syntax",
			path:       "/api/v1/deployments?fieldSelector=metadata.name",
			statusCode: http.StatusBadRequest,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()

			path := testCase.path
			if strings.Contains(path, "%s") {
				path = fmt.Sprintf(path, fixture.namespace)
			}

			response := fixture.get(context.Background(), t, path)
			defer closeBody(t, response.Body)
			if response.StatusCode != testCase.statusCode {
				body, readErr := io.ReadAll(response.Body)
				assertNoError(t, readErr)
				t.Fatalf("expected status %d, got %d, body=%s", testCase.statusCode, response.StatusCode, string(body))
			}

			if testCase.statusCode == http.StatusOK {
				count := countJSONListItems(t, response.Body)
				if count != testCase.expectedCount {
					t.Fatalf("expected %d resources, got %d", testCase.expectedCount, count)
				}
			}
		})
	}
}

type fixture struct {
	httpClient *http.Client
	serverURL  string
	namespace  string
}

func setupFixture(ctx context.Context, t *testing.T) *fixture {
	t.Helper()
	restConfig := startTestEnv(t)

	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		t.Fatalf("new clientset: %v", err)
	}

	namespace := sanitizeNamespace("test-" + t.Name())
	if len(namespace) > 63 {
		namespace = namespace[:63]
	}
	if namespace == "" {
		namespace = "test"
	}

	_, err = clientset.CoreV1().Namespaces().Create(ctx, &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{Name: namespace},
	}, metav1.CreateOptions{})
	if err != nil {
		t.Fatalf("create namespace: %v", err)
	}
	t.Cleanup(func() {
		cleanupCtx, cancel := context.WithTimeout(ctx, namespaceCleanupTimeout)
		defer cancel()
		deleteErr := clientset.CoreV1().Namespaces().Delete(cleanupCtx, namespace, metav1.DeleteOptions{})
		if deleteErr != nil {
			t.Fatalf("delete namespace: %v", deleteErr)
		}
	})

	seedResources(ctx, t, clientset, namespace)

	resourceCache := kube.NewResourceCache(clientset, namespace)
	cacheCtx, cancelCache := context.WithCancel(ctx)
	t.Cleanup(cancelCache)

	if err = resourceCache.Start(cacheCtx); err != nil {
		t.Fatalf("start cache: %v", err)
	}

	handler := api.NewHandler(api.HandlerOptions{
		ResourceCache: resourceCache,
		Logger:        slog.New(slog.DiscardHandler),
		Development:   true,
	})
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)

	return &fixture{httpClient: server.Client(), serverURL: server.URL, namespace: namespace}
}

func startTestEnv(t *testing.T) *rest.Config {
	t.Helper()
	testEnv := &envtest.Environment{}
	if dir := getFirstFoundEnvTestBinaryDir(); dir != "" {
		testEnv.BinaryAssetsDirectory = dir
	}

	restConfig, err := testEnv.Start()
	if err != nil {
		t.Fatalf("start envtest: %v", err)
	}
	t.Cleanup(func() {
		stopErr := testEnv.Stop()
		if stopErr != nil {
			t.Fatalf("stop envtest: %v", stopErr)
		}
	})
	return restConfig
}

func seedResources(ctx context.Context, t *testing.T, clientset kubernetes.Interface, namespace string) {
	t.Helper()

	_, err := clientset.AppsV1().Deployments(namespace).Create(ctx, &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "dummy-deployment",
			Namespace: namespace,
			Labels: map[string]string{
				"release": "dummy-deployment",
			},
		},
		Spec: appsv1.DeploymentSpec{
			Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": "dummy-deployment"}},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: map[string]string{"app": "dummy-deployment"}},
				Spec: corev1.PodSpec{Containers: []corev1.Container{{
					Name:  "app",
					Image: "nginx:alpine",
				}}},
			},
		},
	}, metav1.CreateOptions{})
	if err != nil {
		t.Fatalf("create deployment 1: %v", err)
	}

	_, err = clientset.AppsV1().Deployments(namespace).Create(ctx, &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "kuberneteswrapper",
			Namespace: namespace,
			Labels: map[string]string{
				"release": "kuberneteswrapper",
			},
		},
		Spec: appsv1.DeploymentSpec{
			Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": "kuberneteswrapper"}},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: map[string]string{"app": "kuberneteswrapper"}},
				Spec: corev1.PodSpec{Containers: []corev1.Container{{
					Name:  "app",
					Image: "altinn-kuberneteswrapper:local",
				}}},
			},
		},
	}, metav1.CreateOptions{})
	if err != nil {
		t.Fatalf("create deployment 2: %v", err)
	}

	_, err = clientset.AppsV1().DaemonSets(namespace).Create(ctx, &appsv1.DaemonSet{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "dummy-daemonset",
			Namespace: namespace,
			Labels: map[string]string{
				"release": "ignored-by-contract",
			},
		},
		Spec: appsv1.DaemonSetSpec{
			Selector: &metav1.LabelSelector{MatchLabels: map[string]string{"app": "dummy-daemonset"}},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: map[string]string{"app": "dummy-daemonset"}},
				Spec: corev1.PodSpec{Containers: []corev1.Container{{
					Name:  "app",
					Image: "nginx:alpine",
				}}},
			},
		},
	}, metav1.CreateOptions{})
	if err != nil {
		t.Fatalf("create daemonset: %v", err)
	}
}

func (f *fixture) get(ctx context.Context, t *testing.T, path string) *http.Response {
	t.Helper()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, f.serverURL+path, nil)
	if err != nil {
		t.Fatalf("new request %s: %v", path, err)
	}

	response, err := f.httpClient.Do(request)
	if err != nil {
		t.Fatalf("http get %s: %v", path, err)
	}
	return response
}

func readAndNormalizeJSON(t *testing.T, body io.Reader) []byte {
	t.Helper()
	payload, err := io.ReadAll(body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}

	var genericPayload any
	if err = json.Unmarshal(payload, &genericPayload); err != nil {
		t.Fatalf("json unmarshal: %v", err)
	}

	normalized, err := json.Marshal(genericPayload)
	if err != nil {
		t.Fatalf("json marshal: %v", err)
	}
	return normalized
}

func countJSONListItems(t *testing.T, body io.Reader) int {
	t.Helper()
	payload, err := io.ReadAll(body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}

	var list []json.RawMessage
	if err = json.Unmarshal(payload, &list); err != nil {
		t.Fatalf("json list unmarshal: %v", err)
	}
	return len(list)
}

func sanitizeNamespace(value string) string {
	value = strings.ToLower(value)
	replacer := strings.NewReplacer("/", "-", "_", "-", " ", "-", ".", "-")
	return replacer.Replace(value)
}

func getFirstFoundEnvTestBinaryDir() string {
	workingDirectory, err := os.Getwd()
	if err != nil {
		return ""
	}

	current := workingDirectory
	for {
		candidate := filepath.Join(current, "bin", "k8s")
		entries, readErr := os.ReadDir(candidate)
		if readErr == nil {
			for _, entry := range entries {
				if entry.IsDir() {
					return filepath.Join(candidate, entry.Name())
				}
			}
		}

		parent := filepath.Dir(current)
		if parent == current {
			return ""
		}
		current = parent
	}
}

func assertNoError(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
}

func closeBody(t *testing.T, body io.Closer) {
	t.Helper()
	assertNoError(t, body.Close())
}
