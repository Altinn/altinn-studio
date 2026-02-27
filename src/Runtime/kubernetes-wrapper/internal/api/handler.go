// Package api exposes HTTP handlers for kubernetes-wrapper endpoints.
package api

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"sort"
	"strings"

	"altinn.studio/kubernetes-wrapper/internal/kube"
	"altinn.studio/kubernetes-wrapper/internal/model"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/attribute"
	appsv1 "k8s.io/api/apps/v1"
	"k8s.io/apimachinery/pkg/labels"
)

// HandlerOptions contains dependencies and runtime options for HTTP handlers.
type HandlerOptions struct {
	ResourceCache *kube.ResourceCache
	Logger        *slog.Logger
	Development   bool
}

// NewHandler creates the kubernetes-wrapper HTTP handler.
func NewHandler(options HandlerOptions) http.Handler {
	apiHandler := &handler{
		resourceCache: options.ResourceCache,
		logger:        options.Logger,
		development:   options.Development,
	}

	mux := http.NewServeMux()
	mux.Handle("/api/v1/deployments", apiHandler.instrument("GET /api/v1/deployments", apiHandler.getDeployments))
	mux.Handle("/api/v1/daemonsets", apiHandler.instrument("GET /api/v1/daemonsets", apiHandler.getDaemonSets))
	mux.HandleFunc("/kuberneteswrapper/swagger/v1/swagger.json", apiHandler.swaggerDocument)
	mux.HandleFunc("/kuberneteswrapper/swagger", apiHandler.swaggerIndex)
	mux.HandleFunc("/kuberneteswrapper/swagger/", apiHandler.swaggerIndex)

	return apiHandler.recoverPanic(apiHandler.cors(mux))
}

type handler struct {
	resourceCache *kube.ResourceCache
	logger        *slog.Logger
	development   bool
}

func (h *handler) instrument(routeName string, next http.HandlerFunc) http.Handler {
	return otelhttp.NewHandler(
		next,
		routeName,
		otelhttp.WithMetricAttributesFn(func(r *http.Request) []attribute.KeyValue {
			if !strings.HasPrefix(strings.ToLower(r.URL.Path), "/api/v1") {
				return nil
			}
			return []attribute.KeyValue{
				attribute.String("kubernetes_wrapper.selector_mode", selectorMode(r)),
			}
		}),
	)
}

func selectorMode(r *http.Request) string {
	hasLabelSelector := strings.TrimSpace(r.URL.Query().Get("labelSelector")) != ""
	hasFieldSelector := strings.TrimSpace(r.URL.Query().Get("fieldSelector")) != ""

	switch {
	case !hasLabelSelector && !hasFieldSelector:
		return "none"
	case hasLabelSelector && !hasFieldSelector:
		return "label"
	case !hasLabelSelector && hasFieldSelector:
		return "field"
	default:
		return "both"
	}
}

func (h *handler) getDeployments(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeProblem(w, r, http.StatusMethodNotAllowed, "Method Not Allowed", "Only GET is allowed")
		return
	}

	resources, err := h.listDeployments(r)
	if err != nil {
		h.writeSelectorError(w, r, err)
		return
	}

	if err = writeJSON(w, http.StatusOK, resources); err != nil {
		h.logger.Error("failed to write deployments response", "error", err)
	}
}

func (h *handler) getDaemonSets(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeProblem(w, r, http.StatusMethodNotAllowed, "Method Not Allowed", "Only GET is allowed")
		return
	}

	resources, err := h.listDaemonSets(r)
	if err != nil {
		h.writeSelectorError(w, r, err)
		return
	}

	if err = writeJSON(w, http.StatusOK, resources); err != nil {
		h.logger.Error("failed to write daemonsets response", "error", err)
	}
}

func (h *handler) listDeployments(r *http.Request) ([]model.DeployedResource, error) {
	labelSelector := labels.Everything()
	rawLabelSelector := strings.TrimSpace(r.URL.Query().Get("labelSelector"))
	if rawLabelSelector != "" {
		parsedLabelSelector, parseErr := labels.Parse(rawLabelSelector)
		if parseErr != nil {
			return nil, fmt.Errorf("invalid labelSelector: %w", parseErr)
		}
		labelSelector = parsedLabelSelector
	}

	fieldSelector, err := parseFieldSelector(r.URL.Query().Get("fieldSelector"))
	if err != nil {
		return nil, err
	}

	deployments, err := h.resourceCache.ListDeployments(labelSelector)
	if err != nil {
		return nil, fmt.Errorf("list deployments from cache: %w", err)
	}

	resources := make([]model.DeployedResource, 0, len(deployments))
	for _, deployment := range deployments {
		if !matchesFieldSelector(fieldSelector, map[string]string{
			"metadata.name":      deployment.Name,
			"metadata.namespace": deployment.Namespace,
		}) {
			continue
		}
		resources = append(resources, mapDeployment(deployment))
	}

	sortResources(resources)
	return resources, nil
}

func (h *handler) listDaemonSets(r *http.Request) ([]model.DeployedResource, error) {
	labelSelector := labels.Everything()
	rawLabelSelector := strings.TrimSpace(r.URL.Query().Get("labelSelector"))
	if rawLabelSelector != "" {
		parsedLabelSelector, parseErr := labels.Parse(rawLabelSelector)
		if parseErr != nil {
			return nil, fmt.Errorf("invalid labelSelector: %w", parseErr)
		}
		labelSelector = parsedLabelSelector
	}

	fieldSelector, err := parseFieldSelector(r.URL.Query().Get("fieldSelector"))
	if err != nil {
		return nil, err
	}

	daemonSets, err := h.resourceCache.ListDaemonSets(labelSelector)
	if err != nil {
		return nil, fmt.Errorf("list daemonsets from cache: %w", err)
	}

	resources := make([]model.DeployedResource, 0, len(daemonSets))
	for _, daemonSet := range daemonSets {
		if !matchesFieldSelector(fieldSelector, map[string]string{
			"metadata.name":      daemonSet.Name,
			"metadata.namespace": daemonSet.Namespace,
		}) {
			continue
		}

		mappedResource, ok := mapDaemonSet(daemonSet)
		if !ok {
			continue
		}
		resources = append(resources, mappedResource)
	}

	sortResources(resources)
	return resources, nil
}

func mapDeployment(deployment *appsv1.Deployment) model.DeployedResource {
	resource := model.DeployedResource{Version: "", Release: ""}

	if containers := deployment.Spec.Template.Spec.Containers; len(containers) > 0 {
		resource.Version = extractLegacyImageTag(containers[0].Image)
	}

	if release, ok := deployment.Labels["release"]; ok {
		resource.Release = release
	}

	return resource
}

func mapDaemonSet(daemonSet *appsv1.DaemonSet) (model.DeployedResource, bool) {
	containers := daemonSet.Spec.Template.Spec.Containers
	if len(containers) == 0 {
		return model.DeployedResource{Version: "", Release: ""}, false
	}

	resource := model.DeployedResource{Version: "", Release: ""}
	resource.Version = extractLegacyImageTag(containers[0].Image)
	resource.Release = daemonSet.Name
	return resource, true
}

func extractLegacyImageTag(image string) string {
	parts := strings.Split(image, ":")
	if len(parts) > 1 {
		return parts[1]
	}
	return ""
}

func sortResources(resources []model.DeployedResource) {
	sort.Slice(resources, func(i, j int) bool {
		if resources[i].Release == resources[j].Release {
			return resources[i].Version < resources[j].Version
		}
		return resources[i].Release < resources[j].Release
	})
}

func (h *handler) writeSelectorError(w http.ResponseWriter, r *http.Request, err error) {
	var unsupportedFieldErr unsupportedFieldSelectorError
	if errors.As(err, &unsupportedFieldErr) {
		writeProblem(w, r, http.StatusBadRequest, "Bad Request", unsupportedFieldErr.Error())
		return
	}

	var invalidFieldErr invalidFieldSelectorError
	if errors.As(err, &invalidFieldErr) {
		writeProblem(w, r, http.StatusBadRequest, "Bad Request", invalidFieldErr.Error())
		return
	}

	if strings.Contains(err.Error(), "invalid labelSelector") {
		writeProblem(w, r, http.StatusBadRequest, "Bad Request", err.Error())
		return
	}

	h.logger.Error("request failed", "error", err)
	writeProblem(w, r, http.StatusInternalServerError, "Internal Server Error", "")
}

func (h *handler) swaggerDocument(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if _, err := w.Write([]byte(swaggerDocument)); err != nil {
		h.logger.Error("failed to write swagger document", "error", err)
	}
}

func (h *handler) swaggerIndex(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	content := `<html><body><a href="/kuberneteswrapper/swagger/v1/swagger.json">swagger.json</a></body></html>`
	if _, err := w.Write([]byte(content)); err != nil {
		h.logger.Error("failed to write swagger index", "error", err)
	}
}

func (h *handler) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET")
		w.Header().Set("Access-Control-Allow-Headers", "*")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (h *handler) recoverPanic(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				h.logger.Error("panic recovered", "error", recovered)
				if h.development {
					writeProblem(w, r, http.StatusInternalServerError, "Internal Server Error", fmt.Sprint(recovered))
					return
				}
				writeProblem(w, r, http.StatusInternalServerError, "Internal Server Error", "")
			}
		}()
		next.ServeHTTP(w, r)
	})
}
