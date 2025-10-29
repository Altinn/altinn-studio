package operatorcontext

import (
	"context"
	"testing"

	. "github.com/onsi/gomega"
	"go.opentelemetry.io/otel/trace"
)

func TestDiscoversOk(t *testing.T) {
	RegisterTestingT(t)

	operatorContext, err := Discover(context.Background())
	Expect(err).NotTo(HaveOccurred())
	Expect(operatorContext).NotTo(BeNil())
}

func TestCancellationBefore(t *testing.T) {
	RegisterTestingT(t)

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	operatorContext, err := Discover(ctx)
	Expect(operatorContext).To(BeNil())
	Expect(ctx.Err()).To(MatchError(context.Canceled))
	Expect(err).To(MatchError(context.Canceled))

}

func TestCancellationAfter(t *testing.T) {
	RegisterTestingT(t)

	ctx, cancel := context.WithCancel(context.Background())
	operatorContext, err := Discover(ctx)
	Expect(err).NotTo(HaveOccurred())
	Expect(operatorContext).NotTo(BeNil())
	Expect(ctx.Err()).To(Succeed())

	cancel()
	Expect(ctx.Err()).To(MatchError(context.Canceled))
}

func TestSpanStart(t *testing.T) {
	RegisterTestingT(t)

	originalContext := context.Background()
	operatorContext := DiscoverOrDie(originalContext)
	originalSpan := trace.SpanFromContext(operatorContext.Context)
	Expect(operatorContext.Context).To(Equal(originalContext))

	span := operatorContext.StartSpan("Test")
	defer span.End()
	Expect(span).ToNot(Equal(originalSpan))
	Expect(operatorContext.Context).ToNot(Equal(originalContext))
	spanFromContext := trace.SpanFromContext(operatorContext.Context)
	Expect(spanFromContext).To(Equal(span))
}
