# devenv

devenv runs a Kind cluster set up like a service owner's
[runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters), for development and tests. It
should match the environment that apps and the runtime services run in.

The e2e testers of the [gateway](../gateway/README.md), the [operator](../operator/README.md) and
[pdf3](../pdf3/README.md) start their clusters with devenv, so a change here can change how those services behave
under test. Their CI workflows run when devenv changes. After a change, run the e2e tests of the services that use
what you changed.

[studioctl](../../cli/README.md) uses devenv's container and resource packages to run the local environment.

## Monitoring

With `IncludeMonitoring` (`--monitoring` on the fixture and on the pdf3, operator and gateway testers), the fixture
also deploys the platform observability pipeline from `infra/observability`. The
[local overlays](../../../infra/observability/local/README.md) adapt production's manifests for the fixture, so when
production's manifests change, change those overlays rather than the fixture. `make test` renders them.
