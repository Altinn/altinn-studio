# Shared Go code

The OpenTelemetry setup and attribute names that Go services share, so that they all report telemetry the same way.
[pdf3](../../Runtime/pdf3/README.md) uses it through a `replace` directive in its `go.mod`.

A service's own metrics and attributes stay in the service.
