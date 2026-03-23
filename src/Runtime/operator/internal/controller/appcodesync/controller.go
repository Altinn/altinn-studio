package appcodesync

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
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
	appSecretNamespace   = "default"
	appSecretNameSuffix  = "-deployment-secrets"
	appCodesFileName     = "app-codes.json"
	defaultCodeLength    = 32
	baseIssueLifetime    = 31 * 24 * time.Hour
	baseAcceptLifetime   = 62 * 24 * time.Hour
	baseRotationLeadTime = 7 * 24 * time.Hour

	notificationCallbackIssuedAtAnnotationKey = "altinn.studio/app-codes-notificationcallback-issued-at"
	paymentsCallbackIssuedAtAnnotationKey     = "altinn.studio/app-codes-paymentscallback-issued-at"
	workflowIssuedAtAnnotationKey             = "altinn.studio/app-codes-workflowenginecallback-issued-at"
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
	NotificationCallback   []string `json:"NotificationCallback,omitempty"`
	PaymentsCallback       []string `json:"PaymentsCallback,omitempty"`
	WorkflowEngineCallback []string `json:"WorkflowEngineCallback,omitempty"`
}

type issuedCode struct {
	IssuedAt time.Time
	Value    string
}

type codeTypeSpec struct {
	PropertyName     string
	AnnotationKey    string
	CodeLength       int
	IssueLifetime    time.Duration
	AcceptLifetime   time.Duration
	RotationLeadTime time.Duration
}

func (s codeTypeSpec) rotationInterval() time.Duration {
	return s.IssueLifetime - s.RotationLeadTime
}

func (s codeTypeSpec) maxRetainedCodes() int {
	interval := s.rotationInterval()
	if interval <= 0 {
		return 1
	}
	return int((s.AcceptLifetime + interval - 1) / interval)
}

var codeTypeSpecs = []codeTypeSpec{
	{
		PropertyName:     "NotificationCallback",
		AnnotationKey:    notificationCallbackIssuedAtAnnotationKey,
		CodeLength:       defaultCodeLength,
		IssueLifetime:    baseIssueLifetime,
		AcceptLifetime:   baseAcceptLifetime,
		RotationLeadTime: baseRotationLeadTime,
	},
	{
		PropertyName:     "PaymentsCallback",
		AnnotationKey:    paymentsCallbackIssuedAtAnnotationKey,
		CodeLength:       defaultCodeLength,
		IssueLifetime:    baseIssueLifetime,
		AcceptLifetime:   baseAcceptLifetime,
		RotationLeadTime: baseRotationLeadTime,
	},
	{
		PropertyName:     "WorkflowEngineCallback",
		AnnotationKey:    workflowIssuedAtAnnotationKey,
		CodeLength:       defaultCodeLength,
		IssueLifetime:    baseIssueLifetime * 3,
		AcceptLifetime:   baseAcceptLifetime * 3,
		RotationLeadTime: baseRotationLeadTime * 3,
	},
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
	currentFile := parseAppCodesFile(secret)
	desiredFile := appCodesFile{AppCodes: appCodesSection{}}
	desiredAnnotations := make(map[string]string, len(codeTypeSpecs))

	var nextRequeue time.Duration
	for _, spec := range codeTypeSpecs {
		current := parseCodesForSpec(secret, currentFile, spec, now)
		desired, err := buildDesiredCodes(spec, current, now)
		if err != nil {
			span.RecordError(err)
			return 0, fmt.Errorf("build desired codes for %s: %w", spec.PropertyName, err)
		}

		setCodeValues(&desiredFile.AppCodes, spec.PropertyName, codeValues(desired))

		issuedAt, err := marshalIssuedAtAnnotation(desired)
		if err != nil {
			span.RecordError(err)
			return 0, fmt.Errorf("marshal issued-at for %s: %w", spec.PropertyName, err)
		}
		desiredAnnotations[spec.AnnotationKey] = issuedAt

		nextRequeue = minPositiveDuration(nextRequeue, nextRequeueAfter(spec, desired, now))
	}

	desiredFileBytes, err := json.Marshal(desiredFile)
	if err != nil {
		span.RecordError(err)
		return 0, fmt.Errorf("marshal app codes file: %w", err)
	}

	currentFileBytes := []byte(nil)
	if secret.Data != nil {
		currentFileBytes = secret.Data[appCodesFileName]
	}

	if slices.Equal(currentFileBytes, desiredFileBytes) &&
		managedAnnotationsEqual(secret.Annotations, desiredAnnotations) {
		return nextRequeue, nil
	}

	if err := r.updateSecretWithRetry(ctx, secret, desiredFileBytes, desiredAnnotations); err != nil {
		return 0, err
	}
	return nextRequeue, nil
}

func parseAppCodesFile(secret *corev1.Secret) appCodesFile {
	if secret.Data == nil {
		return appCodesFile{}
	}

	content, ok := secret.Data[appCodesFileName]
	if !ok || len(content) == 0 {
		return appCodesFile{}
	}

	var parsed appCodesFile
	if err := json.Unmarshal(content, &parsed); err != nil {
		return appCodesFile{}
	}

	return parsed
}

func parseCodesForSpec(secret *corev1.Secret, file appCodesFile, spec codeTypeSpec, now time.Time) []issuedCode {
	values := getCodeValues(file.AppCodes, spec.PropertyName)
	if len(values) == 0 {
		return nil
	}

	issuedAt, ok := parseIssuedAtAnnotation(secret.Annotations, spec.AnnotationKey, len(values), now)
	result := make([]issuedCode, 0, min(len(values), spec.maxRetainedCodes()))
	seen := make(map[string]struct{}, len(values))
	for i, value := range values {
		if !isValidCode(value, spec.CodeLength) {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}

		codeIssuedAt := now.UTC()
		if ok {
			codeIssuedAt = issuedAt[i]
		}
		// If the metadata is lost or corrupted, keep existing valid codes and
		// treat them as newly issued rather than invalidating active consumers.
		result = append(result, issuedCode{
			Value:    value,
			IssuedAt: codeIssuedAt,
		})
		if len(result) == spec.maxRetainedCodes() {
			break
		}
	}

	return result
}

func getCodeValues(section appCodesSection, propertyName string) []string {
	switch propertyName {
	case "NotificationCallback":
		return section.NotificationCallback
	case "PaymentsCallback":
		return section.PaymentsCallback
	case "WorkflowEngineCallback":
		return section.WorkflowEngineCallback
	default:
		return nil
	}
}

func setCodeValues(section *appCodesSection, propertyName string, values []string) {
	switch propertyName {
	case "NotificationCallback":
		section.NotificationCallback = values
	case "PaymentsCallback":
		section.PaymentsCallback = values
	case "WorkflowEngineCallback":
		section.WorkflowEngineCallback = values
	}
}

func parseIssuedAtAnnotation(
	annotations map[string]string,
	annotationKey string,
	codeCount int,
	now time.Time,
) ([]time.Time, bool) {
	if annotations == nil {
		return nil, false
	}

	raw := annotations[annotationKey]
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

func buildDesiredCodes(spec codeTypeSpec, current []issuedCode, now time.Time) ([]issuedCode, error) {
	active := make([]issuedCode, 0, len(current))
	for _, code := range current {
		if now.Before(code.IssuedAt.Add(spec.AcceptLifetime)) {
			active = append(active, code)
		}
	}

	if len(active) == 0 {
		code, err := newCode(spec, now)
		if err != nil {
			return nil, err
		}
		return []issuedCode{code}, nil
	}

	rotationDueAt := active[0].IssuedAt.Add(spec.rotationInterval())
	if len(active) < spec.maxRetainedCodes() && !now.Before(rotationDueAt) {
		code, err := newCode(spec, now)
		if err != nil {
			return nil, err
		}
		active = append([]issuedCode{code}, active...)
	}

	if len(active) > spec.maxRetainedCodes() {
		active = active[:spec.maxRetainedCodes()]
	}

	return active, nil
}

func nextRequeueAfter(spec codeTypeSpec, codes []issuedCode, now time.Time) time.Duration {
	if len(codes) == 0 {
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

	for _, code := range codes {
		recordCandidate(code.IssuedAt.Add(spec.AcceptLifetime))
	}
	if len(codes) < spec.maxRetainedCodes() {
		recordCandidate(codes[0].IssuedAt.Add(spec.rotationInterval()))
	}

	if next.IsZero() {
		return 0
	}
	return next.Sub(now)
}

func minPositiveDuration(current, next time.Duration) time.Duration {
	if next <= 0 {
		return current
	}
	if current <= 0 || next < current {
		return next
	}
	return current
}

func newCode(spec codeTypeSpec, now time.Time) (issuedCode, error) {
	value, err := randomutil.GenerateURLSafeString(spec.CodeLength)
	if err != nil {
		return issuedCode{}, fmt.Errorf("generate %s code: %w", spec.PropertyName, err)
	}

	return issuedCode{
		Value:    value,
		IssuedAt: now.UTC(),
	}, nil
}

func codeValues(codes []issuedCode) []string {
	values := make([]string, 0, len(codes))
	for _, code := range codes {
		values = append(values, code.Value)
	}
	return values
}

func marshalIssuedAtAnnotation(codes []issuedCode) (string, error) {
	issuedAt := make([]string, 0, len(codes))
	for _, code := range codes {
		issuedAt = append(issuedAt, code.IssuedAt.UTC().Format(time.RFC3339))
	}

	data, err := json.Marshal(issuedAt)
	if err != nil {
		return "", fmt.Errorf("marshal issued-at annotation: %w", err)
	}
	return string(data), nil
}

func managedAnnotationsEqual(current, desired map[string]string) bool {
	for key, value := range desired {
		if current == nil || current[key] != value {
			return false
		}
	}

	for key := range current {
		if isAppCodesAnnotationKey(key) && desired[key] == "" {
			return false
		}
	}

	return true
}

func isAppCodesAnnotationKey(key string) bool {
	for _, spec := range codeTypeSpecs {
		if key == spec.AnnotationKey {
			return true
		}
	}
	return false
}

func isValidCode(code string, codeLength int) bool {
	if len(code) != codeLength {
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
	issuedAtAnnotations map[string]string,
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
		for key := range updatedSecret.Annotations {
			if isAppCodesAnnotationKey(key) {
				delete(updatedSecret.Annotations, key)
			}
		}
		maps.Copy(updatedSecret.Annotations, issuedAtAnnotations)

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
