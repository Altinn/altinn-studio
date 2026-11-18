// Package telemetry holds the operator's instrumentation scope and its setup of the shared Studio telemetry in
// src/common/go/telemetry.
package telemetry

import (
	"context"
	"fmt"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	otelmetric "go.opentelemetry.io/otel/metric"
	oteltrace "go.opentelemetry.io/otel/trace"

	commontelemetry "altinn.studio/common/telemetry"
)

const scopeName = "core-operator"

// The operator's own attributes. Their values are bounded, so they can go on metrics.
const (
	// AttrKind is the run kind from the catalog, such as upgrade-v9.
	AttrKind = attribute.Key("altinn.core_operator.kind")
	// AttrCaller is the id of the service that created a run.
	AttrCaller = attribute.Key("altinn.core_operator.caller")
	// AttrDomain is the group of handlers that a workflow belongs to, such as runs.
	AttrDomain = attribute.Key("altinn.core_operator.domain")
	// AttrCommandKey is the step of a workflow that a callback runs, such as run.await-archive.
	AttrCommandKey = attribute.Key("altinn.core_operator.command_key")
)

// AttrSubjectID is what a workflow works on, such as a run id, and goes on spans only. operator-workflow-engine puts
// it, the domain, the caller and the command key on the engine's spans of the workflow, so a search finds both sides.
const AttrSubjectID = attribute.Key("altinn.core_operator.subject_id")

// serviceVersion is the build's version, the commit the deployment workflow builds from:
// go build -ldflags "-X altinn.studio/core-operator/internal/telemetry.serviceVersion=...".
var serviceVersion = "dev"

//nolint:ireturn // The OpenTelemetry API returns interfaces.
func Tracer() oteltrace.Tracer {
	return otel.Tracer(scopeName)
}

//nolint:ireturn // The OpenTelemetry API returns interfaces.
func Meter() otelmetric.Meter {
	return otel.Meter(scopeName)
}

// ConfigureOTel exports traces, metrics and logs, as the standards for Studio services describe
// (src/common/go/telemetry). The router in the cluster sets deployment.environment.name.
// If it does not return an error, call shutdown before the process exits.
func ConfigureOTel(ctx context.Context) (shutdown func(context.Context) error, err error) {
	shutdown, err = commontelemetry.Setup(ctx, commontelemetry.Config{
		ServiceVersion: serviceVersion,
		Signals:        commontelemetry.AllSignals(),
	})
	if err != nil {
		return nil, fmt.Errorf("configure OpenTelemetry: %w", err)
	}
	return shutdown, nil
}
