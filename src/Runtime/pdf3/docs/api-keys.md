# pdf3 API keys

The shared pdf3 in DIS Core will be reachable from the internet through DIS Edge. Its proxy therefore accepts only
requests that carry one of its API keys.

- The [relay](../cmd/relay) in each service owner's cluster sends a key with each request.
- The [`internal/auth`](../internal/auth) package comment describes the key file and when a change to it takes effect.
- The shared pdf3 keeps its keys in its Key Vault, which [`vault.yaml`](../infra/syncroot/base/vault.yaml) defines.

## What the keys protect

- The keys protect the shared pdf3 against requests from the internet.
- Service owners, their apps and their clusters are trusted. The keys do not protect against a malicious insider at a
  service owner.
- The shared pdf3 trusts the service owner in the `X-Altinn-Service-Owner` header of any request with a valid key.
- The service owner in that header decides only PDF/A conversion and what telemetry records. Revisit this trust
  before anything else depends on the header, such as limits per service owner.
- A request with a valid key can ask pdf3 to render any URL.

## Rotating a key

The shared pdf3 must accept a new key before any relay sends it. Rotate a key in three steps:

1. Add the new key to the shared pdf3's keys. Wait until every proxy has reloaded its keys.
2. Make the new key the first key in each relay's file. Wait until every relay has reloaded its file.
3. Remove the old key from the shared pdf3's keys.

## Revoking a key

- To revoke a key, write the file without that key and with another key in its place.
- If a pod's file is not updated when the Secret changes, restart the pod.
- Do not empty the file to revoke a key. A file without keys is not loaded, so the current keys stay valid.
