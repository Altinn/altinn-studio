package operatorcontext

import (
	"context"
	"os"

	"github.com/go-errors/errors"

	"altinn.studio/operator/internal/assert"
	"altinn.studio/operator/internal/orgs"
	"altinn.studio/operator/internal/telemetry"
	"github.com/google/uuid"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
)

const EnvironmentLocal = "localtest"

// ResolveEnvironment determines the environment from the override or OPERATOR_ENVIRONMENT env var.
// Returns EnvironmentLocal if neither is set.
func ResolveEnvironment(override string) string {
	if override != "" {
		return override
	}
	environment := os.Getenv("OPERATOR_ENVIRONMENT")
	if environment == "" {
		return EnvironmentLocal
	}
	return environment
}

type Context struct {
	ServiceOwnerId    string
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

func (c *Context) OverrideEnvironment(env string) {
	c.Environment = env
}

func Discover(ctx context.Context, environment string, orgRegistry *orgs.OrgRegistry) (*Context, error) {
	err := ctx.Err()
	if err != nil {
		return nil, err
	}

	if environment != EnvironmentLocal {
		if orgRegistry == nil {
			return nil, errors.Errorf("OrgRegistry is needed for %s", environment)
		}
	}

	serviceOwnerId := os.Getenv("OPERATOR_SERVICEOWNER")
	if serviceOwnerId == "" {
		if environment != EnvironmentLocal {
			return nil, errors.New("OPERATOR_SERVICEOWNER environment variable is not set")
		}
		serviceOwnerId = "ttd"
	}

	serviceOwnerOrgNo := ""
	if orgRegistry != nil {
		if org, ok := orgRegistry.Get(serviceOwnerId); ok {
			serviceOwnerOrgNo = org.OrgNr
		} else if serviceOwnerId == "ttd" && environment != EnvironmentLocal {
			// The fake org registry has the env number set, but the altinn-orgs.json in CDN does not have org nr for ttd (it's not real)
			serviceOwnerOrgNo = "405003309" // NOTE: this matches the org nr in the registry testdata in localtest, keep in sync
		} else {
			return nil, errors.Errorf("could not find org for service owner id %s", serviceOwnerId)
		}
	}

	runId, err := uuid.NewRandom()
	if err != nil {
		return nil, err
	}

	return &Context{
		ServiceOwnerId:    serviceOwnerId,
		ServiceOwnerOrgNo: serviceOwnerOrgNo,
		Environment:       environment,
		RunId:             runId.String(),
		Context:           ctx,
		tracer:            otel.Tracer(telemetry.ServiceName),
	}, nil
}

func DiscoverOrDie(ctx context.Context, environment string, orgRegistry *orgs.OrgRegistry) *Context {
	context, err := Discover(ctx, environment, orgRegistry)
	assert.That(err == nil, "Discover failed", "error", err)
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
