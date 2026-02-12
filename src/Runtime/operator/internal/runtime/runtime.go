package runtime

import (
	opclock "altinn.studio/operator/internal/clock"
	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/crypto"
	"altinn.studio/operator/internal/maskinporten"
	"altinn.studio/operator/internal/operatorcontext"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
)

type Runtime interface {
	GetConfigMonitor() *config.ConfigMonitor
	GetOperatorContext() *operatorcontext.Context
	GetCrypto() *crypto.CryptoService
	GetMaskinportenApiClient() *maskinporten.HttpApiClient
	GetClock() opclock.Clock
	Tracer() trace.Tracer
	Meter() metric.Meter
}
