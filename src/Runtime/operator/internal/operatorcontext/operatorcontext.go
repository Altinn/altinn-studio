package operatorcontext

import (
	"context"
	"errors"
	"fmt"
	"os"

	"github.com/google/uuid"
	"go.opentelemetry.io/otel/trace"

	"altinn.studio/operator/internal/assert"
	"altinn.studio/operator/internal/orgs"
	"altinn.studio/operator/internal/telemetry"
)

var (
	errOrgRegistryRequired     = errors.New("OrgRegistry is needed outside localtest")
	errServiceOwnerEnvNotSet   = errors.New("OPERATOR_SERVICEOWNER environment variable is not set")
	errServiceOwnerNotFound    = errors.New("could not find org for service owner id")
	ttdServiceOwnerFallbackOrg = "991825827"
)

const EnvironmentLocal = "localtest"

const EnvironmentProd = "prod"

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

type ServiceOwner struct {
	Id      string
	OrgNo   string
	OrgName string
}

type Context struct {
	tracer       trace.Tracer
	ServiceOwner ServiceOwner
	Environment  string
	RunId        string
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
		return nil, fmt.Errorf("context cancelled before operator context discovery: %w", err)
	}

	if environment != EnvironmentLocal && orgRegistry == nil {
		return nil, fmt.Errorf("%w: %s", errOrgRegistryRequired, environment)
	}

	serviceOwnerId := os.Getenv("OPERATOR_SERVICEOWNER")
	if serviceOwnerId == "" {
		if environment != EnvironmentLocal {
			return nil, errServiceOwnerEnvNotSet
		}
		serviceOwnerId = "ttd"
	}

	serviceOwner, err := discoverServiceOwner(orgRegistry, serviceOwnerId, environment)
	if err != nil {
		return nil, err
	}

	runId, err := uuid.NewRandom()
	if err != nil {
		return nil, fmt.Errorf("create operator run ID: %w", err)
	}

	return &Context{
		ServiceOwner: serviceOwner,
		Environment:  environment,
		RunId:        runId.String(),
		tracer:       telemetry.Tracer(),
	}, nil
}

func discoverServiceOwner(orgRegistry *orgs.OrgRegistry, serviceOwnerID, environment string) (ServiceOwner, error) {
	if orgRegistry == nil {
		return ServiceOwner{Id: serviceOwnerID}, nil
	}

	org, ok := orgRegistry.Get(serviceOwnerID)
	if !ok {
		return ServiceOwner{}, fmt.Errorf("%w: %s", errServiceOwnerNotFound, serviceOwnerID)
	}

	orgNo := org.OrgNr
	if serviceOwnerID == "ttd" && environment != EnvironmentLocal {
		// NOTE: we use digdir org number here. ttd is a bit chaotic:
		// - ttd has no org number in altinn-orgs.json
		// - ttd has no org number in Register service for tt02 and other non-prod environments
		// - ttd has an org number in production (405003309)
		// - ttd has an org number in localtest (405003309)
		// - app backend interprets ttd as digdir (991825827). Apps for ttd typically includes authorization rules for digdir (in addition to [org])
		// Since this is going to be used a lot for generating service owner tokens, we prefer to match the app backend behavior using digdir org number.
		orgNo = ttdServiceOwnerFallbackOrg
	}

	return ServiceOwner{
		Id:      serviceOwnerID,
		OrgNo:   orgNo,
		OrgName: firstNonEmpty(org.Name.Nb, org.Name.Nn, org.Name.En),
	}, nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func DiscoverOrDie(ctx context.Context, environment string, orgRegistry *orgs.OrgRegistry) *Context {
	opCtx, err := Discover(ctx, environment, orgRegistry)
	assert.That(err == nil, "Discover failed", "error", err)
	assert.That(opCtx != nil, "Discover returned nil context without error")
	return opCtx
}

//nolint:spancheck // This helper intentionally returns the span to the caller, which owns ending it.
func (c *Context) StartSpan(
	ctx context.Context,
	spanName string,
	opts ...trace.SpanStartOption,
) (context.Context, trace.Span) {
	spanCtx, span := c.tracer.Start(ctx, spanName, opts...)
	return spanCtx, span
}
