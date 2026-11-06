# Platform proxy

The platform proxy forwards apps' requests to the Altinn Platform's APIs, such as Storage. It runs in each service
owner's [runtime cluster](../../../docs/infrastructure/environments.md#runtime-clusters), and gives the platform one
place to tell that a request comes from a runtime cluster, without changing apps, which service owners own.
[altinn-studio#21747](https://github.com/Altinn/altinn-studio/issues/21747) describes the plan, starting with Storage.

Apps do not use the proxy yet. They call the platform at the addresses in the
[runtime app config](../../../infra/runtime/apps-config), and move to the proxy when those addresses change.

## Platform access tokens

When a request has no `PlatformAccessToken` header, the proxy adds a platform access token with the service owner as
issuer. The platform's APIs validate it with
[Altinn.Common.AccessToken](https://github.com/Altinn/altinn-accesstoken), using the service owner's public
certificate. A token the app sent is passed on as it is: the app signs it with the same certificate, and may name
itself in it. The proxy cannot tell which app a request comes from yet, so its tokens have no app claim.

The [token](internal/accesstoken) must look like one that the app library issues with
`Altinn.Common.AccessTokenClient`, down to the key ID, since the platform finds the signing key by it. The tests
check the format, but not against .NET. After changing the token, check that .NET validates it.

The proxy signs with the certificate apps mount from the `accesstoken` Secret in the `default` namespace. A pod can
only mount Secrets from its own namespace, so the proxy reads the Secret through the Kubernetes API, with a
[Role](infra/kustomize/base/role.yaml) for that one Secret. It reads it again every minute, so it starts using a
rotated certificate within a minute. The proxy is not ready until it has the certificate. This repository does not
create the Secret.

## Who can call it

Apps call the proxy at `http://platform-proxy.runtime-platform-proxy.svc.cluster.local`, and Linkerd encrypts the
connection. Whatever reaches the proxy gets requests signed as the service owner, so its
[network policy](infra/kustomize/base/networkpolicy.yaml) lets in only the apps' namespace.

## Availability

Every call apps make to the platform will go through the proxy. It runs at least two pods, which Kubernetes spreads
across zones, and a voluntary disruption takes at most one. A pod that
is told to stop finishes requests in flight for up to 45 seconds, since uploads of large data elements take time.

## Telemetry

Spans and `http.server.request.duration` name the platform API a request is for as its route, such as `/storage/*`,
and never its path or query: a path can hold a national identity number. `altinn.platform_proxy.access_token` says
whether the proxy added the token or the app sent its own.

## Development

The [Makefile](Makefile) defines the checks. `make check` runs them all, including building each environment's
manifests.
