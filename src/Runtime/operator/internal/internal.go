package internal

import (
	"context"
	crand "crypto/rand"

	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/crypto"
	"altinn.studio/operator/internal/maskinporten"
	"altinn.studio/operator/internal/operatorcontext"
	rt "altinn.studio/operator/internal/runtime"
	"altinn.studio/operator/internal/telemetry"
	"github.com/jonboulle/clockwork"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
)

type runtime struct {
	config                config.Config
	operatorContext       operatorcontext.Context
	crypto                crypto.CryptoService
	maskinportenApiClient *maskinporten.HttpApiClient
	tracer                trace.Tracer
	meter                 metric.Meter
	clock                 clockwork.Clock
}

var _ rt.Runtime = (*runtime)(nil)

func NewRuntime(ctx context.Context, env string) (rt.Runtime, error) {
	tracer := otel.Tracer(telemetry.ServiceName)
	ctx, span := tracer.Start(ctx, "NewRuntime")
	defer span.End()

	operatorContext, err := operatorcontext.Discover(ctx)
	if err != nil {
		return nil, err
	}
	if env != "" {
		operatorContext.OverrideEnvironment(env)
	}

	cfg, err := config.GetConfig(operatorContext, config.ConfigSourceDefault, "")
	if err != nil {
		return nil, err
	}

	clock := clockwork.NewRealClock()

	cryptoRand := crand.Reader

	crypto := crypto.NewDefaultService(
		operatorContext,
		clock,
		cryptoRand,
	)

	maskinportenApiClient, err := maskinporten.NewHttpApiClient(&cfg.MaskinportenApi, operatorContext, clock)
	if err != nil {
		return nil, err
	}

	rt := &runtime{
		config:                *cfg,
		operatorContext:       *operatorContext,
		crypto:                *crypto,
		maskinportenApiClient: maskinportenApiClient,
		tracer:                tracer,
		meter:                 otel.Meter(telemetry.ServiceName),
		clock:                 clock,
	}

	return rt, nil
}

func (r *runtime) GetConfig() *config.Config {
	return &r.config
}

func (r *runtime) GetOperatorContext() *operatorcontext.Context {
	return &r.operatorContext
}

func (r *runtime) GetCrypto() *crypto.CryptoService {
	return &r.crypto
}

func (r *runtime) GetClock() clockwork.Clock {
	return r.clock
}

func (r *runtime) GetMaskinportenApiClient() *maskinporten.HttpApiClient {
	return r.maskinportenApiClient
}

func (r *runtime) Tracer() trace.Tracer {
	return r.tracer
}

func (r *runtime) Meter() metric.Meter {
	return r.meter
}
