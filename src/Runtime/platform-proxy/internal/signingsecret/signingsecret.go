// Package signingsecret keeps the proxy's token credentials in step with the Secret that holds the runtime
// cluster's access token certificate, the one apps mount at /accesstoken.
//
// The Secret is in the apps' namespace, and a pod can only mount Secrets from its own, so the proxy reads it
// through the Kubernetes API. Its Role allows it to read this one Secret.
package signingsecret

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	corev1client "k8s.io/client-go/kubernetes/typed/core/v1"

	"altinn.studio/platform-proxy/internal/accesstoken"
	"altinn.studio/platform-proxy/internal/telemetry/attr"
)

const (
	// Namespace, Name and Key locate the certificate as apps get it: the accesstoken Secret, mounted at
	// /accesstoken, where Altinn.Common.AccessTokenClient loads accesstokencredentials.pfx.
	Namespace = "default"
	Name      = "accesstoken"
	Key       = "accesstokencredentials.pfx"
)

const (
	// refreshInterval is how often a loaded certificate is read again, so a rotated one is used within
	// this time. Apps read theirs only when they start.
	refreshInterval = time.Minute
	// retryInterval is how often the proxy tries again until it has a certificate, without which it is
	// not ready.
	retryInterval = 5 * time.Second
	// requestTimeout bounds one read of the Secret.
	requestTimeout = 10 * time.Second
)

var errMissingKey = errors.New("the Secret has no " + Key)

// Watcher reads the certificate from the Secret into an issuer.
type Watcher struct {
	logger  *slog.Logger
	secrets corev1client.SecretsGetter
	issuer  *accesstoken.Issuer
	// lastError is the last failure logged at WARN, so a lasting failure is logged once.
	lastError string
	// keyID is the certificate the issuer has from the watcher.
	keyID string
}

// NewWatcher returns a watcher that reads the Secret through secrets into issuer.
func NewWatcher(logger *slog.Logger, secrets corev1client.SecretsGetter, issuer *accesstoken.Issuer) *Watcher {
	return &Watcher{logger: logger, secrets: secrets, issuer: issuer}
}

// Run reads the certificate until ctx is done: often until the first read succeeds, then at the refresh
// interval. A failed read keeps the certificate the issuer has.
func (w *Watcher) Run(ctx context.Context) {
	for {
		interval := refreshInterval
		if err := w.Load(ctx); err != nil {
			w.logFailure(ctx, err)
			if !w.issuer.Ready() {
				interval = retryInterval
			}
		} else {
			w.lastError = ""
		}

		select {
		case <-ctx.Done():
			return
		case <-time.After(interval):
		}
	}
}

// Load reads the certificate once and gives it to the issuer.
func (w *Watcher) Load(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, requestTimeout)
	defer cancel()
	secret, err := w.secrets.Secrets(Namespace).Get(ctx, Name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("read Secret %s/%s: %w", Namespace, Name, err)
	}
	pfx, ok := secret.Data[Key]
	if !ok {
		return fmt.Errorf("read Secret %s/%s: %w", Namespace, Name, errMissingKey)
	}
	credentials, err := accesstoken.ParsePKCS12(pfx)
	if err != nil {
		return fmt.Errorf("read Secret %s/%s: %w", Namespace, Name, err)
	}

	w.issuer.SetCredentials(credentials)
	if credentials.KeyID() != w.keyID {
		w.keyID = credentials.KeyID()
		w.logger.InfoContext(
			ctx,
			"Signing platform access tokens with a new certificate",
			attr.SigningKeyID, credentials.KeyID(),
			attr.SigningKeyNotAfter, credentials.NotAfter(),
		)
	}
	return nil
}

// logFailure logs a failure at WARN the first time it happens, and at INFO while it lasts.
func (w *Watcher) logFailure(ctx context.Context, err error) {
	level := slog.LevelInfo
	if err.Error() != w.lastError {
		level = slog.LevelWarn
		w.lastError = err.Error()
	}
	message := "Failed to read the access token certificate, keeping the current one"
	if !w.issuer.Ready() {
		message = "Failed to read the access token certificate, not ready until it is read"
	}
	w.logger.Log(ctx, level, message, attr.Error, err)
}
