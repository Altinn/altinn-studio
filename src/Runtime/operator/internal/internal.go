package internal

import (
	"context"
	crand "crypto/rand"

	opclock "altinn.studio/operator/internal/clock"
	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/crypto"
	"altinn.studio/operator/internal/maskinporten"
	"altinn.studio/operator/internal/operatorcontext"
	"altinn.studio/operator/internal/orgs"
	rt "altinn.studio/operator/internal/runtime"
	"altinn.studio/operator/internal/telemetry"
	"github.com/go-logr/logr"
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
	clock                 opclock.Clock
}

var _ rt.Runtime = (*runtime)(nil)

type runtimeOptions struct {
	clock           opclock.Clock
	configMonitor   *config.ConfigMonitor
	operatorContext *operatorcontext.Context
	env             string
	logger          *logr.Logger
}

type RuntimeOption func(*runtimeOptions)

func WithClock(c opclock.Clock) RuntimeOption {
	return func(o *runtimeOptions) { o.clock = c }
}

func WithConfigMonitor(m *config.ConfigMonitor) RuntimeOption {
	return func(o *runtimeOptions) { o.configMonitor = m }
}

func WithOperatorContext(c *operatorcontext.Context) RuntimeOption {
	return func(o *runtimeOptions) { o.operatorContext = c }
}

func WithEnv(env string) RuntimeOption {
	return func(o *runtimeOptions) { o.env = env }
}

func WithLogger(l *logr.Logger) RuntimeOption {
	return func(o *runtimeOptions) { o.logger = l }
}

func NewRuntime(ctx context.Context, opts ...RuntimeOption) (rt.Runtime, error) {
	options := &runtimeOptions{}
	for _, opt := range opts {
		opt(options)
	}

	tracer := telemetry.Tracer()
	ctx, span := tracer.Start(ctx, "NewRuntime")
	defer span.End()

	environment := operatorcontext.ResolveEnvironment(options.env)

	if options.logger != nil {
		options.logger.Info(
			"Starting runtime - resolved environment",
			"Environment", environment,
		)
	}

	configMonitor := options.configMonitor
	if configMonitor == nil {
		var err error
		configMonitor, err = config.GetConfig(ctx, environment, "")
		if err != nil {
			return nil, err
		}
	}

	configValue := configMonitor.Get()

	if options.logger != nil {
		options.logger.Info(
			"Starting runtime - configuration loaded",
			"Config", configValue.SafeLogValue(),
		)
	}

	operatorCtx := options.operatorContext
	if operatorCtx == nil {
		orgRegistry, err := orgs.NewOrgRegistry(ctx, configValue.OrgRegistry.URL)
		if err != nil {
			return nil, err
		}

		operatorCtx, err = operatorcontext.Discover(ctx, environment, orgRegistry)
		if err != nil {
			return nil, err
		}
	}

	if options.logger != nil {
		options.logger.Info(
			"Starting runtime - discovered operator context",
			"Environment", environment,
			"ServiceOwner", operatorCtx.ServiceOwner,
			"RunId", operatorCtx.RunId,
		)
	}

	runtimeClock := options.clock
	if runtimeClock == nil {
		runtimeClock = opclock.NewRealClock()
	}

	cryptoRand := crand.Reader

	cryptoService := crypto.NewDefaultService(
		runtimeClock,
		cryptoRand,
	)

	maskinportenApiClient, err := maskinporten.NewHttpApiClient(configMonitor, operatorCtx, runtimeClock)
	if err != nil {
		return nil, err
	}

	r := &runtime{
		config:                configMonitor,
		operatorContext:       *operatorCtx,
		crypto:                *cryptoService,
		maskinportenApiClient: maskinportenApiClient,
		tracer:                tracer,
		meter:                 telemetry.Meter(),
		clock:                 runtimeClock,
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

func (r *runtime) GetClock() opclock.Clock {
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
