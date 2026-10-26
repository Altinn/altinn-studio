package telemetry

import (
	"context"

	"go.opentelemetry.io/contrib/bridges/otelzap"
	otellog "go.opentelemetry.io/otel/log"
	"go.opentelemetry.io/otel/log/global"
	"go.uber.org/zap/zapcore"
)

// WithOTelLogs sends the operator's log records to OpenTelemetry as well as to core. The logger
// provider exports only WARN and above, and logr has no WARN level, so in practice that is the
// records logged with Error.
//
// A record carries the trace context of a context.Context value logged with it, so it links to
// its trace. core never writes such a value.
//
//nolint:ireturn // zap.WrapCore takes a function returning the interface.
func WithOTelLogs(core zapcore.Core) zapcore.Core {
	return withOTelLogs(core, global.GetLoggerProvider())
}

//nolint:ireturn // See WithOTelLogs.
func withOTelLogs(core zapcore.Core, provider otellog.LoggerProvider) zapcore.Core {
	return zapcore.NewTee(
		withoutContextFields{Core: core},
		otelzap.NewCore(scopeName, otelzap.WithLoggerProvider(provider)),
	)
}

// withoutContextFields leaves out fields whose value is a context.Context, which are there only
// to give the OpenTelemetry record its trace context.
type withoutContextFields struct {
	zapcore.Core
}

//nolint:ireturn // zapcore.Core's With returns the interface.
func (c withoutContextFields) With(fields []zapcore.Field) zapcore.Core {
	return withoutContextFields{Core: c.Core.With(dropContextFields(fields))}
}

func (c withoutContextFields) Check(entry zapcore.Entry, checked *zapcore.CheckedEntry) *zapcore.CheckedEntry {
	if c.Enabled(entry.Level) {
		return checked.AddCore(entry, c)
	}
	return checked
}

//nolint:wrapcheck // The wrapped core's error passes through unchanged.
func (c withoutContextFields) Write(entry zapcore.Entry, fields []zapcore.Field) error {
	return c.Core.Write(entry, dropContextFields(fields))
}

func dropContextFields(fields []zapcore.Field) []zapcore.Field {
	kept := fields[:0:0]
	for _, field := range fields {
		if _, ok := field.Interface.(context.Context); !ok {
			kept = append(kept, field)
		}
	}
	return kept
}
