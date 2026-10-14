# pdf3 API keys

A pdf3 shared by all service owners, in DIS Core, will be reachable from the internet through DIS Edge. Its
proxy accepts only requests with one of its API keys, and the [relay](../cmd/relay) in each service owner's
cluster sends one. Neither is deployed yet. In a service owner's own cluster, the proxy needs no keys.
[`internal/auth`](../internal/auth) reads the keys from a file mounted from a Secret, and describes the file and
when a change takes effect. The shared pdf3's keys are kept in its Key Vault, see
[`infra/syncroot/base/vault.yaml`](../infra/syncroot/base/vault.yaml).

## What the keys protect

- Service owners, their apps and their clusters are trusted. A malicious insider at a service owner is out of
  scope.
- The API key protects the shared pdf3 against the internet.
- The shared pdf3 trusts the service owner in `X-Altinn-Service-Owner` from anyone with a valid key. Today the
  service owner only decides PDF/A conversion and what telemetry records. Revisit this before anything else
  depends on it, such as limits per service owner.
- No policy restricts the URLs a request may render.

## Rotating a key

The shared pdf3 must accept a new key before any relay sends it:

1. Add the new key to the shared pdf3's keys, and wait until every proxy has reloaded them.
2. Make the new key the first key in the relays' files, and wait until every relay has reloaded it.
3. Remove the old key from the shared pdf3's keys.

## Revoking a key

Revoking a key means replacing it: write the file without the key but with another key, or restart a pod whose
file is not updated. Emptying the file revokes nothing, since a file without keys is not loaded.
