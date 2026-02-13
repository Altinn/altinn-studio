package operatorcontext

import (
	"context"
	"fmt"
	"os"

	"altinn.studio/operator/internal/assert"
	"altinn.studio/operator/internal/orgs"
	"altinn.studio/operator/internal/telemetry"
	"github.com/google/uuid"
	"go.opentelemetry.io/otel/trace"
)

const EnvironmentLocal = "localtest"
const EnvironmentProd = "prod"

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

type ServiceOwner struct {
	Id      string
	OrgNo   string
	OrgName string
}

type Context struct {
	ServiceOwner ServiceOwner
	Environment  string
	RunId        string
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
			return nil, fmt.Errorf("OrgRegistry is needed for %s", environment)
		}
	}

	serviceOwnerId := os.Getenv("OPERATOR_SERVICEOWNER")
	if serviceOwnerId == "" {
		if environment != EnvironmentLocal {
			return nil, fmt.Errorf("OPERATOR_SERVICEOWNER environment variable is not set")
		}
		serviceOwnerId = "ttd"
	}

	serviceOwnerOrgNo := ""
	serviceOwnerOrgName := ""
	if orgRegistry != nil {
		if org, ok := orgRegistry.Get(serviceOwnerId); ok {
			serviceOwnerOrgNo = org.OrgNr
			serviceOwnerOrgName = org.Name.Nb
			if serviceOwnerOrgName == "" {
				serviceOwnerOrgName = org.Name.Nn
			}
			if serviceOwnerOrgName == "" {
				serviceOwnerOrgName = org.Name.En
			}
			if serviceOwnerId == "ttd" && environment != EnvironmentLocal {
				// NOTE: we use digdir org number here. ttd is a bit chaotic:
				// - ttd has no org number in altinn-orgs.json
				// - ttd has no org number in Register service for tt02 and other non-prod environments
				// - ttd has an org number in production (405003309)
				// - ttd has an org number in localtest (405003309)
				// - app backend interprets ttd as digdir (991825827). Apps for ttd typically includes authorization rules for digdir (in addition to [org])
				// Since this is going to be used a lot for generating service owner tokens, we prefer to match the app backend behavior using digdir org number.
				serviceOwnerOrgNo = "991825827"
			}
		} else {
			return nil, fmt.Errorf("could not find org for service owner id %s", serviceOwnerId)
		}
	}

	runId, err := uuid.NewRandom()
	if err != nil {
		return nil, err
	}

	return &Context{
		ServiceOwner: ServiceOwner{
			Id:      serviceOwnerId,
			OrgNo:   serviceOwnerOrgNo,
			OrgName: serviceOwnerOrgName,
		},
		Environment: environment,
		RunId:       runId.String(),
		Context:     ctx,
		tracer:      telemetry.Tracer(),
	}, nil
}

func DiscoverOrDie(ctx context.Context, environment string, orgRegistry *orgs.OrgRegistry) *Context {
	opCtx, err := Discover(ctx, environment, orgRegistry)
	assert.That(err == nil, "Discover failed", "error", err)
	assert.That(opCtx != nil, "Discover returned nil context without error")
	return opCtx
}

func (c *Context) StartSpan(
	spanName string,
	opts ...trace.SpanStartOption,
) trace.Span {
	ctx, span := c.tracer.Start(c.Context, spanName, opts...)
	c.Context = ctx
	return span
}
