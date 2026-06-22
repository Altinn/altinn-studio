package maskinporten

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	apimeta "k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	resourcesv1alpha1 "altinn.studio/operator/api/v1alpha1"
	"altinn.studio/operator/internal/assert"
	"altinn.studio/operator/internal/maskinporten"
	"altinn.studio/operator/internal/resourcename"
)

const (
	maskinportenRotationRolloutHourUTC = 2
	appReleaseLabelKey                 = "release"
)

var errEmptyOperatorServiceOwnerScope = errors.New("operator service owner scope is empty")
var errAppDeploymentNotFound = errors.New("app Deployment not found")
var errUnexpectedAppDeploymentCount = errors.New("unexpected number of app Deployments")

type rotationRolloutProcessor struct {
	reconciler *MaskinportenClientReconciler
}

func newRotationRolloutProcessor(reconciler *MaskinportenClientReconciler) *rotationRolloutProcessor {
	return &rotationRolloutProcessor{reconciler: reconciler}
}

func (p *rotationRolloutProcessor) NeedLeaderElection() bool {
	return true
}

func (p *rotationRolloutProcessor) Start(ctx context.Context) error {
	assert.That(p.reconciler != nil, "rotationRolloutProcessor requires a reconciler")
	assert.That(p.reconciler.runtime != nil, "rotationRolloutProcessor requires runtime")

	clock := p.reconciler.runtime.GetClock()
	logger := log.FromContext(ctx).WithName("maskinporten-rotation-rollout")
	logger.Info(
		"starting Maskinporten rotation rollout processor",
		"hourUTC",
		maskinportenRotationRolloutHourUTC,
	)
	defer logger.Info("exiting Maskinporten rotation rollout processor")

	for {
		now := clock.Now().UTC()
		delay := durationUntilNextRotationRollout(now)
		logger.Info("scheduled Maskinporten rotation rollout processing", "runAfter", delay)

		select {
		case <-ctx.Done():
			return nil
		case <-clock.After(delay):
		}

		if err := p.reconciler.processPendingMaskinportenRotationRollouts(ctx, clock.Now().UTC()); err != nil {
			logger.Error(err, "Maskinporten rotation rollout processing failed")
		}
	}
}

func durationUntilNextRotationRollout(now time.Time) time.Duration {
	now = now.UTC()
	next := time.Date(
		now.Year(),
		now.Month(),
		now.Day(),
		maskinportenRotationRolloutHourUTC,
		0,
		0,
		0,
		time.UTC,
	)
	if now.After(next) {
		next = next.AddDate(0, 0, 1)
	}
	return next.Sub(now)
}

func (r *MaskinportenClientReconciler) processPendingMaskinportenRotationRollouts(
	ctx context.Context,
	now time.Time,
) error {
	ctx, span := r.runtime.Tracer().Start(
		ctx,
		"MaskinportenRotationRollout.processPending",
		trace.WithAttributes(attribute.String("scheduled_at", now.UTC().Format(time.RFC3339))),
	)
	defer span.End()

	logger := log.FromContext(ctx).WithName("maskinporten-rotation-rollout")
	serviceOwnerID := r.serviceOwnerID()
	span.SetAttributes(attribute.String("service_owner", serviceOwnerID))
	if serviceOwnerID == "" {
		span.SetStatus(codes.Error, "operator service owner scope is empty")
		span.RecordError(errEmptyOperatorServiceOwnerScope)
		return errEmptyOperatorServiceOwnerScope
	}

	list := &resourcesv1alpha1.MaskinportenClientList{}
	if err := r.List(ctx, list); err != nil {
		span.SetStatus(codes.Error, "list MaskinportenClients")
		span.RecordError(err)
		return fmt.Errorf("list MaskinportenClients: %w", err)
	}
	span.SetAttributes(attribute.Int("maskinporten_client_count", len(list.Items)))

	var errs []error
	for i := range list.Items {
		instance := &list.Items[i]

		releaseName, inScope, err := appReleaseNameForMaskinportenClient(instance, serviceOwnerID)
		if err != nil {
			errs = append(errs, err)
			continue
		}
		if !inScope {
			logger.Info(
				"skipping MaskinportenClient outside operator service owner scope",
				"maskinportenClient", instance.Name,
				"namespace", instance.Namespace,
				"serviceOwner", serviceOwnerID,
			)
			continue
		}
		secretAppLabel := instance.GetLabels()["app"]
		if secretAppLabel == "" {
			secretAppLabel = releaseName + "-deployment"
		}

		if err := r.processInScopeMaskinportenRotationRollout(
			ctx,
			instance,
			releaseName,
			secretAppLabel,
			now,
		); err != nil {
			logger.Error(
				err,
				"failed processing Maskinporten rotation rollout",
				"maskinportenClient", instance.Name,
				"namespace", instance.Namespace,
				"release", releaseName,
			)
			errs = append(errs, err)
		}
	}

	if err := errors.Join(errs...); err != nil {
		span.SetStatus(codes.Error, "one or more Maskinporten rotation rollouts failed")
		span.RecordError(err)
		return err
	}

	span.SetStatus(codes.Ok, "processed Maskinporten rotation rollouts")
	return nil
}

func (r *MaskinportenClientReconciler) processInScopeMaskinportenRotationRollout(
	ctx context.Context,
	instance *resourcesv1alpha1.MaskinportenClient,
	releaseName string,
	secretAppLabel string,
	now time.Time,
) error {
	ctx, span := r.runtime.Tracer().Start(
		ctx,
		"MaskinportenRotationRollout.processItem",
		trace.WithAttributes(
			attribute.String("namespace", instance.Namespace),
			attribute.String("maskinporten_client", instance.Name),
			attribute.String("release", releaseName),
			attribute.String("app_label", secretAppLabel),
		),
	)
	defer span.End()

	fingerprint, err := r.pendingRotationFingerprint(ctx, instance, secretAppLabel)
	if err != nil {
		span.SetStatus(codes.Error, "determine pending rotation fingerprint")
		span.RecordError(err)
		return err
	}
	if fingerprint == "" {
		span.SetStatus(codes.Ok, "no pending rotation")
		return nil
	}
	span.SetAttributes(attribute.String("fingerprint", fingerprint))

	if err := r.processPendingMaskinportenRotationRollout(ctx, instance, releaseName, fingerprint, now); err != nil {
		span.SetStatus(codes.Error, "process pending rotation rollout")
		span.RecordError(err)
		return err
	}

	span.SetStatus(codes.Ok, "processed pending rotation rollout")
	return nil
}

func (r *MaskinportenClientReconciler) processPendingMaskinportenRotationRollout(
	ctx context.Context,
	instance *resourcesv1alpha1.MaskinportenClient,
	releaseName string,
	fingerprint string,
	now time.Time,
) error {
	logger := log.FromContext(ctx).WithName("maskinporten-rotation-rollout")

	deployment, err := r.appDeploymentByReleaseLabel(ctx, instance.Namespace, releaseName)
	if err != nil {
		if errors.Is(err, errAppDeploymentNotFound) {
			logger.Info(
				"app Deployment not found for pending Maskinporten rotation",
				"maskinportenClient", instance.Name,
				"namespace", instance.Namespace,
				"release", releaseName,
				"fingerprint", fingerprint,
			)
		}
		return err
	}
	deploymentName := deployment.Name

	restartedAt := now.UTC().Format(time.RFC3339)
	if deployment.Spec.Template.Annotations[maskinporten.AnnotationSecretVersion] == fingerprint {
		if existing := deployment.Spec.Template.Annotations[maskinporten.AnnotationSecretRotationRestartedAt]; existing != "" {
			restartedAt = existing
		}
		logger.Info(
			"app Deployment already has Maskinporten rotation annotation, marking rotation rollout complete",
			"maskinportenClient", instance.Name,
			"namespace", instance.Namespace,
			"deployment", deploymentName,
			"fingerprint", fingerprint,
		)
		return r.markRotationRestarted(ctx, instance, fingerprint, restartedAt)
	}

	before := deployment.DeepCopy()
	if deployment.Spec.Template.Annotations == nil {
		deployment.Spec.Template.Annotations = map[string]string{}
	}
	deployment.Spec.Template.Annotations[maskinporten.AnnotationSecretVersion] = fingerprint
	deployment.Spec.Template.Annotations[maskinporten.AnnotationSecretRotationRestartedAt] = restartedAt

	if err := r.Patch(ctx, deployment, client.MergeFrom(before)); err != nil {
		return fmt.Errorf("patch app Deployment pod template annotations: %w", err)
	}

	logger.Info(
		"triggered app Deployment rollout for Maskinporten secret rotation compatibility",
		"maskinportenClient", instance.Name,
		"namespace", instance.Namespace,
		"deployment", deploymentName,
		"fingerprint", fingerprint,
	)

	return r.markRotationRestarted(ctx, instance, fingerprint, restartedAt)
}

func (r *MaskinportenClientReconciler) appDeploymentByReleaseLabel(
	ctx context.Context,
	namespace string,
	releaseName string,
) (*appsv1.Deployment, error) {
	deployments := &appsv1.DeploymentList{}
	if err := r.List(
		ctx,
		deployments,
		client.InNamespace(namespace),
		client.MatchingLabels{appReleaseLabelKey: releaseName},
	); err != nil {
		return nil, fmt.Errorf("list app Deployments for release %q: %w", releaseName, err)
	}
	if len(deployments.Items) == 0 {
		return nil, fmt.Errorf("%w for release %q", errAppDeploymentNotFound, releaseName)
	}
	if len(deployments.Items) > 1 {
		return nil, fmt.Errorf(
			"%w for release %q: %d",
			errUnexpectedAppDeploymentCount,
			releaseName,
			len(deployments.Items),
		)
	}
	return &deployments.Items[0], nil
}

func (r *MaskinportenClientReconciler) pendingRotationFingerprint(
	ctx context.Context,
	instance *resourcesv1alpha1.MaskinportenClient,
	secretAppLabel string,
) (string, error) {
	if fromStatus := pendingRotationFingerprintFromStatus(instance); fromStatus != "" {
		return fromStatus, nil
	}
	return r.pendingRotationFingerprintFromSecretRecovery(ctx, instance, secretAppLabel)
}

func pendingRotationFingerprintFromStatus(instance *resourcesv1alpha1.MaskinportenClient) string {
	if instance == nil {
		return ""
	}
	pending := instance.Status.PendingSecretRotationFingerprint
	if pending == "" || pending == instance.Status.LastSecretRotationRestartedFingerprint {
		return ""
	}
	return pending
}

// pendingRotationFingerprintFromSecretRecovery is a crash-recovery fallback for the narrow case where
// the app Secret was updated with rotated credentials but the MaskinportenClient status update did not persist.
// MaskinportenClient status remains the primary source of truth for pending rollout state.
func (r *MaskinportenClientReconciler) pendingRotationFingerprintFromSecretRecovery(
	ctx context.Context,
	instance *resourcesv1alpha1.MaskinportenClient,
	secretAppLabel string,
) (string, error) {
	secrets := &corev1.SecretList{}
	if err := r.List(
		ctx,
		secrets,
		client.InNamespace(instance.Namespace),
		client.MatchingLabels{"app": secretAppLabel},
	); err != nil {
		return "", fmt.Errorf("list app secrets for Maskinporten rotation recovery: %w", err)
	}
	if len(secrets.Items) == 0 {
		return "", nil
	}
	if len(secrets.Items) > 1 {
		return "", fmt.Errorf("%w for app label %q", errUnexpectedSecretCount, secretAppLabel)
	}

	fingerprint := secrets.Items[0].Annotations[maskinporten.AnnotationSecretVersion]
	if fingerprint == "" || fingerprint == instance.Status.LastSecretRotationRestartedFingerprint {
		return "", nil
	}
	return fingerprint, nil
}

func appReleaseNameForMaskinportenClient(
	instance *resourcesv1alpha1.MaskinportenClient,
	serviceOwnerID string,
) (string, bool, error) {
	parsed, err := resourcename.ParseMaskinportenClientName(instance.Name)
	if err != nil {
		return "", false, fmt.Errorf("parse MaskinportenClient name %q: %w", instance.Name, err)
	}
	if serviceOwnerID != "" && parsed.ServiceOwnerId != serviceOwnerID {
		return "", false, nil
	}
	return fmt.Sprintf("%s-%s", parsed.ServiceOwnerId, parsed.AppId), true, nil
}

func (r *MaskinportenClientReconciler) serviceOwnerID() string {
	if r == nil || r.runtime == nil || r.runtime.GetOperatorContext() == nil {
		return ""
	}
	return r.runtime.GetOperatorContext().ServiceOwner.Id
}

func (r *MaskinportenClientReconciler) markRotationRestarted(
	ctx context.Context,
	instance *resourcesv1alpha1.MaskinportenClient,
	fingerprint string,
	restartedAt string,
) error {
	timestamp, err := time.Parse(time.RFC3339, restartedAt)
	if err != nil {
		return fmt.Errorf("parse rotation rollout timestamp: %w", err)
	}

	current := &resourcesv1alpha1.MaskinportenClient{}
	key := client.ObjectKeyFromObject(instance)
	if err := r.Get(ctx, key, current); err != nil {
		return fmt.Errorf("refresh MaskinportenClient before status patch: %w", err)
	}

	for attempt := range maxSecretUpdateRetries {
		before := current.DeepCopy()
		statusTime := metav1.NewTime(timestamp.UTC())
		current.Status.LastSecretRotationRestartedFingerprint = fingerprint
		current.Status.LastSecretRotationRestartedAt = &statusTime
		if current.Status.PendingSecretRotationFingerprint == fingerprint {
			current.Status.PendingSecretRotationFingerprint = ""
			current.Status.PendingSecretRotationDetectedAt = nil
		}
		apimeta.SetStatusCondition(&current.Status.Conditions, metav1.Condition{
			Type:               maskinporten.ConditionTypeRotationRestart,
			Status:             metav1.ConditionFalse,
			ObservedGeneration: current.GetGeneration(),
			Reason:             "CompatibilityRolloutTriggered",
			Message:            "App Deployment rollout was triggered for Maskinporten secret rotation compatibility",
		})

		err := r.Status().Patch(ctx, current, client.MergeFrom(before))
		if err == nil {
			return nil
		}
		if !apierrors.IsConflict(err) {
			return fmt.Errorf("patch MaskinportenClient rotation restart status: %w", err)
		}
		if err := r.Get(ctx, key, current); err != nil {
			return fmt.Errorf("refresh MaskinportenClient status after conflict: %w", err)
		}
		log.FromContext(ctx).Info(
			"conflict patching MaskinportenClient rotation restart status, retrying",
			"attempt", attempt+1,
			"maskinportenClient", instance.Name,
			"namespace", instance.Namespace,
		)
	}

	return fmt.Errorf("patch MaskinportenClient rotation restart status: %w", errSecretUpdateRetryExhausted)
}
