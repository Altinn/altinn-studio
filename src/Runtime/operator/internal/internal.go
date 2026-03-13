package internal

import (
	"context"
	crand "crypto/rand"
	"fmt"

	"github.com/go-logr/logr"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"

	opclock "altinn.studio/operator/internal/clock"
	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/crypto"
	"altinn.studio/operator/internal/maskinporten"
	"altinn.studio/operator/internal/operatorcontext"
	"altinn.studio/operator/internal/orgs"
	rt "altinn.studio/operator/internal/runtime"
	"altinn.studio/operator/internal/telemetry"
)

type runtime struct {
	operatorContext       operatorcontext.Context
	tracer                trace.Tracer
	meter                 metric.Meter
	clock                 opclock.Clock
	config                *config.ConfigMonitor
	maskinportenApiClient *maskinporten.HttpApiClient
	crypto                crypto.CryptoService
}

var _ rt.Runtime = (*runtime)(nil)

type runtimeOptions struct {
	clock           opclock.Clock
	configMonitor   *config.ConfigMonitor
	operatorContext *operatorcontext.Context
	logger          *logr.Logger
	env             string
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

	configMonitor, err := resolveConfigMonitor(ctx, environment, options)
	if err != nil {
		return nil, err
	}

	configValue := configMonitor.Get()

	if options.logger != nil {
		options.logger.Info(
			"Starting runtime - configuration loaded",
			"Config", configValue.SafeLogValue(),
		)
	}

	operatorCtx, err := resolveOperatorContext(ctx, environment, configValue, options)
	if err != nil {
		return nil, err
	}

	if options.logger != nil {
		options.logger.Info(
			"Starting runtime - discovered operator context",
			"Environment", environment,
			"ServiceOwner", operatorCtx.ServiceOwner,
			"RunId", operatorCtx.RunId,
		)
	}

	clock := runtimeClock(options)
	cryptoService := crypto.NewDefaultService(clock, crand.Reader)

	maskinportenApiClient, err := maskinporten.NewHttpApiClient(configMonitor, operatorCtx, clock)
	if err != nil {
		return nil, fmt.Errorf("create Maskinporten API client: %w", err)
	}

	r := &runtime{
		config:                configMonitor,
		operatorContext:       *operatorCtx,
		crypto:                *cryptoService,
		maskinportenApiClient: maskinportenApiClient,
		tracer:                tracer,
		meter:                 telemetry.Meter(),
		clock:                 clock,
	}

	return r, nil
}

func resolveConfigMonitor(
	ctx context.Context,
	environment string,
	options *runtimeOptions,
) (*config.ConfigMonitor, error) {
	if options.configMonitor != nil {
		return options.configMonitor, nil
	}

	configMonitor, err := config.GetConfig(ctx, environment, "")
	if err != nil {
		return nil, fmt.Errorf("load operator config: %w", err)
	}

	return configMonitor, nil
}

func resolveOperatorContext(
	ctx context.Context,
	environment string,
	configValue *config.Config,
	options *runtimeOptions,
) (*operatorcontext.Context, error) {
	if options.operatorContext != nil {
		return options.operatorContext, nil
	}

	orgRegistry, err := orgs.NewOrgRegistry(ctx, configValue.OrgRegistry.URL)
	if err != nil {
		return nil, fmt.Errorf("create org registry client: %w", err)
	}

	operatorCtx, err := operatorcontext.Discover(ctx, environment, orgRegistry)
	if err != nil {
		return nil, fmt.Errorf("discover operator context: %w", err)
	}

	return operatorCtx, nil
}

func runtimeClock(options *runtimeOptions) opclock.Clock {
	if options.clock != nil {
		return options.clock
	}

	return opclock.NewRealClock()
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
