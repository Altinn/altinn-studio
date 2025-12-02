package internal

import (
	"context"
	crand "crypto/rand"

	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/crypto"
	"altinn.studio/operator/internal/maskinporten"
	"altinn.studio/operator/internal/operatorcontext"
	"altinn.studio/operator/internal/orgs"
	rt "altinn.studio/operator/internal/runtime"
	"altinn.studio/operator/internal/telemetry"
	"github.com/go-logr/logr"
	"github.com/jonboulle/clockwork"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
)

type runtime struct {
	config                *config.ConfigMonitor
	operatorContext       operatorcontext.Context
	crypto                crypto.CryptoService
	maskinportenApiClient *maskinporten.HttpApiClient
	tracer                trace.Tracer
	meter                 metric.Meter
	clock                 clockwork.Clock
}

var _ rt.Runtime = (*runtime)(nil)

func NewRuntime(ctx context.Context, env string, log *logr.Logger) (rt.Runtime, error) {
	tracer := otel.Tracer(telemetry.ServiceName)
	ctx, span := tracer.Start(ctx, "NewRuntime")
	defer span.End()

	environment := operatorcontext.ResolveEnvironment(env)

	if log != nil {
		log.Info(
			"Starting runtime - resolved environment",
			"Environment", environment,
		)
	}

	configMonitor, err := config.GetConfig(ctx, environment, "")
	if err != nil {
		return nil, err
	}

	configValue := configMonitor.Get()

	if log != nil {
		log.Info(
			"Starting runtime - configuration loaded",
			"Config", configValue.SafeLogValue(),
		)
	}

	orgRegistry, err := orgs.NewOrgRegistry(ctx, configValue.OrgRegistry.URL)
	if err != nil {
		return nil, err
	}

	operatorContext, err := operatorcontext.Discover(ctx, environment, orgRegistry)
	if err != nil {
		return nil, err
	}

	if log != nil {
		log.Info(
			"Starting runtime - discovered operator context",
			"Environment", environment,
			"ServiceOwner", operatorContext.ServiceOwner,
			"RunId", operatorContext.RunId,
		)
	}

	clock := clockwork.NewRealClock()

	cryptoRand := crand.Reader

	cryptoService := crypto.NewDefaultService(
		clock,
		cryptoRand,
	)

	maskinportenApiClient, err := maskinporten.NewHttpApiClient(configMonitor, operatorContext, clock)
	if err != nil {
		return nil, err
	}

	r := &runtime{
		config:                configMonitor,
		operatorContext:       *operatorContext,
		crypto:                *cryptoService,
		maskinportenApiClient: maskinportenApiClient,
		tracer:                tracer,
		meter:                 otel.Meter(telemetry.ServiceName),
		clock:                 clock,
	}

	return r, nil
}

func (r *runtime) GetConfigMonitor() *config.ConfigMonitor {
	return r.config
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
