package controller

import (
	"context"
	"errors"
	"fmt"
	"math/rand/v2"
	"reflect"
	"time"

	goruntime "runtime"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	corev1 "k8s.io/api/core/v1"
	apimeta "k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	resourcesv1alpha1 "altinn.studio/operator/api/v1alpha1"
	"altinn.studio/operator/internal/assert"
	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/crypto"
	"altinn.studio/operator/internal/maskinporten"
	rt "altinn.studio/operator/internal/runtime"
)

const JsonFileName = "maskinporten-settings.json"

// MaskinportenClientReconciler reconciles a MaskinportenClient object
type MaskinportenClientReconciler struct {
	client.Client
	Scheme  *runtime.Scheme
	runtime rt.Runtime
	random  *rand.Rand
}

func NewMaskinportenClientReconciler(
	rt rt.Runtime,
	client client.Client,
	scheme *runtime.Scheme,
	random *rand.Rand,
) *MaskinportenClientReconciler {
	if random == nil {
		random = rand.New(rand.NewPCG(rand.Uint64(), rand.Uint64()))
	}
	return &MaskinportenClientReconciler{
		Client:  client,
		Scheme:  scheme,
		runtime: rt,
		random:  random,
	}
}

// +kubebuilder:rbac:groups=resources.altinn.studio,resources=maskinportenclients,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=resources.altinn.studio,resources=maskinportenclients/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=resources.altinn.studio,resources=maskinportenclients/finalizers,verbs=update
// +kubebuilder:rbac:groups="",resources=secrets,verbs=get;list;watch;update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.17.0/pkg/reconcile
func (r *MaskinportenClientReconciler) Reconcile(ctx context.Context, kreq ctrl.Request) (ctrl.Result, error) {
	ctx, span := r.runtime.Tracer().Start(
		ctx,
		"Reconcile",
		trace.WithAttributes(attribute.String("namespace", kreq.Namespace), attribute.String("name", kreq.Name)),
	)
	defer span.End()

	log := log.FromContext(ctx)

	log.Info("Reconciling MaskinportenClient")

	// Mechanics of `Reconcile`:
	// * Returning errors requeues the request (exponential backoff)
	// * Returning TerminalError makes the request not retried (still logged as error)
	// * Returning empty result means no requeue
	// * Returning result with RequeueAfter set will requeue after the specified duration
	// * Returning result with Requeue set will requeue immediately

	configValue := r.runtime.GetConfigMonitor().Get()
	assert.That(configValue != nil, "ConfigMonitor.Get() returned nil")

	req, err := r.mapRequest(ctx, kreq)
	if err != nil {
		span.SetStatus(codes.Error, "mapRequest failed")
		span.RecordError(err)
		return ctrl.Result{}, err
	}

	span.SetAttributes(attribute.String("app_id", req.AppId))

	err = r.loadInstance(ctx, req)
	if err != nil {
		notFoundIgnored := client.IgnoreNotFound(err)
		if notFoundIgnored != nil {
			span.SetStatus(codes.Error, "getInstance failed")
			span.RecordError(err)
			log.Error(err, "Reconciling MaskinportenClient errored")
		} else {
			log.Info("Reconciling MaskinportenClient skipped, was deleted (so we have removed finalizer)..")
			// TODO: we end up here with NotFound after having cleaned up and removed finalizer.. why?
		}
		return ctrl.Result{}, notFoundIgnored
	}
	instance := req.Instance
	log.Info("Loaded info", "request_kind", req.Kind.String(), "generation", instance.GetGeneration())
	span.SetAttributes(
		attribute.String("request_kind", req.Kind.String()),
		attribute.Int64("generation", instance.GetGeneration()),
	)

	currentState, err := r.fetchCurrentState(ctx, req)
	if err != nil {
		// Check if this is a missing secret error (expected/recoverable condition)
		if _, ok := err.(*maskinporten.MissingSecretError); ok {
			log.Info("App secret not found yet, will retry later", "app", req.AppId)
			// Requeue with a delay without logging as error
			return ctrl.Result{RequeueAfter: r.getRequeueAfter(configValue)}, nil
		}
		r.updateStatusWithError(ctx, err, "fetchCurrentState failed", instance, nil)
		return ctrl.Result{}, err
	}

	executedCommands, err := r.reconcile(ctx, configValue, currentState)
	if err != nil {
		r.updateStatusWithError(ctx, err, "reconcile failed", instance, executedCommands)
		return ctrl.Result{}, err
	}

	if len(executedCommands) == 0 {
		log.Info("No actions taken")
		span.SetStatus(codes.Ok, "reconciled successfully")
		reason := "NoActionsNeeded"
		message := "No actions needed"
		if req.Kind == RequestDeleteKind {
			message = "No actions needed during deletion"
		}
		err = r.updateStatus(ctx, instance, reason, message, executedCommands)
		if err != nil {
			span.SetStatus(codes.Error, "updateStatus failed")
			span.RecordError(err)
			log.Error(err, "Failed to update MaskinportenClient status")
			return ctrl.Result{}, err
		}
		return ctrl.Result{}, nil
	}

	// After RemoveFinalizer, the object is deleted and we can't update status
	if executedCommands.FinalizerRemoved() {
		log.Info("Object deleted, skipping status update")
		span.SetStatus(codes.Ok, "object deleted")
		return ctrl.Result{}, nil
	}

	reason := "Reconciled"
	message := fmt.Sprintf("Reconciled %d resources", len(executedCommands))
	err = r.updateStatus(ctx, instance, reason, message, executedCommands)
	if err != nil {
		span.SetStatus(codes.Error, "updateStatus failed")
		span.RecordError(err)
		log.Error(err, "Failed to update MaskinportenClient status")
		return ctrl.Result{}, err
	}

	log.Info("Reconciled MaskinportenClient")

	span.SetStatus(codes.Ok, "reconciled successfully")
	return ctrl.Result{RequeueAfter: r.getRequeueAfter(configValue)}, nil
}

func (r *MaskinportenClientReconciler) getRequeueAfter(configValue *config.Config) time.Duration {
	return r.randomizeDuration(configValue.Controller.RequeueAfter, 10.0)
}

func (r *MaskinportenClientReconciler) randomizeDuration(d time.Duration, perc float64) time.Duration {
	max := int64(float64(d) * (perc / 100.0))
	min := -max
	return d + time.Duration(r.random.Int64N(max-min)+min)
}

const maxActionHistorySize = 10

func (r *MaskinportenClientReconciler) updateStatus(
	ctx context.Context,
	instance *resourcesv1alpha1.MaskinportenClient,
	readyReason string,
	readyMessage string,
	results maskinporten.CommandResultList,
) error {
	ctx, span := r.runtime.Tracer().Start(ctx, "Reconcile.updateStatus")
	defer span.End()

	log := log.FromContext(ctx)

	timestamp := metav1.Now()
	instance.Status.LastSynced = &timestamp
	instance.Status.ObservedGeneration = instance.GetGeneration()

	// Map CommandResultList to ActionHistory
	if len(results) > 0 {
		var traceId string
		if sc := trace.SpanFromContext(ctx).SpanContext(); sc.HasTraceID() {
			traceId = sc.TraceID().String()
		}
		newRecords := mapCommandResultsToActionRecords(results, traceId)
		instance.Status.ActionHistory = append(instance.Status.ActionHistory, newRecords...)
		if len(instance.Status.ActionHistory) > maxActionHistorySize {
			instance.Status.ActionHistory = instance.Status.ActionHistory[len(instance.Status.ActionHistory)-maxActionHistorySize:]
		}
	}

	isDeleting := instance.DeletionTimestamp != nil

	for _, cmdResult := range results {
		switch result := cmdResult.Result.(type) {
		case *maskinporten.CreateClientInApiCommandResult:
			if result.Err == nil {
				instance.Status.ClientId = result.ClientId
				apimeta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
					Type:               maskinporten.ConditionTypeClientRegistered,
					Status:             metav1.ConditionTrue,
					ObservedGeneration: instance.GetGeneration(),
					Reason:             "Created",
					Message:            fmt.Sprintf("Client created with ID %s", result.ClientId),
				})
			}
		case *maskinporten.UpdateClientInApiCommandResult:
			if result.Err == nil {
				instance.Status.ClientId = result.ClientId
				apimeta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
					Type:               maskinporten.ConditionTypeClientRegistered,
					Status:             metav1.ConditionTrue,
					ObservedGeneration: instance.GetGeneration(),
					Reason:             "Updated",
					Message:            fmt.Sprintf("Client updated: %s", result.ClientId),
				})
			}
		case *maskinporten.DeleteClientInApiCommandResult:
			if result.Err == nil {
				instance.Status.ClientId = ""
				apimeta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
					Type:               maskinporten.ConditionTypeClientRegistered,
					Status:             metav1.ConditionFalse,
					ObservedGeneration: instance.GetGeneration(),
					Reason:             "Deleted",
					Message:            "Client deleted from Maskinporten API",
				})
			}
		case *maskinporten.UpdateSecretContentCommandResult:
			if result.Err == nil {
				instance.Status.Authority = result.Authority
				instance.Status.KeyIds = result.KeyIds
				apimeta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
					Type:               maskinporten.ConditionTypeSecretSynced,
					Status:             metav1.ConditionTrue,
					ObservedGeneration: instance.GetGeneration(),
					Reason:             "Updated",
					Message:            fmt.Sprintf("Secret updated with %d keys", len(result.KeyIds)),
				})
			}
		case *maskinporten.DeleteSecretContentCommandResult:
			if result.Err == nil {
				instance.Status.Authority = ""
				instance.Status.KeyIds = nil
				apimeta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
					Type:               maskinporten.ConditionTypeSecretSynced,
					Status:             metav1.ConditionFalse,
					ObservedGeneration: instance.GetGeneration(),
					Reason:             "Deleted",
					Message:            "Secret content removed",
				})
			}
		}
	}

	if isDeleting {
		apimeta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
			Type:               maskinporten.ConditionTypeDeleting,
			Status:             metav1.ConditionTrue,
			ObservedGeneration: instance.GetGeneration(),
			Reason:             readyReason,
			Message:            readyMessage,
		})
	}

	apimeta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
		Type:               maskinporten.ConditionTypeReady,
		Status:             metav1.ConditionTrue,
		ObservedGeneration: instance.GetGeneration(),
		Reason:             readyReason,
		Message:            readyMessage,
	})

	err := r.Status().Update(ctx, instance)

	if err != nil {
		span.SetStatus(codes.Error, "failed to update status")
		span.RecordError(err)
		log.Error(err, "Failed to update MaskinportenClient status")
	}

	return err
}

func (r *MaskinportenClientReconciler) updateStatusWithError(
	ctx context.Context,
	origError error,
	msg string,
	instance *resourcesv1alpha1.MaskinportenClient,
	results maskinporten.CommandResultList,
) {
	origSpan := trace.SpanFromContext(ctx)
	log := log.FromContext(ctx)
	log.Error(origError, "Reconciliation of MaskinportenClient failed", "failure", msg)

	origSpan.SetStatus(codes.Error, msg)
	origSpan.RecordError(origError)

	timestamp := metav1.Now()
	instance.Status.LastSynced = &timestamp
	instance.Status.ObservedGeneration = instance.GetGeneration()

	// Map CommandResultList to ActionHistory (includes failed commands)
	if len(results) > 0 {
		var traceId string
		if sc := origSpan.SpanContext(); sc.HasTraceID() {
			traceId = sc.TraceID().String()
		}
		newRecords := mapCommandResultsToActionRecords(results, traceId)
		instance.Status.ActionHistory = append(instance.Status.ActionHistory, newRecords...)
		if len(instance.Status.ActionHistory) > maxActionHistorySize {
			instance.Status.ActionHistory = instance.Status.ActionHistory[len(instance.Status.ActionHistory)-maxActionHistorySize:]
		}
	}

	apimeta.SetStatusCondition(&instance.Status.Conditions, metav1.Condition{
		Type:               maskinporten.ConditionTypeReady,
		Status:             metav1.ConditionFalse,
		ObservedGeneration: instance.GetGeneration(),
		Reason:             "Error",
		Message:            fmt.Sprintf("%s: %v", msg, origError),
	})

	if err := r.Status().Update(ctx, instance); err != nil {
		log.Error(err, "Failed to update MaskinportenClient error status")
	}
}

func mapCommandResultsToActionRecords(results maskinporten.CommandResultList, traceId string) []resourcesv1alpha1.ActionRecord {
	records := make([]resourcesv1alpha1.ActionRecord, len(results))
	for i, cmdResult := range results {
		record := resourcesv1alpha1.ActionRecord{
			Command:   reflect.ValueOf(cmdResult.Command).Elem().Type().Name(),
			Timestamp: metav1.NewTime(cmdResult.Timestamp),
			TraceId:   traceId,
		}

		switch result := cmdResult.Result.(type) {
		case *maskinporten.CreateClientInApiCommandResult:
			if result.Err == maskinporten.ErrSkipped {
				record.Result = "skipped"
			} else if result.Err != nil {
				record.Result = "failed"
				record.Details = result.Err.Error()
			} else {
				record.Result = "created"
				record.Details = fmt.Sprintf("clientId: %s, scopes: %d", result.ClientId, result.Scopes)
			}
		case *maskinporten.UpdateClientInApiCommandResult:
			if result.Err == maskinporten.ErrSkipped {
				record.Result = "skipped"
			} else if result.Err != nil {
				record.Result = "failed"
				record.Details = result.Err.Error()
			} else {
				record.Result = "updated"
				record.Details = fmt.Sprintf("scopes: %d, jwks: %t", result.Scopes, result.HasJwks)
			}
		case *maskinporten.UpdateSecretContentCommandResult:
			if result.Err == maskinporten.ErrSkipped {
				record.Result = "skipped"
			} else if result.Err != nil {
				record.Result = "failed"
				record.Details = result.Err.Error()
			} else {
				record.Result = "synced"
				record.Details = fmt.Sprintf("keys: %d", len(result.KeyIds))
			}
		case *maskinporten.DeleteClientInApiCommandResult:
			if result.Err == maskinporten.ErrSkipped {
				record.Result = "skipped"
			} else if result.Err != nil {
				record.Result = "failed"
				record.Details = result.Err.Error()
			} else {
				record.Result = "deleted"
				record.Details = fmt.Sprintf("clientId: %s", result.ClientId)
			}
		case *maskinporten.DeleteSecretContentCommandResult:
			if result.Err == maskinporten.ErrSkipped {
				record.Result = "skipped"
			} else if result.Err != nil {
				record.Result = "failed"
				record.Details = result.Err.Error()
			} else {
				record.Result = "cleared"
			}
		case *maskinporten.RemoveRotateAnnotationCommandResult:
			if result.Err == maskinporten.ErrSkipped {
				record.Result = "skipped"
			} else if result.Err != nil {
				record.Result = "failed"
				record.Details = result.Err.Error()
			} else {
				record.Result = "removed"
			}
		case *maskinporten.AddFinalizerCommandResult:
			if result.Err == maskinporten.ErrSkipped {
				record.Result = "skipped"
			} else if result.Err != nil {
				record.Result = "failed"
				record.Details = result.Err.Error()
			} else {
				record.Result = "added"
			}
		case *maskinporten.RemoveFinalizerCommandResult:
			if result.Err == maskinporten.ErrSkipped {
				record.Result = "skipped"
			} else if result.Err != nil {
				record.Result = "failed"
				record.Details = result.Err.Error()
			} else {
				record.Result = "removed"
			}
		}

		records[i] = record
	}
	return records
}

func (r *MaskinportenClientReconciler) loadInstance(
	ctx context.Context,
	req *maskinportenClientRequest,
) error {
	ctx, span := r.runtime.Tracer().Start(ctx, "Reconcile.getInstance")
	defer span.End()

	instance := &resourcesv1alpha1.MaskinportenClient{}
	if err := r.Get(ctx, req.NamespacedName, instance); err != nil {
		return fmt.Errorf("loadInstance: failed to get MaskinportenClient: %w", err)
	}

	req.Instance = instance

	if instance.ObjectMeta.DeletionTimestamp.IsZero() {
		if !controllerutil.ContainsFinalizer(instance, maskinporten.FinalizerName) {
			req.Kind = RequestCreateKind
		} else {
			req.Kind = RequestUpdateKind
		}
	} else {
		req.Kind = RequestDeleteKind
	}

	return nil
}

func (r *MaskinportenClientReconciler) fetchCurrentState(
	ctx context.Context,
	req *maskinportenClientRequest,
) (*maskinporten.ClientState, error) {
	ctx, span := r.runtime.Tracer().Start(ctx, "Reconcile.fetchCurrentState")
	defer span.End()

	logger := log.FromContext(ctx)

	apiClient := r.runtime.GetMaskinportenApiClient()

	var secrets corev1.SecretList
	err := r.List(ctx, &secrets, client.InNamespace(req.Namespace), client.MatchingLabels{"app": req.AppLabel})
	if err != nil {
		return nil, fmt.Errorf("fetchCurrentState: failed to list secrets: %w", err)
	}
	if len(secrets.Items) > 1 {
		return nil, fmt.Errorf("fetchCurrentState: unexpected number of secrets found: %d", len(secrets.Items))
	}

	var secret *corev1.Secret
	if len(secrets.Items) == 1 {
		secret = &secrets.Items[0]
		if secret.Type != corev1.SecretTypeOpaque {
			return nil, fmt.Errorf("fetchCurrentState: unexpected secret type: %s (expected Opaque)", secret.Type)
		}
	}

	var client *maskinporten.ClientResponse
	var jwks *crypto.Jwks
	var secretStateContent *maskinporten.SecretStateContent

	if secret != nil {
		secretStateContent, err = maskinporten.DeserializeSecretStateContent(secret)
		if err != nil {
			return nil, fmt.Errorf("fetchCurrentState: error getting secret state: %w", err)
		}
	}

	if secretStateContent != nil {
		if secretStateContent.ClientId != "" {
			client, jwks, err = apiClient.GetClient(ctx, secretStateContent.ClientId)
			if err != nil {
				if req.Kind == RequestDeleteKind && errors.Is(err, maskinporten.ErrClientNotFound) {
					// During deletion, if the client is already gone, we can ignore this error
					// But we log a warning so that we have a record of it
					logger.Info("Client not found in Maskinporten API during deletion, continuing...", "clientId", secretStateContent.ClientId)
				} else {
					return nil, fmt.Errorf("fetchCurrentState: error getting client: %w", err)
				}
			}
		}
	} else {
		// If the secret state isn't updated, we still try to find a matching client in the API
		// In a previous iteration, we may have succeeded in creating the client in the API,
		// but failed to update the secret state content.

		allClients, err := apiClient.GetAllClients(ctx)
		if err != nil {
			return nil, fmt.Errorf("fetchCurrentState: error getting all clients: %w", err)
		}

		clientName := maskinporten.GetClientName(r.runtime.GetOperatorContext(), req.AppId)
		for _, c := range allClients {
			if c.ClientName != nil && *c.ClientName == clientName {
				logger.Info("Found preexisting matching client in Maskinporten API", "clientId", c.ClientId)
				client, jwks, err = apiClient.GetClient(ctx, c.ClientId)
				if err != nil {
					return nil, fmt.Errorf("fetchCurrentState: error getting client: %w", err)
				}
				break
			}
		}
	}

	clientState, err := maskinporten.NewClientState(req.Instance, client, jwks, secret, secretStateContent)
	if err != nil {
		return nil, fmt.Errorf("fetchCurrentState: error creating client state domain model: %w", err)
	}

	return clientState, nil
}

func (r *MaskinportenClientReconciler) reconcile(
	ctx context.Context,
	configValue *config.Config,
	currentState *maskinporten.ClientState,
) (maskinporten.CommandResultList, error) {
	ctx, span := r.runtime.Tracer().Start(ctx, "Reconcile.reconcile")
	defer span.End()

	operatorCtx := r.runtime.GetOperatorContext()
	crypto := r.runtime.GetCrypto()
	clock := r.runtime.GetClock()
	commands, err := currentState.Reconcile(operatorCtx, configValue, crypto, clock)
	if err != nil {
		return nil, fmt.Errorf("reconcile: error generating reconciliation commands: %w", err)
	}

	builders := make([]*maskinporten.CommandResultBuilder, len(commands))
	apiClient := r.runtime.GetMaskinportenApiClient()

	var firstErr error
	for i := 0; i < len(commands); i++ {
		cmd := &commands[i]
		assert.That(cmd.Data != nil, "Command.Data must be non-nil")

		builders[i] = maskinporten.NewCommandResultBuilder(cmd.Data, clock.Now())

		// If a previous command failed, mark remaining as skipped
		if firstErr != nil {
			setSkippedResult(builders[i], cmd.Data)
			continue
		}

		switch data := cmd.Data.(type) {
		case *maskinporten.CreateClientInApiCommand:
			scopes := 0
			if data.Api.Req != nil {
				scopes = len(data.Api.Req.Scopes)
			}
			resp, err := apiClient.CreateClient(ctx, data.Api.Req, data.Api.Jwks)
			if err != nil {
				builders[i].WithCreateClientInApiResult(&maskinporten.CreateClientInApiCommandResult{Err: err})
				firstErr = err
				continue
			}
			if err = cmd.Callback(&maskinporten.CreateClientInApiCommandResponse{Resp: resp}); err != nil {
				builders[i].WithCreateClientInApiResult(&maskinporten.CreateClientInApiCommandResult{Err: err})
				firstErr = err
				continue
			}
			builders[i].WithCreateClientInApiResult(&maskinporten.CreateClientInApiCommandResult{
				ClientId: data.Api.ClientId,
				Scopes:   scopes,
			})

		case *maskinporten.UpdateClientInApiCommand:
			scopes := 0
			if data.Api.Req != nil {
				scopes = len(data.Api.Req.Scopes)
				updateReq := maskinporten.ConvertAddRequestToUpdateRequest(data.Api.Req)
				if _, err := apiClient.UpdateClient(ctx, data.Api.ClientId, updateReq); err != nil {
					builders[i].WithUpdateClientInApiResult(&maskinporten.UpdateClientInApiCommandResult{Err: err})
					firstErr = err
					continue
				}
			}
			if data.Api.Jwks != nil {
				// TODO: verify assumed behavior of JWKS endpoints
				if err := apiClient.CreateClientJwks(ctx, data.Api.ClientId, data.Api.Jwks); err != nil {
					builders[i].WithUpdateClientInApiResult(&maskinporten.UpdateClientInApiCommandResult{Err: err})
					firstErr = err
					continue
				}
			}
			builders[i].WithUpdateClientInApiResult(&maskinporten.UpdateClientInApiCommandResult{
				ClientId: data.Api.ClientId,
				Scopes:   scopes,
				HasJwks:  data.Api.Jwks != nil,
			})

		case *maskinporten.UpdateSecretContentCommand:
			assert.That(
				data.SecretContent.ClientId != "",
				"UpdateSecretContentCommand should always have client ID",
			)
			assert.That(
				currentState.Secret.Manifest != nil,
				"Secret.Manifest must exist for UpdateSecretContentCommand",
			)
			updatedSecret := currentState.Secret.Manifest.DeepCopy()
			if err := data.SecretContent.SerializeTo(updatedSecret); err != nil {
				builders[i].WithUpdateSecretContentResult(&maskinporten.UpdateSecretContentCommandResult{Err: err})
				firstErr = err
				continue
			}
			if err := r.Update(ctx, updatedSecret); err != nil {
				builders[i].WithUpdateSecretContentResult(&maskinporten.UpdateSecretContentCommandResult{Err: err})
				firstErr = err
				continue
			}
			var keyIds []string
			if data.SecretContent.Jwks != nil {
				keyIds = make([]string, len(data.SecretContent.Jwks.Keys))
				for j, key := range data.SecretContent.Jwks.Keys {
					keyIds[j] = key.KeyID()
				}
			}
			builders[i].WithUpdateSecretContentResult(&maskinporten.UpdateSecretContentCommandResult{
				Authority: data.SecretContent.Authority,
				KeyIds:    keyIds,
			})

		case *maskinporten.DeleteClientInApiCommand:
			if err := apiClient.DeleteClient(ctx, data.ClientId); err != nil {
				builders[i].WithDeleteClientInApiResult(&maskinporten.DeleteClientInApiCommandResult{
					ClientId: data.ClientId,
					Err:      err,
				})
				firstErr = err
				continue
			}
			builders[i].WithDeleteClientInApiResult(&maskinporten.DeleteClientInApiCommandResult{
				ClientId: data.ClientId,
			})

		case *maskinporten.DeleteSecretContentCommand:
			assert.That(
				currentState.Secret.Manifest != nil,
				"Secret.Manifest must exist for DeleteSecretContentCommand",
			)
			updatedSecret := currentState.Secret.Manifest.DeepCopy()
			maskinporten.DeleteSecretStateContent(updatedSecret)

			// TODO: ownerreference?
			if err := r.Update(ctx, updatedSecret); err != nil {
				builders[i].WithDeleteSecretContentResult(&maskinporten.DeleteSecretContentCommandResult{Err: err})
				firstErr = err
				continue
			}
			builders[i].WithDeleteSecretContentResult(&maskinporten.DeleteSecretContentCommandResult{})

		case *maskinporten.RemoveRotateAnnotationCommand:
			rvBefore := currentState.Crd.ResourceVersion
			delete(currentState.Crd.Annotations, maskinporten.AnnotationRotateJwk)
			if err := r.Update(ctx, currentState.Crd); err != nil {
				builders[i].WithRemoveRotateAnnotationResult(&maskinporten.RemoveRotateAnnotationCommandResult{Err: err})
				firstErr = err
				continue
			}
			assert.That(currentState.Crd.ResourceVersion != rvBefore, "Update must change ResourceVersion in-place")
			builders[i].WithRemoveRotateAnnotationResult(&maskinporten.RemoveRotateAnnotationCommandResult{})

		case *maskinporten.AddFinalizerCommand:
			rvBefore := currentState.Crd.ResourceVersion
			added := controllerutil.AddFinalizer(currentState.Crd, maskinporten.FinalizerName)
			assert.That(added, "finalizer should be added")
			if err := r.Update(ctx, currentState.Crd); err != nil {
				builders[i].WithAddFinalizerResult(&maskinporten.AddFinalizerCommandResult{Err: err})
				firstErr = err
				continue
			}
			assert.That(currentState.Crd.ResourceVersion != rvBefore, "Update must change ResourceVersion in-place")
			builders[i].WithAddFinalizerResult(&maskinporten.AddFinalizerCommandResult{})

		case *maskinporten.RemoveFinalizerCommand:
			removed := controllerutil.RemoveFinalizer(currentState.Crd, maskinporten.FinalizerName)
			assert.That(removed, "finalizer should be removed")
			if err := r.Update(ctx, currentState.Crd); err != nil {
				builders[i].WithRemoveFinalizerResult(&maskinporten.RemoveFinalizerCommandResult{Err: err})
				firstErr = err
				continue
			}
			// No ResourceVersion assert here - object may be deleted immediately after removing last finalizer
			builders[i].WithRemoveFinalizerResult(&maskinporten.RemoveFinalizerCommandResult{})

		default:
			assert.That(false, "unhandled command", "type", reflect.TypeOf(cmd.Data).Name())
		}
	}

	results := make(maskinporten.CommandResultList, len(builders))
	for i, b := range builders {
		results[i] = b.Build()
	}

	return results, firstErr
}

func setSkippedResult(b *maskinporten.CommandResultBuilder, data any) {
	switch data.(type) {
	case *maskinporten.CreateClientInApiCommand:
		b.WithCreateClientInApiResult(&maskinporten.CreateClientInApiCommandResult{Err: maskinporten.ErrSkipped})
	case *maskinporten.UpdateClientInApiCommand:
		b.WithUpdateClientInApiResult(&maskinporten.UpdateClientInApiCommandResult{Err: maskinporten.ErrSkipped})
	case *maskinporten.UpdateSecretContentCommand:
		b.WithUpdateSecretContentResult(&maskinporten.UpdateSecretContentCommandResult{Err: maskinporten.ErrSkipped})
	case *maskinporten.DeleteClientInApiCommand:
		b.WithDeleteClientInApiResult(&maskinporten.DeleteClientInApiCommandResult{Err: maskinporten.ErrSkipped})
	case *maskinporten.DeleteSecretContentCommand:
		b.WithDeleteSecretContentResult(&maskinporten.DeleteSecretContentCommandResult{Err: maskinporten.ErrSkipped})
	case *maskinporten.RemoveRotateAnnotationCommand:
		b.WithRemoveRotateAnnotationResult(&maskinporten.RemoveRotateAnnotationCommandResult{Err: maskinporten.ErrSkipped})
	case *maskinporten.AddFinalizerCommand:
		b.WithAddFinalizerResult(&maskinporten.AddFinalizerCommandResult{Err: maskinporten.ErrSkipped})
	case *maskinporten.RemoveFinalizerCommand:
		b.WithRemoveFinalizerResult(&maskinporten.RemoveFinalizerCommandResult{Err: maskinporten.ErrSkipped})
	default:
		assert.That(false, "unhandled command", "type", reflect.TypeOf(data).Name())
	}
}

// SetupWithManager sets up the controller with the Manager.
func (r *MaskinportenClientReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&resourcesv1alpha1.MaskinportenClient{}).
		WithEventFilter(predicate.Or(
			predicate.GenerationChangedPredicate{},
			rotateAnnotationPredicate{},
		)).
		WithOptions(controller.Options{MaxConcurrentReconciles: goruntime.NumCPU() * 4}).
		Complete(r)
}

// rotateAnnotationPredicate triggers reconciliation when the rotate-jwk annotation is added
type rotateAnnotationPredicate struct{}

func (rotateAnnotationPredicate) Create(_ event.CreateEvent) bool {
	return false // handled by GenerationChangedPredicate
}

func (rotateAnnotationPredicate) Delete(_ event.DeleteEvent) bool {
	return false // handled by GenerationChangedPredicate
}

func (rotateAnnotationPredicate) Update(e event.UpdateEvent) bool {
	if e.ObjectOld == nil || e.ObjectNew == nil {
		return false
	}
	oldAnnotation := e.ObjectOld.GetAnnotations()[maskinporten.AnnotationRotateJwk]
	newAnnotation := e.ObjectNew.GetAnnotations()[maskinporten.AnnotationRotateJwk]
	// Trigger when annotation is added with value "true"
	return oldAnnotation != "true" && newAnnotation == "true"
}

func (rotateAnnotationPredicate) Generic(_ event.GenericEvent) bool {
	return false
}
