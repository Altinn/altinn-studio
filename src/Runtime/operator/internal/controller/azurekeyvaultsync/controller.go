package azurekeyvaultsync

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"altinn.studio/operator/internal/assert"
	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/operatorcontext"
	"altinn.studio/operator/internal/telemetry"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azsecrets"
	"github.com/go-logr/logr"
	"go.opentelemetry.io/otel"
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

// Mappings defines the Key Vault secrets to sync. Populate as needed.
var Mappings = []KeyVaultSecretMapping{
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

// +kubebuilder:rbac:groups="",resources=secrets,verbs=create

// AzureKeyVaultReconciler polls Azure Key Vault and syncs secrets to Kubernetes.
// Implements manager.Runnable.
type AzureKeyVaultReconciler struct {
	logger        logr.Logger
	k8sClient     client.Client
	kvClient      *azsecrets.Client
	configMonitor *config.ConfigMonitor
	tracer        trace.Tracer
	environment   string
}

// NewReconciler creates a new KeyVaultSync controller.
// Returns nil if running in local environment (no Key Vault access).
func NewReconciler(
	ctx context.Context,
	k8sClient client.Client,
	configMonitor *config.ConfigMonitor,
	environment string,
) (*AzureKeyVaultReconciler, error) {
	if environment == operatorcontext.EnvironmentLocal {
		return nil, nil
	}

	tracer := otel.Tracer(telemetry.ServiceName)
	_, span := tracer.Start(ctx, "keyvaultsync.NewController")
	defer span.End()

	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		span.RecordError(err)
		return nil, fmt.Errorf("failed to get Azure credentials: %w", err)
	}

	kvClient, err := azsecrets.NewClient(config.KeyVaultURL(environment), cred, nil)
	if err != nil {
		span.RecordError(err)
		return nil, fmt.Errorf("failed to create Key Vault client: %w", err)
	}

	return &AzureKeyVaultReconciler{
		logger:        log.FromContext(ctx).WithName("keyvaultsync"),
		k8sClient:     k8sClient,
		kvClient:      kvClient,
		configMonitor: configMonitor,
		tracer:        tracer,
		environment:   environment,
	}, nil
}

func (c *AzureKeyVaultReconciler) NeedLeaderElection() bool {
	return true
}

// Start implements manager.Runnable. It runs the sync loop until ctx is cancelled.
func (c *AzureKeyVaultReconciler) Start(ctx context.Context) error {
	defer func() {
		c.logger.Info("shutting down KeyVaultSync controller")
		assert.That(ctx.Err() != nil, "")
	}()
	currentPollInterval := c.configMonitor.Get().KeyVaultSyncController.PollInterval
	c.logger.Info("starting KeyVaultSync controller",
		"pollInterval", currentPollInterval,
		"mappings", len(Mappings),
	)

	for range 10 {
		if err := c.syncAll(ctx); err != nil {
			c.logger.Error(err, "initial sync failed")
			time.Sleep(10 * time.Second)
		} else {
			break
		}
	}

	ticker := time.NewTicker(currentPollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			c.logger.Info("shutting down KeyVaultSync controller")
			return nil
		case <-ticker.C:
			if err := c.syncAll(ctx); err != nil {
				c.logger.Error(err, "sync failed")
			}
		}

		nextPollInterval := c.configMonitor.Get().KeyVaultSyncController.PollInterval
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

func (c *AzureKeyVaultReconciler) syncAll(ctx context.Context) error {
	ctx, span := c.tracer.Start(ctx, "keyvaultsync.syncAll",
		trace.WithAttributes(attribute.Int("mappings", len(Mappings))),
	)
	defer span.End()

	var lastErr error
	for _, mapping := range Mappings {
		if err := c.syncMapping(ctx, mapping); err != nil {
			c.logger.Error(err, "failed to sync mapping",
				"secretName", mapping.Name,
				"namespace", mapping.Namespace,
			)
			lastErr = err
			// Continue with other mappings
		}
	}

	if lastErr != nil {
		span.SetStatus(codes.Error, "one or more mappings failed")
	}

	return lastErr
}

func (c *AzureKeyVaultReconciler) syncMapping(ctx context.Context, mapping KeyVaultSecretMapping) error {
	ctx, span := c.tracer.Start(ctx, "keyvaultsync.syncMapping",
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

	// Marshal to JSON
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
					"app.kubernetes.io/managed-by": "altinn-studio-operator-keyvaultsync",
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
	ctx, span := c.tracer.Start(ctx, "keyvaultsync.getSecret",
		trace.WithAttributes(attribute.String("secretName", name)),
	)
	defer span.End()

	resp, err := c.kvClient.GetSecret(ctx, name, "", nil)
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

	if resp.Value == nil {
		return "", fmt.Errorf("secret %q has nil value", name)
	}

	return *resp.Value, nil
}
