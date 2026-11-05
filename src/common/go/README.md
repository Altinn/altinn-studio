# Shared Go code

The OpenTelemetry setup and attribute names that Go services share, so that they all report telemetry the same way.
[pdf3](../../Runtime/pdf3/README.md) and the [operator](../../Runtime/operator/README.md) use it through a `replace`
directive in their `go.mod`.

A service's own metrics and attributes stay in the service.

The [snapshot](snapshot/snapshot.go) package compares test output with files under `_snapshots`, so that pdf3 and the
operator treat snapshots the same way. Only tests import it.
