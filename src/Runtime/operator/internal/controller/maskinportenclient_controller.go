package controller

import (
	"context"
	"fmt"
	"math/rand/v2"
	"reflect"
	"time"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
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
const FinalizerName = "client.altinn.operator/finalizer"

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
	// * Returning errors requeues the request
	// * Returning TerminalError makes the request not retried (still logged as error)
	// * Returning empty result means no requeue
	// * Returning result with RequeueAfter set will requeue after the specified duration
	// * Returning result with Requeue set will requeue immediately

	configValue := r.runtime.GetConfigMonitor().Get()

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
		if req.Kind == RequestDeleteKind {
			// If we are deleting and no actions were needed, we can still remove the finalizer
			err = r.updateStatus(ctx, req, instance, "deleted", "No actions needed during deletion", executedCommands)
			if err != nil {
				span.SetStatus(codes.Error, "updateStatus failed")
				span.RecordError(err)
				log.Error(err, "Failed to update MaskinportenClient status during deletion")
				return ctrl.Result{}, err
			}
			log.Info("Deleted MaskinportenClient, finalizer removed")
		} else {
			// Still update status to acknowledge the new generation even if no actions were needed
			err = r.updateStatus(ctx, req, instance, "reconciled", "No actions needed", executedCommands)
			if err != nil {
				span.SetStatus(codes.Error, "updateStatus failed")
				span.RecordError(err)
				log.Error(err, "Failed to update MaskinportenClient status")
				return ctrl.Result{}, err
			}
		}
		return ctrl.Result{}, nil
	}

	reason := fmt.Sprintf("Reconciled %d resources", len(executedCommands))
	err = r.updateStatus(ctx, req, instance, "reconciled", reason, executedCommands)
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

func (r *MaskinportenClientReconciler) updateStatus(
	ctx context.Context,
	req *maskinportenClientRequest,
	instance *resourcesv1alpha1.MaskinportenClient,
	state string,
	reason string,
	commands maskinporten.CommandList,
) error {
	ctx, span := r.runtime.Tracer().Start(ctx, "Reconcile.updateStatus")
	defer span.End()

	log := log.FromContext(ctx)

	instance.Status.State = state
	timestamp := metav1.Now()
	instance.Status.LastSynced = &timestamp
	instance.Status.Reason = reason
	if commands != nil {
		instance.Status.LastActions = commands.Strings()
	} else {
		instance.Status.LastActions = nil
	}
	instance.Status.ObservedGeneration = instance.GetGeneration()

	for _, cmd := range commands {
		// log.Info("Executed command", "command", cmd.String())
		switch data := cmd.Data.(type) {
		case *maskinporten.CreateClientInApiCommand:
			instance.Status.ClientId = data.Api.ClientId
		case *maskinporten.UpdateClientInApiCommand:
			instance.Status.ClientId = data.Api.ClientId
		case *maskinporten.DeleteClientInApiCommand:
			instance.Status.ClientId = ""
		case *maskinporten.UpdateSecretContentCommand:
			instance.Status.Authority = data.SecretContent.Authority
			instance.Status.KeyIds = make([]string, len(data.SecretContent.Jwks.Keys))
			for i, key := range data.SecretContent.Jwks.Keys {
				instance.Status.KeyIds[i] = key.KeyID()
			}
		case *maskinporten.DeleteSecretContentCommand:
			instance.Status.Authority = ""
			instance.Status.KeyIds = nil
		}
	}

	updatedFinalizers := false
	if req != nil {
		if req.Kind == RequestCreateKind {
			updatedFinalizers = controllerutil.AddFinalizer(instance, FinalizerName)
		} else if req.Kind == RequestDeleteKind {
			updatedFinalizers = controllerutil.RemoveFinalizer(instance, FinalizerName)
		}
	}

	var err error
	if updatedFinalizers {
		err = r.Update(ctx, instance)
	} else {
		err = r.Status().Update(ctx, instance)
	}

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
	commands maskinporten.CommandList,
) {
	origSpan := trace.SpanFromContext(ctx)
	log := log.FromContext(ctx)
	log.Error(origError, "Reconciliation of MaskinportenClient failed", "failure", msg)

	origSpan.SetStatus(codes.Error, msg)
	origSpan.RecordError(origError)

	_ = r.updateStatus(ctx, nil, instance, "error", msg, commands)
}

func (r *MaskinportenClientReconciler) loadInstance(
	ctx context.Context,
	req *maskinportenClientRequest,
) error {
	ctx, span := r.runtime.Tracer().Start(ctx, "Reconcile.getInstance")
	defer span.End()

	instance := &resourcesv1alpha1.MaskinportenClient{}
	if err := r.Get(ctx, req.NamespacedName, instance); err != nil {
		return fmt.Errorf("failed to get MaskinportenClient: %w", err)
	}

	req.Instance = instance

	if instance.ObjectMeta.DeletionTimestamp.IsZero() {
		if !controllerutil.ContainsFinalizer(instance, FinalizerName) {
			req.Kind = RequestCreateKind
			if err := r.updateStatus(ctx, req, instance, "recorded", "", nil); err != nil {
				return err
			}
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

	apiClient := r.runtime.GetMaskinportenApiClient()

	var secrets corev1.SecretList
	err := r.List(ctx, &secrets, client.InNamespace(req.Namespace), client.MatchingLabels{"app": req.AppLabel})
	if err != nil {
		return nil, err
	}
	if len(secrets.Items) > 1 {
		return nil, fmt.Errorf("unexpected number of secrets found: %d", len(secrets.Items))
	}

	var secret *corev1.Secret
	if len(secrets.Items) == 1 {
		secret = &secrets.Items[0]
		if secret.Type != corev1.SecretTypeOpaque {
			return nil, fmt.Errorf("unexpected secret type: %s (expected Opaque)", secret.Type)
		}
	}

	var client *maskinporten.ClientResponse
	var jwks *crypto.Jwks
	var secretStateContent *maskinporten.SecretStateContent

	if secret != nil {
		secretStateContent, err = maskinporten.DeserializeSecretStateContent(secret)
		if err != nil {
			return nil, err
		}
	}

	if secretStateContent != nil {
		if secretStateContent.ClientId != "" {
			client, jwks, err = apiClient.GetClient(ctx, secretStateContent.ClientId)
			if err != nil {
				return nil, err
			}
		}
	} else {
		// If the secret state isn't updated, we still try to find a matching client in the API
		// In a previous iteration, we may have succeeded in creating the client in the API,
		// but failed to update the secret state content.

		allClients, err := apiClient.GetAllClients(ctx)
		if err != nil {
			return nil, err
		}

		clientName := maskinporten.GetClientName(r.runtime.GetOperatorContext(), req.AppId)
		for _, c := range allClients {
			if c.ClientName != nil && *c.ClientName == clientName {
				client, jwks, err = apiClient.GetClient(ctx, c.ClientId)
				if err != nil {
					return nil, err
				}
				break
			}
		}
	}

	clientState, err := maskinporten.NewClientState(req.Instance, client, jwks, secret, secretStateContent)
	if err != nil {
		return nil, err
	}

	return clientState, nil
}

func (r *MaskinportenClientReconciler) reconcile(
	ctx context.Context,
	configValue *config.Config,
	currentState *maskinporten.ClientState,
) (maskinporten.CommandList, error) {
	ctx, span := r.runtime.Tracer().Start(ctx, "Reconcile.reconcile")
	defer span.End()

	context := r.runtime.GetOperatorContext()
	crypto := r.runtime.GetCrypto()
	clock := r.runtime.GetClock()
	commands, err := currentState.Reconcile(context, configValue, crypto, clock)
	if err != nil {
		return nil, err
	}

	executedCommands := make(maskinporten.CommandList, 0, len(commands))

	apiClient := r.runtime.GetMaskinportenApiClient()

	for i := 0; i < len(commands); i++ {
		cmd := &commands[i]

		switch data := cmd.Data.(type) {
		case *maskinporten.CreateClientInApiCommand:
			resp, err := apiClient.CreateClient(ctx, data.Api.Req, data.Api.Jwks)
			if err != nil {
				return executedCommands, err
			}
			err = cmd.Callback(&maskinporten.CreateClientInApiCommandResponse{Resp: resp})
			if err != nil {
				return executedCommands, err
			}
		case *maskinporten.UpdateClientInApiCommand:
			if data.Api.Req != nil {
				updateReq := maskinporten.ConvertAddRequestToUpdateRequest(data.Api.Req)
				_, err := apiClient.UpdateClient(ctx, data.Api.ClientId, updateReq)
				if err != nil {
					return executedCommands, err
				}
			}
			if data.Api.Jwks != nil {
				// TODO: verify assumed behavior of JWKS endpoints
				err := apiClient.CreateClientJwks(ctx, data.Api.ClientId, data.Api.Jwks)
				if err != nil {
					return executedCommands, err
				}
			}
		case *maskinporten.UpdateSecretContentCommand:
			assert.That(
				data.SecretContent.ClientId != "",
				"UpdateSecretContentCommand should always have client ID",
			)
			updatedSecret := currentState.Secret.Manifest.DeepCopy()
			err := data.SecretContent.SerializeTo(updatedSecret)
			if err != nil {
				return executedCommands, err
			}

			if err := r.Update(ctx, updatedSecret); err != nil {
				return executedCommands, err
			}
		case *maskinporten.DeleteClientInApiCommand:
			err := apiClient.DeleteClient(ctx, data.ClientId)
			if err != nil {
				return executedCommands, err
			}
		case *maskinporten.DeleteSecretContentCommand:
			updatedSecret := currentState.Secret.Manifest.DeepCopy()
			maskinporten.DeleteSecretStateContent(updatedSecret)

			// TODO: ownerreference?
			if err := r.Update(ctx, updatedSecret); err != nil {
				return executedCommands, err
			}
		default:
			assert.That(false, "unhandled command", "type", reflect.TypeOf(cmd.Data).Name())
		}

		executedCommands = append(executedCommands, *cmd)
	}

	return executedCommands, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *MaskinportenClientReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&resourcesv1alpha1.MaskinportenClient{}).
		// Only reconcile on generation change (which does not change when status or metadata change)
		WithEventFilter(predicate.GenerationChangedPredicate{}).
		Complete(r)
}
