# pdf3 API keys

The shared pdf3 in DIS Core will be reachable from the internet through DIS Edge, so its proxy accepts only requests
with one of its API keys.

- The [relay](../cmd/relay) in each service owner's cluster sends a key.
- [`internal/auth`](../internal/auth) describes the key file and when a change takes effect.
- The shared pdf3's keys are in its Key Vault, see [`vault.yaml`](../infra/syncroot/base/vault.yaml).

## What the keys protect

- Service owners, their apps and their clusters are trusted. A malicious insider at a service owner is out of scope.
- The API key protects the shared pdf3 against the internet.
- The shared pdf3 trusts the service owner in `X-Altinn-Service-Owner` from anyone with a valid key. The service
  owner decides only PDF/A conversion and what telemetry records. Revisit this before anything else depends on it,
  such as limits per service owner.
- No policy restricts the URLs a request may render.

## Rotating a key

The shared pdf3 must accept a new key before any relay sends it:

1. Add the new key to the shared pdf3's keys, and wait until every proxy has reloaded them.
2. Make the new key the first key in the relays' files, and wait until every relay has reloaded it.
3. Remove the old key from the shared pdf3's keys.

## Revoking a key

- Revoke a key by replacing it: write the file without the key but with another key, or restart a pod whose file is
  not updated.
- Emptying the file revokes nothing: a file without keys is not loaded.
