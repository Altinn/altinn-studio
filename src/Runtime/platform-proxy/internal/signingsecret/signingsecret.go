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

	"go.opentelemetry.io/otel/metric"
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

// metricCertificateExpiry is the gauge RegisterMetrics reports.
const metricCertificateExpiry = "altinn.platform_proxy.signing_certificate.expiry"

var errMissingKey = errors.New("the Secret has no " + Key)

// Watcher reads the certificate from the Secret into an issuer.
type Watcher struct {
	logger  *slog.Logger
	secrets corev1client.SecretsGetter
	issuer  *accesstoken.Issuer
	// lastError is the last failure logged at WARN, so a lasting failure is logged once.
	lastError string
	// keyID is the certificate the issuer signs with, and pendingKeyID one in the Secret that is not valid
	// yet, so each is logged once.
	keyID        string
	pendingKeyID string
	// expiredLogged is whether the issuer's certificate has been logged as expired.
	expiredLogged bool
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

	if !w.issuer.SetCredentials(credentials) {
		if credentials.KeyID() != w.pendingKeyID {
			w.pendingKeyID = credentials.KeyID()
			w.logger.InfoContext(
				ctx,
				"The Secret has a certificate that is not valid yet, signing with the current one until it is",
				attr.SigningKeyID, credentials.KeyID(),
				attr.SigningKeyNotBefore, credentials.NotBefore(),
			)
		}
	} else if credentials.KeyID() != w.keyID {
		w.keyID = credentials.KeyID()
		w.logger.InfoContext(
			ctx,
			"Signing platform access tokens with a new certificate",
			attr.SigningKeyID, credentials.KeyID(),
			attr.SigningKeyNotAfter, credentials.NotAfter(),
		)
	}
	w.checkExpiry(ctx)
	return nil
}

// checkExpiry logs once when the issuer's certificate has expired. The proxy keeps signing with it: without a
// token the platform rejects the request too, and requests that carry the app's own token still work.
func (w *Watcher) checkExpiry(ctx context.Context) {
	notAfter, ok := w.issuer.NotAfter()
	expired := ok && time.Now().After(notAfter)
	if expired && !w.expiredLogged {
		w.logger.ErrorContext(
			ctx,
			"The certificate the proxy signs platform access tokens with has expired, and the platform rejects them",
			attr.SigningKeyID, w.keyID,
			attr.SigningKeyNotAfter, notAfter,
		)
	}
	w.expiredLogged = expired
}

// RegisterMetrics reports when issuer's certificate expires, for an alert well before it does.
func RegisterMetrics(meter metric.Meter, issuer *accesstoken.Issuer) error {
	_, err := meter.Float64ObservableGauge(
		metricCertificateExpiry,
		metric.WithUnit("s"),
		metric.WithDescription(
			"When the certificate the proxy signs platform access tokens with expires, in Unix seconds.",
		),
		metric.WithFloat64Callback(func(_ context.Context, observer metric.Float64Observer) error {
			if notAfter, ok := issuer.NotAfter(); ok {
				observer.Observe(float64(notAfter.Unix()))
			}
			return nil
		}),
	)
	if err != nil {
		return fmt.Errorf("register %s: %w", metricCertificateExpiry, err)
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
