package azurekeyvaultsync

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"altinn.studio/operator/internal/assert"
	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/operatorcontext"
	rt "altinn.studio/operator/internal/runtime"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azsecrets"
	"github.com/go-logr/logr"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

// KeyVaultSecretMapping defines which Azure Key Vault secrets map to a K8s secret.
// Each secret name in Secrets becomes a key in the output JSON file.
type KeyVaultSecretMapping struct {
	Name      string   // K8s secret name
	Namespace string   // K8s secret namespace
	FileName  string   // Key name in the K8s secret (e.g., "secrets.json")
	Secrets   []string // Azure Key Vault secret names → keys in JSON
}

func DefaultMappings() []KeyVaultSecretMapping {
	return []KeyVaultSecretMapping{
		{
			Name:      "maskinporten-client-for-designer-test",
			Namespace: "runtime-gateway",
			FileName:  "secrets.json",
			Secrets: []string{
				"Gateway--MaskinportenClientForDesigner--Test--ClientId",
				"Gateway--MaskinportenClientForDesigner--Test--Jwk",
			},
		},
	}
}

// +kubebuilder:rbac:groups="",resources=secrets,verbs=get;create;update

// AzureKeyVaultReconciler polls Azure Key Vault and syncs secrets to Kubernetes.
// Implements manager.Runnable.
type AzureKeyVaultReconciler struct {
	logger    logr.Logger
	k8sClient client.Client
	kvClient  KeyVaultSecretsClient
	runtime   rt.Runtime
	mappings  []KeyVaultSecretMapping
}

// NewReconciler creates a new KeyVaultSync controller.
// Returns nil if running in local environment (no Key Vault access).
func NewReconciler(
	ctx context.Context,
	runtime rt.Runtime,
	k8sClient client.Client,
) (*AzureKeyVaultReconciler, error) {
	environment := runtime.GetOperatorContext().Environment
	if environment == operatorcontext.EnvironmentLocal {
		return nil, nil
	}

	tracer := runtime.Tracer()
	_, span := tracer.Start(ctx, "keyvaultsync.NewReconciler")
	defer span.End()

	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		span.RecordError(err)
		return nil, fmt.Errorf("failed to get Azure credentials: %w", err)
	}

	azClient, err := azsecrets.NewClient(config.KeyVaultURL(environment), cred, nil)
	if err != nil {
		span.RecordError(err)
		return nil, fmt.Errorf("failed to create Key Vault client: %w", err)
	}

	return &AzureKeyVaultReconciler{
		logger:    log.FromContext(ctx).WithName("keyvaultsync"),
		k8sClient: k8sClient,
		kvClient:  newAzureKeyVaultSecretsClient(azClient),
		runtime:   runtime,
		mappings:  DefaultMappings(),
	}, nil
}

func NewReconcilerForTesting(
	runtime rt.Runtime,
	k8sClient client.Client,
	kvClient KeyVaultSecretsClient,
	mappings []KeyVaultSecretMapping,
) *AzureKeyVaultReconciler {
	return &AzureKeyVaultReconciler{
		logger:    log.FromContext(context.Background()).WithName("keyvaultsync"),
		k8sClient: k8sClient,
		kvClient:  kvClient,
		runtime:   runtime,
		mappings:  mappings,
	}
}

func (c *AzureKeyVaultReconciler) NeedLeaderElection() bool {
	return true
}

// Start implements manager.Runnable. It runs the sync loop until ctx is cancelled.
func (c *AzureKeyVaultReconciler) Start(ctx context.Context) error {
	clock := c.runtime.GetClock()

	defer func() {
		c.logger.Info("exiting KeyVaultSync controller")
		assert.That(ctx.Err() != nil, "context should be cancelled when shutting down")
	}()

	currentPollInterval := c.runtime.GetConfigMonitor().Get().KeyVaultSyncController.PollInterval
	c.logger.Info("starting KeyVaultSync controller",
		"pollInterval", currentPollInterval,
		"mappings", len(c.mappings),
	)

	for range 10 {
		if err := c.SyncAll(ctx); err != nil {
			c.logger.Error(err, "initial sync failed")
			clock.Sleep(10 * time.Second)
		} else {
			break
		}
	}

	ticker := clock.NewTicker(currentPollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.Chan():
			if err := c.SyncAll(ctx); err != nil {
				c.logger.Error(err, "sync failed")
			}
		}

		nextPollInterval := c.runtime.GetConfigMonitor().Get().KeyVaultSyncController.PollInterval
		if nextPollInterval != currentPollInterval {
			c.logger.Info("poll interval changed, updating ticker",
				"oldPollInterval", currentPollInterval,
				"newPollInterval", nextPollInterval,
			)
			currentPollInterval = nextPollInterval
			ticker.Reset(currentPollInterval)
		}
	}
}

func (c *AzureKeyVaultReconciler) SyncAll(ctx context.Context) error {
	tracer := c.runtime.Tracer()
	ctx, span := tracer.Start(ctx, "keyvaultsync.SyncAll",
		trace.WithAttributes(attribute.Int("mappings", len(c.mappings))),
	)
	defer span.End()

	var lastErr error
	for _, mapping := range c.mappings {
		if err := c.syncMapping(ctx, mapping); err != nil {
			c.logger.Error(err, "failed to sync mapping",
				"secretName", mapping.Name,
				"namespace", mapping.Namespace,
			)
			lastErr = err
		}
	}

	if lastErr != nil {
		span.SetStatus(codes.Error, "one or more mappings failed")
	}

	return lastErr
}

func (c *AzureKeyVaultReconciler) syncMapping(ctx context.Context, mapping KeyVaultSecretMapping) error {
	tracer := c.runtime.Tracer()
	ctx, span := tracer.Start(ctx, "keyvaultsync.syncMapping",
		trace.WithAttributes(
			attribute.String("secretName", mapping.Name),
			attribute.String("namespace", mapping.Namespace),
			attribute.Int("kvSecrets", len(mapping.Secrets)),
		),
	)
	defer span.End()

	secretData := make(map[string]string, len(mapping.Secrets))
	for _, kvSecretName := range mapping.Secrets {
		value, err := c.getSecret(ctx, kvSecretName)
		if err != nil {
			span.RecordError(err)
			return fmt.Errorf("failed to get secret %q: %w", kvSecretName, err)
		}
		secretData[kvSecretName] = value
	}

	jsonBytes, err := json.Marshal(secretData)
	if err != nil {
		span.RecordError(err)
		return fmt.Errorf("failed to marshal secrets to JSON: %w", err)
	}

	secret := &corev1.Secret{}
	secretKey := client.ObjectKey{Name: mapping.Name, Namespace: mapping.Namespace}
	err = c.k8sClient.Get(ctx, secretKey, secret)

	if apierrors.IsNotFound(err) {
		secret = &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      mapping.Name,
				Namespace: mapping.Namespace,
				Labels: map[string]string{
					"app.kubernetes.io/managed-by": "altinn-studio-operator",
				},
			},
			Data: map[string][]byte{
				mapping.FileName: jsonBytes,
			},
		}
		if err := c.k8sClient.Create(ctx, secret); err != nil {
			span.RecordError(err)
			return fmt.Errorf("failed to create secret: %w", err)
		}
		c.logger.Info("created secret",
			"secretName", mapping.Name,
			"namespace", mapping.Namespace,
		)
		return nil
	} else if err != nil {
		span.RecordError(err)
		return fmt.Errorf("failed to get secret: %w", err)
	}

	if secret.Data == nil {
		secret.Data = make(map[string][]byte)
	}
	secret.Data[mapping.FileName] = jsonBytes

	if err := c.k8sClient.Update(ctx, secret); err != nil {
		span.RecordError(err)
		return fmt.Errorf("failed to update secret: %w", err)
	}

	c.logger.Info("synced secret",
		"secretName", mapping.Name,
		"namespace", mapping.Namespace,
		"keys", len(mapping.Secrets),
	)

	return nil
}

func (c *AzureKeyVaultReconciler) getSecret(ctx context.Context, name string) (string, error) {
	tracer := c.runtime.Tracer()
	ctx, span := tracer.Start(ctx, "keyvaultsync.getSecret",
		trace.WithAttributes(attribute.String("secretName", name)),
	)
	defer span.End()

	value, err := c.kvClient.GetSecret(ctx, name, "")
	if err != nil {
		if respErr, ok := err.(*azcore.ResponseError); ok {
			if respErr.StatusCode == 404 {
				span.SetStatus(codes.Error, "secret not found")
				return "", fmt.Errorf("secret %q not found in Key Vault", name)
			}
		}
		span.RecordError(err)
		return "", err
	}

	return value, nil
}
