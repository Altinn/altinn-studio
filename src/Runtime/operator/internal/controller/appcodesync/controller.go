package appcodesync

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/go-logr/logr"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	randomutil "altinn.studio/operator/internal/random"
	rt "altinn.studio/operator/internal/runtime"
)

const (
	appSecretNamespace           = "default"
	appSecretNameSuffix          = "-deployment-secrets"
	appCodesFileName             = "app-codes.json"
	monthlyIssuedAtAnnotationKey = "altinn.studio/app-codes-monthly-issued-at"
	monthlyCodeLength            = 32
	// Codes are issued on a monthly cadence, but may be returned for verification
	// up to one additional month later.
	maxMonthlyCodes             = 3
	monthlyCodeIssueLifetime    = 31 * 24 * time.Hour
	monthlyCodeAcceptLifetime   = 62 * 24 * time.Hour
	monthlyCodeRotationLeadTime = 7 * 24 * time.Hour
	monthlyCodeRotationInterval = monthlyCodeIssueLifetime - monthlyCodeRotationLeadTime
)

type AppCodesSyncReconciler struct {
	runtime   rt.Runtime
	k8sClient client.Client
	logger    logr.Logger
}

type appCodesFile struct {
	AppCodes appCodesSection `json:"AppCodes"`
}

type appCodesSection struct {
	Monthly []string `json:"Monthly"`
}

type monthlyCode struct {
	IssuedAt time.Time
	Value    string
}

// +kubebuilder:rbac:groups="",resources=secrets,verbs=get;list;watch;update

var errSecretUpdateRetryExhausted = errors.New("failed to update secret after conflict retries")

func NewReconciler(runtime rt.Runtime, k8sClient client.Client) *AppCodesSyncReconciler {
	return &AppCodesSyncReconciler{
		logger:    log.FromContext(context.Background()).WithName("appcodesync"),
		k8sClient: k8sClient,
		runtime:   runtime,
	}
}

func (r *AppCodesSyncReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	tracer := r.runtime.Tracer()
	ctx, span := tracer.Start(ctx, "appcodesync.Reconcile",
		trace.WithAttributes(
			attribute.String("name", req.Name),
			attribute.String("namespace", req.Namespace),
		),
	)
	defer span.End()

	if !isTargetSecret(req.Namespace, req.Name, r.serviceOwnerPrefix()) {
		return ctrl.Result{}, nil
	}

	secret := &corev1.Secret{}
	if err := r.k8sClient.Get(ctx, req.NamespacedName, secret); err != nil {
		if apierrors.IsNotFound(err) {
			return ctrl.Result{}, nil
		}
		span.RecordError(err)
		return ctrl.Result{}, fmt.Errorf("get secret: %w", err)
	}

	requeueAfter, err := r.syncSecret(ctx, secret)
	if err != nil {
		span.RecordError(err)
		return ctrl.Result{}, err
	}

	if requeueAfter <= 0 {
		return ctrl.Result{}, nil
	}
	return ctrl.Result{RequeueAfter: requeueAfter}, nil
}

func (r *AppCodesSyncReconciler) SetupWithManager(mgr ctrl.Manager) error {
	if err := ctrl.NewControllerManagedBy(mgr).
		Named("appcodesync").
		For(&corev1.Secret{}, builder.WithPredicates(r.secretPredicate())).
		Complete(r); err != nil {
		return fmt.Errorf("complete AppCodesSync controller builder: %w", err)
	}
	return nil
}

func (r *AppCodesSyncReconciler) secretPredicate() predicate.Predicate {
	return predicate.Funcs{
		CreateFunc: func(e event.CreateEvent) bool {
			return isTargetSecret(e.Object.GetNamespace(), e.Object.GetName(), r.serviceOwnerPrefix())
		},
		UpdateFunc: func(e event.UpdateEvent) bool {
			return isTargetSecret(e.ObjectNew.GetNamespace(), e.ObjectNew.GetName(), r.serviceOwnerPrefix())
		},
		DeleteFunc: func(event.DeleteEvent) bool {
			return false
		},
		GenericFunc: func(e event.GenericEvent) bool {
			return isTargetSecret(e.Object.GetNamespace(), e.Object.GetName(), r.serviceOwnerPrefix())
		},
	}
}

func (r *AppCodesSyncReconciler) serviceOwnerPrefix() string {
	return r.runtime.GetOperatorContext().ServiceOwner.Id + "-"
}

func isTargetSecret(namespace, name, serviceOwnerPrefix string) bool {
	if namespace != appSecretNamespace {
		return false
	}
	if !strings.HasPrefix(name, serviceOwnerPrefix) || !strings.HasSuffix(name, appSecretNameSuffix) {
		return false
	}

	return len(name) > len(serviceOwnerPrefix)+len(appSecretNameSuffix)
}

func (r *AppCodesSyncReconciler) syncSecret(ctx context.Context, secret *corev1.Secret) (time.Duration, error) {
	tracer := r.runtime.Tracer()
	ctx, span := tracer.Start(ctx, "appcodesync.syncSecret",
		trace.WithAttributes(
			attribute.String("name", secret.Name),
			attribute.String("namespace", secret.Namespace),
		),
	)
	defer span.End()

	now := r.runtime.GetClock().Now().UTC()
	current := parseMonthlyCodes(secret, now)
	desired, err := buildDesiredMonthlyCodes(current, now)
	if err != nil {
		span.RecordError(err)
		return 0, fmt.Errorf("build desired monthly codes: %w", err)
	}

	desiredFile, desiredIssuedAt, err := marshalMonthlyCodes(desired)
	if err != nil {
		span.RecordError(err)
		return 0, fmt.Errorf("marshal desired monthly codes: %w", err)
	}

	currentFile := []byte(nil)
	if secret.Data != nil {
		currentFile = secret.Data[appCodesFileName]
	}
	currentIssuedAt := ""
	if secret.Annotations != nil {
		currentIssuedAt = secret.Annotations[monthlyIssuedAtAnnotationKey]
	}

	if slices.Equal(currentFile, desiredFile) && currentIssuedAt == desiredIssuedAt {
		return nextRequeueAfter(desired, now), nil
	}

	if err := r.updateSecretWithRetry(ctx, secret, desiredFile, desiredIssuedAt); err != nil {
		return 0, err
	}
	return nextRequeueAfter(desired, now), nil
}

func parseMonthlyCodes(secret *corev1.Secret, now time.Time) []monthlyCode {
	monthlyValues := parseMonthlyCodeValues(secret)
	if len(monthlyValues) == 0 {
		return nil
	}

	issuedAt, ok := parseMonthlyIssuedAt(secret, now, len(monthlyValues))
	if !ok {
		return nil
	}

	result := make([]monthlyCode, 0, min(len(monthlyValues), maxMonthlyCodes))
	seen := make(map[string]struct{}, len(monthlyValues))
	for i, code := range monthlyValues {
		if !isValidMonthlyCode(code) {
			continue
		}
		if _, exists := seen[code]; exists {
			continue
		}
		seen[code] = struct{}{}
		result = append(result, monthlyCode{
			Value:    code,
			IssuedAt: issuedAt[i],
		})
		if len(result) == maxMonthlyCodes {
			break
		}
	}

	return result
}

func parseMonthlyCodeValues(secret *corev1.Secret) []string {
	if secret.Data == nil {
		return nil
	}

	content, ok := secret.Data[appCodesFileName]
	if !ok || len(content) == 0 {
		return nil
	}

	var parsed appCodesFile
	if err := json.Unmarshal(content, &parsed); err != nil {
		return nil
	}

	return parsed.AppCodes.Monthly
}

func parseMonthlyIssuedAt(secret *corev1.Secret, now time.Time, codeCount int) ([]time.Time, bool) {
	if secret.Annotations == nil {
		return nil, false
	}

	raw := secret.Annotations[monthlyIssuedAtAnnotationKey]
	if raw == "" {
		return nil, false
	}

	var encoded []string
	if err := json.Unmarshal([]byte(raw), &encoded); err != nil {
		return nil, false
	}
	if len(encoded) != codeCount {
		return nil, false
	}

	result := make([]time.Time, 0, codeCount)
	for i := range encoded {
		ts, err := time.Parse(time.RFC3339, encoded[i])
		if err != nil || ts.After(now) {
			return nil, false
		}
		result = append(result, ts.UTC())
	}

	return result, true
}

func buildDesiredMonthlyCodes(current []monthlyCode, now time.Time) ([]monthlyCode, error) {
	active := make([]monthlyCode, 0, len(current))
	for _, code := range current {
		if now.Before(code.IssuedAt.Add(monthlyCodeAcceptLifetime)) {
			active = append(active, code)
		}
	}

	if len(active) == 0 {
		code, err := newMonthlyCode(now)
		if err != nil {
			return nil, err
		}
		return []monthlyCode{code}, nil
	}

	rotationDueAt := active[0].IssuedAt.Add(monthlyCodeRotationInterval)
	if len(active) < maxMonthlyCodes && !now.Before(rotationDueAt) {
		code, err := newMonthlyCode(now)
		if err != nil {
			return nil, err
		}
		active = append([]monthlyCode{code}, active...)
	}

	if len(active) > maxMonthlyCodes {
		active = active[:maxMonthlyCodes]
	}

	return active, nil
}

func nextRequeueAfter(monthlyCodes []monthlyCode, now time.Time) time.Duration {
	if len(monthlyCodes) == 0 {
		return 0
	}

	var next time.Time
	recordCandidate := func(candidate time.Time) {
		if !candidate.After(now) {
			return
		}
		if next.IsZero() || candidate.Before(next) {
			next = candidate
		}
	}

	for _, code := range monthlyCodes {
		recordCandidate(code.IssuedAt.Add(monthlyCodeAcceptLifetime))
	}
	if len(monthlyCodes) < maxMonthlyCodes {
		recordCandidate(monthlyCodes[0].IssuedAt.Add(monthlyCodeRotationInterval))
	}

	if next.IsZero() {
		return 0
	}
	return next.Sub(now)
}

func newMonthlyCode(now time.Time) (monthlyCode, error) {
	value, err := randomutil.GenerateURLSafeString(monthlyCodeLength)
	if err != nil {
		return monthlyCode{}, fmt.Errorf("generate monthly code: %w", err)
	}

	return monthlyCode{
		Value:    value,
		IssuedAt: now.UTC(),
	}, nil
}

func marshalMonthlyCodes(monthlyCodes []monthlyCode) ([]byte, string, error) {
	monthly := make([]string, 0, len(monthlyCodes))
	issuedAt := make([]string, 0, len(monthlyCodes))
	for _, code := range monthlyCodes {
		monthly = append(monthly, code.Value)
		issuedAt = append(issuedAt, code.IssuedAt.UTC().Format(time.RFC3339))
	}

	fileData, err := json.Marshal(appCodesFile{
		AppCodes: appCodesSection{
			Monthly: monthly,
		},
	})
	if err != nil {
		return nil, "", fmt.Errorf("marshal app codes file: %w", err)
	}

	issuedAtData, err := json.Marshal(issuedAt)
	if err != nil {
		return nil, "", fmt.Errorf("marshal issued-at annotation: %w", err)
	}

	return fileData, string(issuedAtData), nil
}

func isValidMonthlyCode(code string) bool {
	if len(code) != monthlyCodeLength {
		return false
	}

	for _, ch := range code {
		if ch >= 'a' && ch <= 'z' {
			continue
		}
		if ch >= 'A' && ch <= 'Z' {
			continue
		}
		if ch >= '0' && ch <= '9' {
			continue
		}
		if ch == '-' || ch == '_' {
			continue
		}
		return false
	}

	return true
}

func (r *AppCodesSyncReconciler) updateSecretWithRetry(
	ctx context.Context,
	secret *corev1.Secret,
	appCodesFile []byte,
	issuedAt string,
) error {
	const maxUpdateRetries = 3

	for attempt := range maxUpdateRetries {
		updatedSecret := secret.DeepCopy()
		if updatedSecret.Data == nil {
			updatedSecret.Data = make(map[string][]byte)
		}
		if updatedSecret.Annotations == nil {
			updatedSecret.Annotations = make(map[string]string)
		}
		updatedSecret.Data[appCodesFileName] = appCodesFile
		updatedSecret.Annotations[monthlyIssuedAtAnnotationKey] = issuedAt

		err := r.k8sClient.Update(ctx, updatedSecret)
		if err == nil {
			r.logger.Info("updated app codes", "name", secret.Name, "namespace", secret.Namespace)
			return nil
		}
		if !apierrors.IsConflict(err) {
			return fmt.Errorf("update secret: %w", err)
		}

		r.logger.Info(
			"conflict updating app secret, retrying",
			"name", secret.Name,
			"namespace", secret.Namespace,
			"attempt", attempt+1,
		)
		if err := r.k8sClient.Get(ctx, client.ObjectKeyFromObject(secret), secret); err != nil {
			return fmt.Errorf("refresh secret: %w", err)
		}
	}

	return fmt.Errorf("%w: %s/%s", errSecretUpdateRetryExhausted, secret.Namespace, secret.Name)
}
