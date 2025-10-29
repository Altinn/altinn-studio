package operatorcontext

import (
	"context"
	"os"
	"testing"

	. "github.com/onsi/gomega"
	"go.opentelemetry.io/otel/trace"

	"altinn.studio/operator/internal/orgs"
)

func TestDiscoversOk(t *testing.T) {
	RegisterTestingT(t)

	operatorContext, err := Discover(context.Background(), EnvironmentLocal, nil)
	Expect(err).NotTo(HaveOccurred())
	Expect(operatorContext).NotTo(BeNil())
}

func TestCancellationBefore(t *testing.T) {
	RegisterTestingT(t)

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	operatorContext, err := Discover(ctx, EnvironmentLocal, nil)
	Expect(operatorContext).To(BeNil())
	Expect(ctx.Err()).To(MatchError(context.Canceled))
	Expect(err).To(MatchError(context.Canceled))

}

func TestCancellationAfter(t *testing.T) {
	RegisterTestingT(t)

	ctx, cancel := context.WithCancel(context.Background())
	operatorContext, err := Discover(ctx, EnvironmentLocal, nil)
	Expect(err).NotTo(HaveOccurred())
	Expect(operatorContext).NotTo(BeNil())
	Expect(ctx.Err()).To(Succeed())

	cancel()
	Expect(ctx.Err()).To(MatchError(context.Canceled))
}

func TestSpanStart(t *testing.T) {
	RegisterTestingT(t)

	originalContext := context.Background()
	operatorContext := DiscoverOrDie(originalContext, EnvironmentLocal, nil)
	originalSpan := trace.SpanFromContext(operatorContext.Context)
	Expect(operatorContext.Context).To(Equal(originalContext))

	span := operatorContext.StartSpan("Test")
	defer span.End()
	Expect(span).ToNot(Equal(originalSpan))
	Expect(operatorContext.Context).ToNot(Equal(originalContext))
	spanFromContext := trace.SpanFromContext(operatorContext.Context)
	Expect(spanFromContext).To(Equal(span))
}

func TestDefaultValues(t *testing.T) {
	RegisterTestingT(t)

	// Clear env vars
	os.Unsetenv("OPERATOR_ENVIRONMENT")
	os.Unsetenv("OPERATOR_SERVICEOWNER")

	operatorContext, err := Discover(context.Background(), EnvironmentLocal, nil)
	Expect(err).NotTo(HaveOccurred())
	Expect(operatorContext.Environment).To(Equal(EnvironmentLocal))
	Expect(operatorContext.ServiceOwnerId).To(Equal("ttd"))
	Expect(operatorContext.ServiceOwnerOrgNo).To(Equal(""))
}

func TestResolveEnvironmentWithOverride(t *testing.T) {
	RegisterTestingT(t)

	// Override takes precedence over env var
	t.Setenv("OPERATOR_ENVIRONMENT", "tt02")
	result := ResolveEnvironment("production")
	Expect(result).To(Equal("production"))
}

func TestResolveEnvironmentFromEnvVar(t *testing.T) {
	RegisterTestingT(t)

	// Uses env var when no override
	t.Setenv("OPERATOR_ENVIRONMENT", "tt02")
	result := ResolveEnvironment("")
	Expect(result).To(Equal("tt02"))
}

func TestResolveEnvironmentDefault(t *testing.T) {
	RegisterTestingT(t)

	// Falls back to localtest when no override and no env var
	os.Unsetenv("OPERATOR_ENVIRONMENT")
	result := ResolveEnvironment("")
	Expect(result).To(Equal(EnvironmentLocal))
}

func TestEnvironmentVariables(t *testing.T) {
	RegisterTestingT(t)

	// Create org registry pointing to fake server (docker-compose fakes)
	orgRegistry, err := orgs.NewOrgRegistry(context.Background(),
		"http://localhost:8052/orgs/altinn-orgs.json",
		orgs.WithRetryConfig(0, 0, 1),
	)
	Expect(err).NotTo(HaveOccurred())

	// Set env vars
	t.Setenv("OPERATOR_SERVICEOWNER", "digdir")

	operatorContext, err := Discover(context.Background(), "tt02", orgRegistry)
	Expect(err).NotTo(HaveOccurred())
	Expect(operatorContext.Environment).To(Equal("tt02"))
	Expect(operatorContext.ServiceOwnerId).To(Equal("digdir"))
	Expect(operatorContext.ServiceOwnerOrgNo).To(Equal("991825827"))
}
