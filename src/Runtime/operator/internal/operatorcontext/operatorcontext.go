package operatorcontext

import (
	"context"

	"altinn.studio/operator/internal/telemetry"
	"github.com/google/uuid"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
)

const EnvironmentLocal = "local"
const EnvironmentDev = "dev"

type Context struct {
	ServiceOwnerName  string
	ServiceOwnerOrgNo string
	Environment       string
	RunId             string
	// Context which will be cancelled when the program is shut down
	Context context.Context
	tracer  trace.Tracer
}

func (c *Context) IsLocal() bool {
	return c.Environment == EnvironmentLocal
}

func (c *Context) IsDev() bool {
	return c.Environment == EnvironmentDev
}

func (c *Context) OverrideEnvironment(env string) {
	c.Environment = env
}

func Discover(ctx context.Context) (*Context, error) {
	err := ctx.Err()
	if err != nil {
		return nil, err
	}

	// TODO: this should come from the environment/context somewhere
	// there should be 1:1 mapping between TE/env:cluster
	serviceOwnerName := "local"
	serviceOwnerOrgNo := "991825827"
	environment := EnvironmentLocal
	runId, err := uuid.NewRandom()
	if err != nil {
		return nil, err
	}

	return &Context{
		ServiceOwnerName:  serviceOwnerName,
		ServiceOwnerOrgNo: serviceOwnerOrgNo,
		Environment:       environment,
		RunId:             runId.String(),
		Context:           ctx,
		tracer:            otel.Tracer(telemetry.ServiceName),
	}, nil
}

func DiscoverOrDie(ctx context.Context) *Context {
	context, err := Discover(ctx)
	if err != nil {
		panic(err)
	}
	return context
}

func (c *Context) StartSpan(
	spanName string,
	opts ...trace.SpanStartOption,
) trace.Span {
	ctx, span := c.tracer.Start(c.Context, spanName, opts...)
	c.Context = ctx
	return span
}
