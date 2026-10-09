package generator

import (
	"context"
	"errors"
	"fmt"

	"go.opentelemetry.io/otel/attribute"
	otelmetric "go.opentelemetry.io/otel/metric"

	"altinn.studio/pdf3/internal/types"
)

// generationsMetric starts with altinn so the observability gateway's metric allowlist keeps it.
const generationsMetric = "altinn.pdf3.generations"

// generatorMetrics count every generation by outcome. The generator's spans record the same,
// but tail sampling keeps only some of them, and the HTTP status codes do not tell the
// failures apart.
type generatorMetrics struct {
	generations otelmetric.Int64Counter
}

func newGeneratorMetrics(meter otelmetric.Meter) (*generatorMetrics, error) {
	generations, err := meter.Int64Counter(
		generationsMetric,
		otelmetric.WithDescription("PDF generations, with error.type set for those that failed"),
		otelmetric.WithUnit("{generation}"),
	)
	if err != nil {
		return nil, fmt.Errorf("create %s counter: %w", generationsMetric, err)
	}
	return &generatorMetrics{generations: generations}, nil
}

// recordGeneration counts one generation, failed when pdfErr is not nil.
func (m *generatorMetrics) recordGeneration(ctx context.Context, pdfErr *types.PDFError) {
	if m == nil {
		return
	}
	if pdfErr == nil {
		m.generations.Add(ctx, 1)
		return
	}
	m.generations.Add(ctx, 1, otelmetric.WithAttributes(attribute.String("error.type", errorTypeName(pdfErr.Type))))
}

// errorTypeName is the error.type value for a PDF error type: low-cardinality and stable,
// unlike the error messages.
func errorTypeName(errType error) string {
	switch {
	case errors.Is(errType, types.ErrQueueFull):
		return "queue_full"
	case errors.Is(errType, types.ErrTimeout):
		return "timeout"
	case errors.Is(errType, types.ErrClientDropped):
		return "client_dropped"
	case errors.Is(errType, types.ErrSetCookieFail):
		return "set_cookie_failed"
	case errors.Is(errType, types.ErrElementNotReady):
		return "element_not_ready"
	case errors.Is(errType, types.ErrGenerationFail):
		return "generation_failed"
	case errors.Is(errType, types.ErrUnhandledBrowserError):
		return "unhandled_browser_error"
	default:
		return "_OTHER"
	}
}
