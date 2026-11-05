# Apps reach Storage through a platform-owned layer that authenticates them

- Status: Proposed
- Deciders: Team Studio
- Date: 26.10.2026

## Result

A2: Apps reach Storage through a layer that the platform owns in each runtime cluster, and that layer authenticates the app to Storage.
The layer is an egress proxy that Studio runs, as proposed in [altinn-studio#21747](https://github.com/Altinn/altinn-studio/issues/21747).
Studio points `PlatformSettings__ApiStorageEndpoint` in the apps' ConfigMap at the proxy, so every app, v8 and v9 alike, moves to the proxy when its pod restarts.
The proxy does nothing but authenticate: it attaches the app's credential and forwards the request.

This decides who owns the step between the app and Storage, not which credential crosses it.
Studio owns both the proxy and the apps' configuration, so the credential can change without app changes or app-lib releases.
The first version attaches a `PlatformAccessToken`, which Storage validates locally, and changes it in two steps:

- Step 1: the proxy signs with the org certificate each runtime cluster already has.
  The token proves that the call comes from the org's runtime cluster, and takes the place of the subscription key APIM checks today.
  Storage requires it for every request other than `GET`, first in a log-only mode (`Observe`) and then enforced (`Enforce`), and then APIM no longer checks the key.
- Step 2: each app runs under its own service account, and the proxy names the app from the caller's Linkerd identity.
  The proxy then sends a token from a new issuer, `altinn-apps`, whose key never leaves Key Vault, as A1 describes.
  The token names `{org}/{app}`, and Storage limits the operations it lets the owning org skip authorization for to the owning app.

Later, the platform can replace the token with another credential in the same way.

Every Storage call then passes through the proxy (B6).
We accept that dependency because the proxy only authenticates, so calls stay fast, and because Studio can change how apps authenticate whenever it needs to, without waiting for service owners to upgrade their apps.

## Problem context

Storage's mutating endpoints are meant to be called by apps.
Most of them are on instances and data elements, but this covers every mutating endpoint apps call, including:

- creating and deleting instances
- process updates
- data elements
- instance events
- locks
- signing
- completion
- read status and substatus

A user or service owner token alone should not be enough to call them directly, because the app is where validation, process rules and data processing happen.

Today that gate is APIM's per-app subscription key (`Ocp-Apim-Subscription-Key`).
APIM lets `GET` requests to Storage through, and checks every other request against the subscription key.
APIM is being replaced by DIS Edge ([altinn-platform RFC 0015](https://github.com/Altinn/altinn-platform/blob/main/rfcs/0015-envoy-gateway-api-edge.md)) and subscription keys are being retired, so Storage has to identify app callers itself.
DIS Edge does not authenticate callers.
It protects against DDoS and blocks some paths.
Because the check moves from APIM into Storage, everything the credential needs to be issued and validated becomes part of the path from app to Storage.

The current keys are also weak credentials.
They are years old, have never been rotated and service owners can read them.
A replacement should not just move that secret from APIM into Storage.

Storage also cannot tell the app from the rest of the org.
In v9, the app commits process transitions and their data with the service owner token, and Storage skips authorization for the owning org ([altinn-storage#1132](https://github.com/Altinn/altinn-storage/pull/1132), [altinn-studio#20943](https://github.com/Altinn/altinn-studio/issues/20943)).
`IsCalledByApp` in `ProcessAuthorizer.cs` accepts any token for the owning org, and the same check appears in Storage's controllers.
Any system the org runs can therefore do what the app does.

The gate protects against three things:

- end users and other outside parties calling Storage directly
- a service owner's own systems and integrations calling Storage directly instead of going through the app, whether for convenience or by mistake
- a leaked or copied credential staying usable for a long time

It does not protect against a service owner who deliberately sets out to bypass their own app.
Service owners write and control the app, so no option in this ADR can tell the app apart from a service owner acting on purpose.
That is out of scope.

Relevant facts:

- Platform access tokens are JWTs the app signs today with its org's private key, with `iss` set to the org, `urn:altinn:app` set to the app and `aud` set to `platform.altinn.no`.
  Every app in an org mounts the same key from the `accesstoken` secret, so any app in the org, or anything else holding the key, can sign a token for any app in the org.
- Validators find one public certificate per issuer in their Key Vault, named `{issuer}-access-token-public-cert`.
  They check the signature and lifetime, but not the audience.
- App-lib sends platform access tokens to Register, Profile, Events, Notifications, Access Management and eFormidling, but not to Storage.
  Storage only uses them on two internal file scan endpoints.
- Studio's runtime operator already reads one Key Vault per environment, `mpo-{env}-kv`, and already writes per-app credentials into each app's `{org}-{app}-deployment-secrets`.
  App-lib v9 reads that secret through provisioned secrets, and changed files reach a running app without a restart.
- Every app, v8 included, gets Storage's address as `PlatformSettings__ApiStorageEndpoint` from the `apps-runtime-common-config-env` ConfigMap, which the deploy pipeline adds to every app.
  Apps read it when they start, so a restart moves a running app to a new address.
  Apps deployed on older chart versions that do not load the ConfigMap are redeployed on the current chart, so all apps use the configuration Studio sets.
- Studio already runs a service of its own in the service owner clusters: the workflow engine, so far in at23 and tt02.
  It has its own namespace, and a network policy lets app pods reach it.
- Only Designer can write an app's metadata to Storage.
  Storage's `Application` model has an `altinnNugetVersion` field for the app library version the app runs ([altinn-storage#1185](https://github.com/Altinn/altinn-storage/pull/1185)), and Designer will fill it in when it deploys an app.
  Storage saves the field once it uses a release of `Altinn.Platform.Storage.Interface` that has it.
- App-lib v8 is not supported after Christmas 2026.
  It gets no new features, and only a critical bug fix would be backported.
- Apps on old app-lib versions can never be made to send a new credential.
  Any gate based on a credential therefore becomes a deadline for upgrading.
- In v9, Maskinporten is already part of the auth between apps and Storage.
  The workflow engine reruns calls until they succeed or the retry policy gives up, after the user may have closed the tab, so those calls cannot use the user's token.
  Until the app has an identity of its own, app-lib calls Storage as the service owner, with a Maskinporten token exchanged at Authentication.
  Calls made directly for the user, such as saving form data, still use the user's token.
- Maskinporten access tokens live for 120 seconds by default.
  App-lib caches them per pod and fetches a new one 30 seconds before expiry, so an app can keep calling for at most about 90 seconds after it loses Maskinporten.

## Decision drivers

- B1: Only apps, and a few named platform callers, can call Storage's app-only endpoints.
  A service owner's own systems, or a user with a valid token, cannot bypass the app.
- B2: The credential is short-lived and rotated automatically, and service owners do not have it at hand.
- B3: What Storage trusts does not depend on where or how apps are hosted. We must not be tied to one hosting platform.
  Apps can move to other clusters, or to another hosting platform, without changing Storage.
- B4: Storage is never left without a gate while moving away from APIM.
- B5: The rollout can be observed, so we know which apps still lack the credential before anything is rejected.
- B6: The credential adds as little as possible to the path from app to Storage.
  Both issuing it in the app and validating it in Storage should keep working when services outside our own platform are down.
- B7: Little operational coupling, such as configuration that must be kept in sync with clusters or apps.
- B8: Long-term goal: identifies the app and not just the org (app-level binding), so it can serve as the app principal for the workflow engine.
  Not required for the first rollout.
- B9: Nice to have: can be built now, without waiting for other teams' roadmaps.
- B10: Nice to have: works without app changes, so v8 apps are covered too.

## Alternatives considered

- A1: A platform access token that the operator signs for each app, under a new issuer, with a key that never leaves Key Vault.
- A2: A layer that the platform owns between apps and the platform APIs, which attaches the app's credential: an egress proxy that Studio runs in each runtime cluster, for the apps' calls to Storage first and to the other platform APIs later.
  Proposed in [altinn-studio#21747](https://github.com/Altinn/altinn-studio/issues/21747).
  The apps' ConfigMap points Storage's address at the proxy.
  In the first version, when a request has no `PlatformAccessToken` header, the proxy adds one, signed with the org certificate the cluster already has, so Storage can check that the call comes from the org's runtime cluster.
  To name the app as well, the proxy maps the caller's Linkerd identity to the app's Deployment, which needs each app to run under its own service account.
  Later, the proxy signs with A1's issuer instead, so its key is not one the apps also hold.
- A3: A Maskinporten token from the per-app client the operator provisions, with a new app-only scope owned by Altinn, `altinn:storage/app`, sent in its own header.
- A4: An app token issued by Authentication.
  When the service owner's Maskinporten token is exchanged, Authentication looks up the token's `client_id` in a mapping from client ID to app, and adds a verified app claim.
  The lookup could be served by Designer or by a standalone service.
  Proposed in [altinn-studio#21008](https://github.com/Altinn/altinn-studio/issues/21008).

These were ruled out, because each fails a requirement or is not an alternative on its own:

- Reusing the service owner scopes `altinn:serviceowner/instances.read` and `altinn:serviceowner/instances.write`.
  That is what v9 apps do today, and the token proves the service owner and not the app, so the org's own systems can still call Storage directly (B1).
- The org-signed `PlatformAccessToken` that app-lib already sends to Register, Profile, Events, Notifications and others.
  Every app in the org signs it with the same key, which service owners can read and which is never rotated, so it cannot prove which app sent it (B2, B8).
- Trusting the egress IPs of the service owner clusters.
  It identifies a network location and not an app, relies on DIS Edge forwarding the client IP correctly, and ties Storage to where the clusters are (B1, B3, B8).
- Moving APIM's subscription key check into Storage.
  It keeps a secret that is years old, has never been rotated and that service owners can read (B2).
  It remains a stopgap if APIM has to go early, as Consequences describes.
- Kubernetes workload identity, with Storage or Authentication trusting each cluster's service account tokens.
  The validator must know every cluster that runs apps and trust its OIDC issuer, which Azure Kubernetes Service hosts, so Storage would be tied to where apps are hosted (B3).
- Grants bound to actions, where Storage gives the app a short-lived grant for the actions the current user can perform on an instance.
  A grant does not prove that the caller is the app, so asking for one needs an app credential such as the token A2 adds.
  Grants are a later step on top of A2, as Notes describes, and not an alternative to it.

## Pros and cons

What each option needs to be up for an app to call Storage (B6):

| Option                    | Issuing the credential                                       | Validating it in Storage                |
| ------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| A1: operator-signed token | Key Vault and the operator, every 12 hours, ahead of use     | Local, against the issuer's certificate |
| A2: proxy in each cluster | The proxy on every call, signing locally                     | Local, against the org's certificate    |
| A3: Maskinporten token    | Maskinporten, which v9 already needs for the workflow engine | Maskinporten's keys, cached             |
| A4: Authentication token  | Maskinporten, Authentication and the lookup                  | Local, against Authentication's keys    |

Validation with cached keys survives a short outage.
Storage keeps the last keys it fetched, so only a Storage pod that starts during the outage is affected.
Issuing does not: when an app cannot get a new token, it cannot call Storage.

### A1: Platform access token signed by the operator

- Good, because it meets B1 and B8 from day one.
  Only the operator can sign with the new issuer's key, and the token names `{org}/{app}`, so Storage can limit actions to the app that owns the instance.
  Storage trusts the app claim only from the new issuer, so an app that still holds the org key cannot use it to prove which app it is.
- Good, because it meets B2.
  The pod holds a token, not a key, and the key never leaves Key Vault.
  The operator renews the token every 12 hours, and a leaked token works only against Storage, because of the audience, and only until it expires.
- Good, because it meets B3.
  Storage trusts one certificate for all apps and does not need to know which clusters run them.
- Good, because it adds the least to the path of the options that meet B1 (B6).
  Tokens are signed ahead of use and live for 24 hours, so a Key Vault or operator outage of up to about 12 hours does not reach the app.
  Storage validates locally, and calls made for the user do not need Maskinporten.
- Good, because Key Vault logs every signature with the identity that asked for it, and an operator identity can be cut off without rotating the key.
- Neutral, because the token lives for 24 hours, not 5 minutes like today's platform access tokens.
  It has to outlive the time a rotation takes to reach the app.
  That is still much less than today, where a leaked org key signs for any app in the org until someone rotates it.
- Neutral, because the first version covers Storage only.
  Other services keep today's org-signed tokens until they accept the new issuer, and Events and Notifications read `iss` as the org, so they must change first.
- Bad, because one signing key covers every org.
  While an operator identity has `sign` access, it can sign for apps in other orgs.
  We have not confirmed whether each org cluster's operator has its own identity, which decides whether access can be revoked for one cluster alone.
  A key per org under the same issuer would close this later.
- Bad, because it adds coupling (B7).
  The new certificate must be in a service's Key Vault before that service receives tokens, or v9 apps get 403.
  Storage only knows an app is v9 if Designer records the version at the right point in a deploy.
- Bad, because it spans more repositories than the other options: the operator, app-lib, Designer, studioctl and localtest, Storage, `altinn-accesstoken`, `altinn-authorization-utils` and the infrastructure (B9).
- Bad, because it does not cover v8 apps (B10).
  Enforcing it for every app waits for service owners to upgrade their v8 apps, which Studio cannot do for them.

### A2: Platform-owned egress proxy in each runtime cluster

- Good, because it covers v8 apps from day one (B10).
  Every app gets Storage's address from the same ConfigMap, so Studio can route every app through the proxy itself, without waiting for service owners to upgrade.
  Storage needs no app library version, and there is no v8 exemption to end before APIM can go.
- Good, because it unlinks Storage's authentication from the app-lib packages (B7).
  How the proxy authenticates to Storage, including which credential it uses, can change without an app-lib release, and without staying compatible with every released app-lib version.
- Good, because step 1 builds on what exists (B9).
  Storage already validates org-signed platform access tokens with `altinn-accesstoken`, and each runtime cluster already has the org certificate.
  Neither step needs an app-lib release or a recorded app library version.
- Good, because it meets B3.
  The proxy relies on Kubernetes and Linkerd, not on Azure, and Storage trusts the token, not the clusters' addresses.
- Good, because it gives the best view of the rollout (B5).
  The proxy can log every call by app before anything is enforced, which also shows which actions each app uses, the data grants bound to actions would need.
- Good, because once the proxy knows the app, it can restrict the app to the endpoints and methods it needs, and Storage can check the `app` claim against the instance's app (B8).
- Neutral, because it identifies only the org in step 1 (B8).
  Each app gets its own service account from a new chart version ([altinn-studio-charts#83](https://github.com/Altinn/altinn-studio-charts/pull/83)), but each app's HelmRelease pins its chart version, so an app gets an identity only when it is redeployed.
  Until then the proxy signs a token with the org only, and Storage cannot require the `app` claim.
  A mutating admission webhook that sets the service account would make a restart enough, but it is one more component, and while it is down app pods either cannot start or start as `default`.
- Neutral, because the proxy can trust the service account but must map it to the app through the Deployments.
  Linkerd sets `l5d-client-id` from the client's mTLS identity and removes any value the client sent.
  Service owners can name any service account in their app's values, so the proxy names the app only when exactly one app Deployment runs as the account, and reads the release from the Deployment, not from pod labels.
  Identifying the app by pod address instead needs the proxy's port outside the mesh, which loses mTLS, and a deleted pod's address can go to a new pod before the proxy notices.
- Neutral, because the proxy can follow the pattern of the workflow engine, the service Studio already runs in service owner clusters.
- Neutral, because an app is rerouted only when it restarts, and app code that calls Storage at an address of its own bypasses the proxy.
  Such calls are rejected once Storage enforces, so `Observe` must find them first.
- Bad, because step 1 keeps the weaknesses of the org-signed token (B1, B2).
  The apps hold the same org key, and service owners can read it, so anything with the key can sign the token the proxy adds.
  Step 2 removes that, since only the proxy gets tokens from the new issuer, and the app's pod then holds no credential for Storage.
- Bad, because every Storage call from every app in the cluster passes through it (B6).
  The proxy only authenticates and forwards, so it adds little time to a call, but if it is down or overloaded, no app in the cluster reaches Storage.
  It must stream large data elements without buffering them.
  Replicas and a disruption budget, as for the workflow engine, reduce that risk but do not remove it.
- Bad, because Studio builds and runs a new service in every cluster, on the path of every app (B7, B9).
- Bad, because the proxy can act as any app in its cluster.
  Whoever controls it, or its credentials, can do in Storage what any of the org's apps can do.

### A3: Maskinporten token from the operator's client, with an app-only scope

- Good, because it meets B2.
  The operator generates, stores and rotates the key in a Kubernetes Secret, and the tokens are short-lived.
- Good, because every v9 app already has the client and the code to get tokens.
  Only the scope and a header are new (B9).
- Good, because Storage trusts one issuer, Maskinporten, wherever the app runs (B3).
- Neutral, because it adds no new failure domain on the app side for v9, but widens one (B6).
  The workflow engine's calls already depend on Maskinporten, and A3 extends that to every call, including saving form data.
  An app can then write to Storage for at most about 90 seconds after it loses Maskinporten.
- Neutral, because the operator's clients are registered on the service owner's organization in Samarbeidsportalen, even though Altinn creates and maintains them.
  We have not confirmed whether a service owner could add a key of their own to such a client and get tokens with the app-only scope that way.
  If they can, it fails B1.
- Bad, because it binds only the org (B8).
  App-level binding needs a mapping from `client_id` to app, which Studio does not have yet.
- Bad, because the pod holds a private key, not a token, so a leaked key can mint tokens until the operator rotates it (B2).
- Bad, because it does not cover v8 apps (B10).
  Enforcing it for every app waits for service owners to upgrade their v8 apps, which Studio cannot do for them.
- Bad, because Digdir/Altinn must register the scope, and the Maskinporten metadata must be configured for each environment.

### A4: App token issued by Authentication

- Good, because Authentication adds a verified app claim, so the token identifies the app (B8).
  That needs the same mapping from `client_id` to app that A3 lacks.
- Good, because Authentication owns the logic for issuing it, and other platform services could use the same claim.
- Bad, because it adds the most to the path (B6).
  The app needs Maskinporten, Authentication and the lookup service to get a token.
  If Designer serves the lookup, the exchange is tied to Designer's runtime and availability.
  A standalone service avoids that, but is one more service to build, run and keep in sync with the operator.
- Bad, because it only covers calls made as the service owner, not calls with an end user's token, unless the app sends it in its own header (B1).
- Bad, because it does not cover v8 apps (B10).
  Enforcing it for every app waits for service owners to upgrade their v8 apps, which Studio cannot do for them.
- Bad, because it is only proposed so far (B9).
  [altinn-studio#21008](https://github.com/Altinn/altinn-studio/issues/21008) describes it from the Studio side, but there is no matching issue or agreement with Authentication yet, and where the mapping from client ID to app should live is still open.

## Notes

### A2 and A1

Step 2 of A2 uses A1's issuer and token format, so Storage validates the same token either way.
The difference is where the token is attached.
A1 attaches it in the app, which keeps the path short, but ties every change to an app-lib release and waits on service owners to upgrade.
A2 attaches it in the proxy, so Studio decides when the token changes, and the app's pod holds no credential for Storage.

### A2 with grants bound to actions

With grants, the app tells Storage which actions the current user can potentially perform on an instance.
Storage checks them in one multi-decision request to Authorization, the kind app-lib's `AuthorizationClient.AuthorizeActions` already sends, and returns a short-lived grant that binds the user, the instance, the app and the allowed actions.
Asking for a grant needs an app credential, and the token the proxy adds can be that credential.
On top of A2, grants narrow what a call through the proxy can do from one app to one user, one instance and a fixed set of actions, and let the workflow engine retry without the service owner token.
They need a new token type and change all traffic between apps and Storage, so they are much more work than A2 alone.

### Later versions of A2

- The other platform APIs, such as Register, Profile, Authorization and Events, move to the proxy one at a time, each in its own issue.
  The ConfigMap sets their addresses the same way.
  Events and Notifications read `iss` as the org, so they must change before they accept tokens from the new issuer.
- Once every platform API the apps call gets its token from the proxy, the `accesstoken` volume can be removed from app pods, so apps no longer hold the org key.
- The proxy can restrict each app to the endpoints and methods it needs, based on what `Observe` shows each app calls.
- The credential can change again, to whatever the platform settles on, without app changes or app-lib releases.

## Consequences

- Studio builds the proxy and deploys it to each runtime cluster from the syncroots, like the workflow engine, in its own namespace with a network policy that lets app pods reach it.
  It runs several replicas with a disruption budget, streams request and response bodies without buffering them, and processes nothing but authentication.
- Studio sets `ApiStorageEndpoint` to the proxy per environment, in both the env ConfigMap and `runtime-overrides.json`, starting with the test environments, and restarts apps so they read it.
  Apps on chart versions that do not load the ConfigMap are redeployed on the current chart first.
- In step 1, the proxy reads the cluster's `accesstoken` secret and signs a platform access token with the org as issuer for each request that has none.
  Storage validates it with `altinn-accesstoken` as it does today, so its Key Vault must have the public certificate for every org in every environment.
- In step 1, Storage requires a valid token for every request other than `GET`, the same requests APIM checks against the subscription key today.
  Storage runs this in `Observe` and then in `Enforce`, and then APIM stops checking the key.
  Storage can also check that the token's org owns the instance, which goes beyond what APIM checks today.
- In step 2, each app gets its own service account from the chart ([altinn-studio-charts#83](https://github.com/Altinn/altinn-studio-charts/pull/83)).
  Each app's HelmRelease pins its chart version, so apps get the account as they are redeployed on the new chart.
  If that takes too long, a mutating admission webhook can set the service account when Kubernetes creates the pods.
- In step 2, the proxy reads `l5d-client-id` and names the app only when exactly one app Deployment runs as that service account.
  It reads the release from the Deployment's `release` label or Helm's `meta.helm.sh/release-name` annotation, not from pod labels, which service owners can set.
  Otherwise it sends a token with the org only.
- In step 2, the operator signs a token for each app ahead of use through Key Vault's `sign` operation, and writes the tokens to a secret that only the proxy mounts.
  The proxy picks the calling app's token and replaces any `PlatformAccessToken` the app sent, so an app cannot choose its own identity.
  Key Vault and the operator stay off each call's path.
- The tokens carry `iss` = `altinn-apps`, `urn:altinn:org`, `urn:altinn:app`, `aud` = `urn:altinn:platform:storage`, `kid` = the Key Vault key version, and live for 24 hours with a new token every 12 hours.
  Only the proxy reads them, so we shorten both once we have measured how long an updated secret takes to reach the proxy.
- `altinn-accesstoken` and the ServiceDefaults package in `altinn-authorization-utils` get support for the new issuer: the org from `urn:altinn:org`, an audience check, several certificates per issuer for key rotation, and a requirement that exposes a trusted `{org}/{app}`.
  Tokens from the old issuers are validated exactly as today.
- In step 2, once every app has an app identity, Storage narrows `IsCalledByApp` from "any token for the owning org" to "the owning app", and trusts the app only from the new issuer.
  That covers process next and abandon, locks, presentation texts and data values.
  Other systems the org runs then go through normal authorization, and v9 policies no longer give the org task-specific actions, so they get 403 on process transitions.
  This changes things for any org that moves the process directly through Storage.
- Storage sits behind both DIS Edge and APIM until step 1 is enforced in that environment.
  If APIM is removed earlier, the app-only endpoints are left without a gate, which breaks B4.
  If it has to go earlier, Storage can check the subscription keys itself for the remaining time, at the cost of keeping the old keys (B2).
- B4 and B5 are about the rollout and hold for every option.
  `Observe` gives B5, and the proxy's logs show which app calls what.
- The rollout order is: the proxy in each runtime cluster, the new address in the test environments, `Observe`, `Enforce`, the new address in production, and removing the subscription key check from APIM.
  Step 2 follows: the chart with a service account per app and the redeploys, the non-exportable signing key and the operator's `sign` access in `mpo-{env}-kv`, the public certificate in Storage's Key Vault, the `altinn-accesstoken` release, the proxy switching issuer, and Storage narrowing `IsCalledByApp`.
- Apps and app-lib do not change.
  Apps still send the APIM subscription key header, and Storage ignores it.
  Local runs are unchanged, since apps there call localtest directly.
- Test tooling that writes directly to Storage, such as the K6 suites, needs a token before `Enforce`.
- Out of scope and handled separately: APIM hides some internal endpoints today by OpenAPI operation (`process/authinfo`, `cleanup`, `ondemand`).
  DIS Edge routes by path prefix, so these endpoints need their own protection.

## Open questions

- Does Storage's Key Vault have the public certificate for every org in every environment?
- How are today's `accesstoken` key pairs and certificates created and distributed?
  That is probably in altinn-studio-infra, which has not been checked yet.
- How are apps redeployed on the chart with a service account per app, and how long does that take?
  This decides whether step 2 needs the admission webhook.
- Does each org cluster's operator have its own managed identity, or do they share one?
  This decides whether `sign` access for the new issuer can be revoked for one cluster alone.
