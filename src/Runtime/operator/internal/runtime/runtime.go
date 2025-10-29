package runtime

import (
	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/crypto"
	"altinn.studio/operator/internal/maskinporten"
	"altinn.studio/operator/internal/operatorcontext"
	"github.com/jonboulle/clockwork"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
)

type Runtime interface {
	GetConfig() *config.Config
	GetOperatorContext() *operatorcontext.Context
	GetCrypto() *crypto.CryptoService
	GetMaskinportenApiClient() *maskinporten.HttpApiClient
	GetClock() clockwork.Clock
	Tracer() trace.Tracer
	Meter() metric.Meter
}
