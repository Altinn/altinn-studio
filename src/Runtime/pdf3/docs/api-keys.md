# pdf3 API keys

When pdf3 runs as a shared service, the proxy requires an API key. The [relay](../cmd/relay) sends a key with each
request. The [`internal/auth`](../internal/auth) package comment describes the key file and when changes take effect.
The [DIS Core vault manifest](../infra/syncroot/base/vault.yaml) defines the Key Vault for the shared service.

## What the keys protect

API keys protect the shared pdf3 against requests from the internet. Service owners, their apps, and their clusters
are trusted. A request with a valid key can ask pdf3 to render any URL, so the keys do not protect against a malicious
insider at a service owner.

The shared proxy trusts the service owner in the `X-Altinn-Service-Owner` header of any request with a valid key.
That header controls PDF/A conversion and identifies the service owner in telemetry. Revisit this trust before
anything else depends on the header, such as limits per service owner.

## Keys in DIS Core

In DIS Core, the proxy's key file comes from the Key Vault secret `pdf3-api-keys` through an
[ExternalSecret](../infra/syncroot/base/secrets.yaml). The secret holds the whole file, one key per line, so the steps
below change a proxy's key file by writing a new version of the secret. Never delete the secret: that revokes nothing,
and soft delete blocks its name for 90 days. Writing requires network access that the Key Vault's firewall allows.

The first deploy to an environment creates its Key Vault. Until `pdf3-api-keys` is written, the proxy's pods wait for
their Secret and the Flux Kustomization `pdf3` is not ready. That is harmless while pdf3 has no traffic.

The Secret follows a write at the ExternalSecret's next refresh, or later after a failed sync. To sync at once:

```sh
kubectl -n product-studio-pdf3 annotate externalsecret pdf3-api-keys force-sync="$(date +%s)" --overwrite
```

## Keys in runtime clusters

In runtime clusters, the relay's key file is the Secret `pdf3-upstream-api-key`, which the operator writes from the
secret `Pdf3--Upstream--ApiKey` in the environment's Key Vault `mpo-<env>-kv`. The
[`azurekeyvaultsync`](../../operator/internal/controller/azurekeyvaultsync/controller.go) controller defines the
mapping and polls the Key Vault. All runtime clusters in an environment send the same key, which the environment's
DIS Core proxy must accept. at24's relay calls tt02's DIS Core, so `mpo-at24-kv` holds a tt02 key. The secret is
written by hand.

Write the secret before the relay is deployed to an environment. Until the Secret exists, the relay's pods wait for it
and the Flux Kustomization `pdf3-app` in the runtime clusters is not ready.

## Rotate a key

Every proxy must accept the new key before any relay sends it. For each file update, wait for the affected pods to
log `Reloaded API keys` before continuing. If a pod's file does not update when its Secret changes, restart the pod
and verify that it starts with the updated file.

Rotate the key in this order:

1. Add the new key to every proxy's key file, keeping the old key.
2. Make the new key the first key in every relay's key file, `Pdf3--Upstream--ApiKey` in each environment's Key Vault.
3. Remove the old key from every proxy's key file.

## Revoke a key

Keep at least one valid key in each proxy's key file. An empty or unreadable file leaves the proxy's current keys
valid. Removing a key from a relay's file does not stop the proxy from accepting it.

To revoke a key, remove it from every proxy's key file. Wait for each proxy to log `Reloaded API keys`.
If a proxy's file does not update when its Secret changes, restart the pod and verify that it starts with the updated
file.
