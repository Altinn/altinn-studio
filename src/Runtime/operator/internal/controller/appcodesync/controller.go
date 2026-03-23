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
	appSecretNamespace   = "default"
	appSecretNameSuffix  = "-deployment-secrets"
	appCodesFileName     = "app-codes.json"
	defaultCodeLength    = 32
	codeIDByteLength     = 16
	codeIDLength         = 22
	baseIssueLifetime    = 31 * 24 * time.Hour
	baseAcceptLifetime   = 62 * 24 * time.Hour
	baseRotationLeadTime = 7 * 24 * time.Hour
)

type AppCodesSyncReconciler struct {
	runtime   rt.Runtime
	k8sClient client.Client
	logger    logr.Logger
}

type appCodesFile struct {
	AppCodes appCodesSection `json:"AppCodes"`
}

type rawAppCodesFile struct {
	AppCodes map[string]json.RawMessage `json:"AppCodes"`
}

type appCodeEntry struct {
	Code      string `json:"Code"`
	ExpiresAt string `json:"ExpiresAt"`
	ID        string `json:"Id"`
	IssuedAt  string `json:"IssuedAt"`
}

type appCodesSection struct {
	NotificationCallback   []appCodeEntry `json:"NotificationCallback,omitempty"`
	PaymentsCallback       []appCodeEntry `json:"PaymentsCallback,omitempty"`
	WorkflowEngineCallback []appCodeEntry `json:"WorkflowEngineCallback,omitempty"`
}

type appCode struct {
	IssuedAt  time.Time
	ExpiresAt time.Time
	Code      string
	ID        string
}

type codeTypeSpec struct {
	PropertyName     string
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
		CodeLength:       defaultCodeLength,
		IssueLifetime:    baseIssueLifetime,
		AcceptLifetime:   baseAcceptLifetime,
		RotationLeadTime: baseRotationLeadTime,
	},
	{
		PropertyName:     "PaymentsCallback",
		CodeLength:       defaultCodeLength,
		IssueLifetime:    baseIssueLifetime,
		AcceptLifetime:   baseAcceptLifetime,
		RotationLeadTime: baseRotationLeadTime,
	},
	{
		PropertyName:     "WorkflowEngineCallback",
		CodeLength:       defaultCodeLength,
		IssueLifetime:    baseIssueLifetime * 3,
		AcceptLifetime:   baseAcceptLifetime * 3,
		RotationLeadTime: baseRotationLeadTime * 3,
	},
}

// +kubebuilder:rbac:groups="",resources=secrets,verbs=get;list;watch;update

var errSecretUpdateRetryExhausted = errors.New("failed to update secret after conflict retries")
var errGeneratedInvalidCodeIDLength = errors.New("generated invalid code ID length")
var errUnmarshalAppCodeEntries = errors.New("unmarshal app-code entries")

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
	currentFile, err := parseAppCodesFile(secret)
	if err != nil {
		span.RecordError(err)
		return 0, err
	}
	desiredFile := appCodesFile{AppCodes: appCodesSection{}}

	var nextRequeue time.Duration
	for _, spec := range codeTypeSpecs {
		current, parseErr := parseCodesForSpec(currentFile, spec, now)
		if parseErr != nil {
			span.RecordError(parseErr)
			return 0, fmt.Errorf("parse current codes for %s: %w", spec.PropertyName, parseErr)
		}

		desired, buildErr := buildDesiredCodes(spec, current, now)
		if buildErr != nil {
			span.RecordError(buildErr)
			return 0, fmt.Errorf("build desired codes for %s: %w", spec.PropertyName, buildErr)
		}

		setCodeEntries(&desiredFile.AppCodes, spec.PropertyName, marshalCodeEntries(desired))
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

	if slices.Equal(currentFileBytes, desiredFileBytes) {
		return nextRequeue, nil
	}

	if err := r.updateSecretWithRetry(ctx, secret, desiredFileBytes); err != nil {
		return 0, err
	}
	return nextRequeue, nil
}

func parseAppCodesFile(secret *corev1.Secret) (rawAppCodesFile, error) {
	if secret.Data == nil {
		return rawAppCodesFile{}, nil
	}

	content, ok := secret.Data[appCodesFileName]
	if !ok || len(content) == 0 {
		return rawAppCodesFile{}, nil
	}

	var parsed rawAppCodesFile
	if err := json.Unmarshal(content, &parsed); err != nil {
		return rawAppCodesFile{}, fmt.Errorf("unmarshal app codes file: %w", err)
	}

	return parsed, nil
}

func parseCodesForSpec(file rawAppCodesFile, spec codeTypeSpec, now time.Time) ([]appCode, error) {
	entries, err := parseCodeEntriesForSpec(file, spec)
	if err != nil {
		return nil, err
	}
	if len(entries) == 0 {
		return nil, nil
	}

	result := make([]appCode, 0, len(entries))
	seenCodes := make(map[string]struct{}, len(entries))
	seenIDs := make(map[string]struct{}, len(entries))
	for _, entry := range entries {
		if !isValidURLSafeToken(entry.Code, spec.CodeLength) {
			continue
		}
		if _, exists := seenCodes[entry.Code]; exists {
			continue
		}
		seenCodes[entry.Code] = struct{}{}

		id := entry.ID
		if !isValidURLSafeToken(id, codeIDLength) {
			var err error
			id, err = newCodeID()
			if err != nil {
				return nil, fmt.Errorf("generate code ID for %s: %w", spec.PropertyName, err)
			}
		}
		if _, exists := seenIDs[id]; exists {
			var err error
			id, err = newCodeID()
			if err != nil {
				return nil, fmt.Errorf("regenerate duplicate code ID for %s: %w", spec.PropertyName, err)
			}
		}
		seenIDs[id] = struct{}{}

		issuedAt, ok := parseCodeTime(entry.IssuedAt, now)
		if !ok {
			issuedAt = now
		}

		// Expiry is derived from issuance and controller policy so the file can
		// heal stale or corrupt timestamps without changing acceptance semantics.
		result = append(result, appCode{
			Code:      entry.Code,
			ID:        id,
			IssuedAt:  issuedAt,
			ExpiresAt: issuedAt.Add(spec.AcceptLifetime),
		})
	}

	normalizeCodeOrder(result)
	if len(result) > spec.maxRetainedCodes() {
		result = result[:spec.maxRetainedCodes()]
	}

	return result, nil
}

func parseCodeEntriesForSpec(file rawAppCodesFile, spec codeTypeSpec) ([]appCodeEntry, error) {
	if len(file.AppCodes) == 0 {
		return nil, nil
	}

	raw, ok := file.AppCodes[spec.PropertyName]
	if !ok || len(raw) == 0 {
		return nil, nil
	}

	var entries []appCodeEntry
	if err := json.Unmarshal(raw, &entries); err == nil {
		return entries, nil
	}

	var legacyCodes []string
	if err := json.Unmarshal(raw, &legacyCodes); err == nil {
		return legacyStringEntries(legacyCodes), nil
	}

	return nil, fmt.Errorf("%w for %s", errUnmarshalAppCodeEntries, spec.PropertyName)
}

func legacyStringEntries(values []string) []appCodeEntry {
	entries := make([]appCodeEntry, 0, len(values))
	for _, value := range values {
		entries = append(entries, appCodeEntry{Code: value})
	}
	return entries
}

func setCodeEntries(section *appCodesSection, propertyName string, values []appCodeEntry) {
	switch propertyName {
	case "NotificationCallback":
		section.NotificationCallback = values
	case "PaymentsCallback":
		section.PaymentsCallback = values
	case "WorkflowEngineCallback":
		section.WorkflowEngineCallback = values
	}
}

func parseCodeTime(raw string, now time.Time) (time.Time, bool) {
	if raw == "" {
		return time.Time{}, false
	}

	parsed, err := time.Parse(time.RFC3339, raw)
	if err != nil || parsed.After(now) {
		return time.Time{}, false
	}

	return parsed.UTC(), true
}

func buildDesiredCodes(spec codeTypeSpec, current []appCode, now time.Time) ([]appCode, error) {
	active := make([]appCode, 0, len(current))
	for _, code := range current {
		if now.Before(code.ExpiresAt) {
			active = append(active, code)
		}
	}

	if len(active) == 0 {
		code, err := newCode(spec, now)
		if err != nil {
			return nil, err
		}
		return []appCode{code}, nil
	}

	rotationDueAt := active[0].IssuedAt.Add(spec.rotationInterval())
	if len(active) < spec.maxRetainedCodes() && !now.Before(rotationDueAt) {
		code, err := newCode(spec, now)
		if err != nil {
			return nil, err
		}
		active = append([]appCode{code}, active...)
	}

	normalizeCodeOrder(active)
	if len(active) > spec.maxRetainedCodes() {
		active = active[:spec.maxRetainedCodes()]
	}

	return active, nil
}

func normalizeCodeOrder(codes []appCode) {
	slices.SortFunc(codes, func(a, b appCode) int {
		return b.IssuedAt.Compare(a.IssuedAt)
	})
}

func nextRequeueAfter(spec codeTypeSpec, codes []appCode, now time.Time) time.Duration {
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
		recordCandidate(code.ExpiresAt)
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

func newCode(spec codeTypeSpec, now time.Time) (appCode, error) {
	id, err := newCodeID()
	if err != nil {
		return appCode{}, fmt.Errorf("generate %s code ID: %w", spec.PropertyName, err)
	}

	code, err := randomutil.GenerateURLSafeString(spec.CodeLength)
	if err != nil {
		return appCode{}, fmt.Errorf("generate %s code: %w", spec.PropertyName, err)
	}

	return appCode{
		Code:      code,
		ID:        id,
		IssuedAt:  now.UTC(),
		ExpiresAt: now.UTC().Add(spec.AcceptLifetime),
	}, nil
}

func newCodeID() (string, error) {
	id, err := randomutil.GenerateURLSafeStringFromBytes(codeIDByteLength)
	if err != nil {
		return "", fmt.Errorf("generate code ID: %w", err)
	}
	if !isValidURLSafeToken(id, codeIDLength) {
		return "", fmt.Errorf("%w: %d", errGeneratedInvalidCodeIDLength, len(id))
	}
	return id, nil
}

func marshalCodeEntries(codes []appCode) []appCodeEntry {
	values := make([]appCodeEntry, 0, len(codes))
	for _, code := range codes {
		values = append(values, appCodeEntry{
			Code:      code.Code,
			ExpiresAt: code.ExpiresAt.UTC().Format(time.RFC3339),
			ID:        code.ID,
			IssuedAt:  code.IssuedAt.UTC().Format(time.RFC3339),
		})
	}
	return values
}

func isValidURLSafeToken(value string, expectedLength int) bool {
	if len(value) != expectedLength {
		return false
	}

	for _, ch := range value {
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
) error {
	const maxUpdateRetries = 3

	for attempt := range maxUpdateRetries {
		updatedSecret := secret.DeepCopy()
		if updatedSecret.Data == nil {
			updatedSecret.Data = make(map[string][]byte)
		}

		updatedSecret.Data[appCodesFileName] = appCodesFile

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
