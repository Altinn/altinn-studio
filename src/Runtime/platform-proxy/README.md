# Platform proxy

The platform proxy forwards apps' requests to the Altinn Platform's APIs, such as Storage. It runs in each
[runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters) and adds a `PlatformAccessToken`,
with the service owner as issuer, to requests that have none, so the platform can tell they come from a runtime
cluster ([altinn-studio#21747](https://github.com/Altinn/altinn-studio/issues/21747)). Apps do not use it until the
[runtime app config](../../../infra/runtime/apps-config) points them at it.

- The [token](internal/accesstoken) must match what the app library issues with `Altinn.Common.AccessTokenClient`,
  since the platform finds the signing key by its key ID. The tests do not check it against .NET, so check that after
  changing the token.
- The proxy signs with the certificate apps mount from the `accesstoken` Secret in `default`. It reads the Secret
  through the Kubernetes API, since a pod cannot mount another namespace's Secrets, and is not ready until it has it.
- Spans and metrics name only the platform API a request is for, such as `/storage/*`, never its path or query, which
  can hold a national identity number.

`make check` runs the checks.
