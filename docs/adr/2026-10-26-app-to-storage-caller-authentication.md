# Storage authenticates requests from apps with Maskinporten tokens from the operator's clients

- Status: Proposed
- Deciders: Team Studio
- Date: 26.10.2026

## Result

A3: App-lib v9 gets a Maskinporten token from the per-app client that Studio's runtime operator provisions, and sends it to Storage in the `Altinn-App-Token` header.
The token carries a new app-only scope owned by Altinn, `altinn:storage/app`.
Storage validates the token directly against Maskinporten and checks that the token's `consumer` org owns the target instance or app (org-level binding).
App-level binding is the long-term goal.

This extends Maskinporten from the workflow engine's calls to every call from the app.
We accept that and limit how long a Maskinporten outage can be absorbed before apps fail (see Consequences). We do not turn on `Enforce` before that is in place.

Storage rolls this out on the existing v1 endpoints behind a temporary `Observe` / `Enforce` setting per environment.
Storage stays behind both DIS Edge and APIM until `Enforce` is on in that environment.

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
APIM is being replaced by DIS Edge ([altinn-platform RFC 0015](https://github.com/Altinn/altinn-platform/blob/main/rfcs/0015-envoy-gateway-api-edge.md)) and subscription keys are being retired, so Storage has to identify app callers itself.
DIS Edge does not authenticate callers.
It protects against DDoS and blocks some paths.
Because the check moves from APIM into Storage, everything the credential needs to be issued and validated becomes part of the path from app to Storage.

The current keys are also weak credentials.
They are years old, have never been rotated and service owners can read them.
A replacement should not just move that secret from APIM into Storage.

The gate protects against three things:

- end users and other outside parties calling Storage directly
- a service owner's own systems and integrations calling Storage directly instead of going through the app, whether for convenience or by mistake
- a leaked or copied credential staying usable for a long time

It does not protect against a service owner who deliberately sets out to bypass their own app.
Service owners write and control the app, so no option in this ADR can tell the app apart from a service owner acting on purpose.
That is out of scope.

Relevant facts:

- Studio's runtime operator (`src/Runtime/operator`) already creates one Maskinporten client per app through Digdir's supplier client.
  The client has `client_orgno` set to the service owner and gets its scopes from the `MaskinportenClient` resource.
  The operator generates the key, stores it in a Kubernetes Secret, rotates it and restarts the app.
  Nothing is stored in the service owner's Key Vault, so service owners do not have the key at hand.
- App-lib v9 reads that key through provisioned secrets, and every deployed v9 app has one.
  `MaskinportenClient` caches tokens.
- App-lib v8 is not supported after Christmas 2026. It gets no new features, and only a critical bug fix would be backported.
  v8 apps can opt in to an operator client, but since it is opt-in it cannot be relied on, and there is no v8 backport.
- Storage already binds service owner access at org level, by mapping the consumer org number to a service owner code.
- Apps on old app-lib versions can never be made to send a new credential.
  Any gate based on a credential therefore becomes a deadline for upgrading.
- Storage only trusts tokens issued by Altinn's Authentication today. It validates them locally and has no direct dependency on Maskinporten.
- In v9, Maskinporten is already part of the auth between apps and Storage.
  The workflow engine reruns calls until they succeed or the retry policy gives up, after the user may have closed the tab, so those calls cannot use the user's token.
  Until the app has an identity of its own, app-lib calls Storage as the service owner, with a Maskinporten token exchanged at Authentication.
  Process transitions, gateways and workflow callbacks do this today.
  Calls made directly for the user, such as saving form data, still use the user's token.
- Maskinporten access tokens live for 120 seconds by default. App-lib caches them per pod and fetches a new one 30 seconds before expiry.
  So an app can keep calling for at most about 90 seconds after it loses Maskinporten.

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

- A1: Reuse the existing service owner scopes `altinn:serviceowner/instances.read` and `altinn:serviceowner/instances.write` in a token from the app.
- A2: The org-signed `PlatformAccessToken` that app-lib already sends to Register, Profile, Events, Notifications and others.
- A3: A Maskinporten token from the per-app client the operator provisions, with a new scope that only those clients get.
- A4: An app token issued by Authentication.
  When the service owner's Maskinporten token is exchanged, Authentication looks up the token's `client_id` in a mapping from client ID to app, and adds a verified app claim.
  The lookup could be served by Designer or by a standalone service.
  Proposed in [altinn-studio#21008](https://github.com/Altinn/altinn-studio/issues/21008).
- A5: Grants bound to actions. The app tells Storage which actions the current user can potentially perform on an instance.
  Storage checks them in one multi-decision request to Authorization and returns a short-lived grant.
  The grant binds the user, the instance, the app and the allowed actions, and Storage then only accepts those actions. This needs a new token type and changes all traffic between apps and Storage.
- A6: Trust the egress IPs of the service owner app clusters, collected from the runtime gateway or Designer. This needs no app changes.
- A7: Move APIM's subscription key check into Storage.
- A8: Kubernetes workload identity. Each pod gets a short-lived projected service account token with Storage as the audience, and Storage trusts the OIDC issuer of each service owner cluster.

## Pros and cons

What each option needs to be up for an app to call Storage (B6):

| Option                      | Issuing the credential                                       | Validating it in Storage                         |
| --------------------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| A1: service owner scopes    | Maskinporten, then Authentication's exchange                 | Local, against Authentication's keys             |
| A2: `PlatformAccessToken`   | Local, in the app                                            | Local, against certificates the platform holds   |
| A3: operator client         | Maskinporten, which v9 already needs for the workflow engine | Maskinporten's keys, cached                      |
| A4: Authentication token    | Maskinporten, Authentication and the lookup                  | Local, against Authentication's keys             |
| A5: grants bound to actions | Storage and Authorization, plus whatever proves the app      | Local, if Storage signs the grant                |
| A6: egress IPs              | Nothing                                                      | Local, but the allowlist must match the clusters |
| A7: subscription key        | Nothing                                                      | Local                                            |
| A8: workload identity       | The app's own cluster                                        | Each cluster's published keys, cached            |

Validation with cached keys survives a short outage.
Storage keeps the last keys it fetched, so only a Storage pod that starts during the outage is affected.
Issuing does not: when an app cannot get a new token, it cannot call Storage.

### A1: Existing service owner scopes

- Good, because the scopes and their validation already exist (B9).
- Bad, because the app must reach both Maskinporten and Authentication to get a token (B6).
- Bad, because it fails B1.
  Service owners already have these scopes on their own Maskinporten clients and use them to call apps from their own systems.
  A token with them proves "the service owner" and not "the app", so their systems could call Storage directly and bypass the app.
- Bad, because it is already unclear whether these scopes belong to the app's API or to Storage's. Giving them a second meaning makes that worse.

### A2: `PlatformAccessToken` signed with the org certificate

- Good, because app-lib already generates it, other platform services already validate it, and v8 could send it with a small backport (B9).
- Good, because it meets B6. The app signs the token itself and Storage validates it locally, so nothing outside the platform is involved.
- Neutral, because Storage does not need to know where apps run (B3). The certificates are distributed through Azure Key Vault on both sides, but that is how it works today.
- Bad, because it fails B2. The signing certificate sits in the service owner's Key Vault, where the service owner can read it, and in practice it is never rotated. It has the same weaknesses as the subscription key.
- Bad, because it fails B8. The app sets the `urn:altinn:app` claim itself, and every app in the service owner's cluster uses the same certificate. So the token cannot prove which app sent it.
- Bad, because the existing `PlatformAccess` policy accepts any issuer with a certificate, including `platform`, so Storage would need a stricter variant anyway.

### A3: Maskinporten token from the operator's client, with an app-only scope

- Good, because it meets B2. The operator generates, stores and rotates the key in a Kubernetes Secret, not in the service owner's Key Vault, and the tokens are short-lived.
- Good, because every v9 app already has the client and the code to get tokens. Only the scope and a header are new (B9).
- Good, because there is one client per app, so `client_id` can later be mapped to an app to get app-level binding (B8).
  Studio does not store this mapping yet. Today the `client_id` is only in the `MaskinportenClient` status in the service owner's cluster.
- Good, because the scope is owned by Altinn, so a service owner cannot grant it to a client of their own (B1).
- Good, because Storage trusts one issuer, Maskinporten, wherever the app runs. Storage does not need to know which clusters run apps or how they are hosted (B3).
- Neutral, because Storage validates the token locally with Maskinporten's keys, without calling Maskinporten on each request.
  Storage still has a new dependency on Maskinporten's metadata, but cached keys cover short outages (B6).
- Neutral, because it adds no new failure domain on the app side for v9, but widens one (B6).
  The workflow engine's calls already depend on Maskinporten, and A3 extends that to every call, including saving form data (see Consequences).
  It needs only Maskinporten, not the exchange at Authentication that service owner calls also need.
- Neutral, because the operator's clients are registered on the service owner's organization, even though Altinn creates and maintains them.
  A service owner could add other scopes to such a client, which Studio would likely overwrite on the next deployment.
  We have not yet confirmed whether they could also add a key of their own and get tokens with the app-only scope that way (see open questions).
- Bad, because it fails B10. v8 apps cannot send the token, so `Enforce` is a hard deadline for upgrading to v9.
- Bad, because Digdir/Altinn must register the scope, and the Maskinporten metadata must be configured for each environment.

### A4: App token issued by Authentication

- Good, because it identifies the app (B8) and fits the token exchange apps already do.
- Good, because Authentication owns the logic for issuing it, and other platform services could use the same claim.
- Bad, because it adds the most to the path (B6). The app needs Maskinporten, Authentication and the lookup service to get a token.
  If Designer serves the lookup, the exchange is tied to Designer's runtime and availability. A standalone service avoids that, but is one more service to build, run and keep in sync with the operator.
- Bad, because it needs app changes (B10).
- Bad, because it is only proposed so far (B9).
  [altinn-studio#21008](https://github.com/Altinn/altinn-studio/issues/21008) describes it from the Studio side, but there is no matching issue or agreement with Authentication yet, and where the mapping from client ID to app should live is still open.

### A5: Grants bound to actions

- Good, because it moves the gate from "who is calling" to "what is allowed". A leaked grant only works for one user, one instance and a fixed set of actions, for a short time (B1, B2).
- Good, because it builds on what app-lib already does. `AuthorizationClient.AuthorizeActions` already sends a multi-decision request for the current user, the instance and a list of actions.
- Good, because it fits the workflow engine (B8). A grant with fixed actions can outlive the user token for retries, without giving the app general access to the service owner's instances.
- Good, because, if Storage signs the grant itself, validating it adds no new failure domain. Getting it needs Authorization, which is already on the path for these requests (B6).
- Good, because it limits how often the app needs Maskinporten (B6). The app only needs its Maskinporten token to ask for a grant, such as when an instance starts or a grant expires, and not every 90 seconds.
  Storage decides how long a grant lives, while a Maskinporten token most likely lives no longer than 120 seconds. If grants also cover the workflow engine's retries, those no longer need a service owner token either.
- Neutral, because the grant itself meets B3, since Storage issues it, but asking for one needs an app credential. A5 is only as independent of hosting as that credential.
- Bad, because a grant does not prove that the caller is the app. A user with a valid token could ask for a grant and then call Storage directly.
  Asking for a grant must therefore need an app credential, such as A3. A5 builds on top of one of them and does not replace them.
- Bad, because it needs a new token type, and possibly a new feature in Authentication if Authentication issues it and not Storage.
  If Authentication issues it, getting a grant also depends on Authentication (B6).
- Bad, because it changes all traffic between apps and Storage and needs app changes (B10). It can be built before APIM is retired, but it is much more work than A3 alone (B9).

### A6: Egress IP allowlist for the service owner clusters

- Good, because it needs no app changes and covers v8 apps from day one (B10).
- Good, because there is nothing to issue, so it adds no failure domain on the path (B6).
- Neutral, because it may still be useful as an extra signal, for example to tie requests without a token to an org during `Observe`.
- Bad, because it identifies a network location and not a workload. Anything that runs in the cluster, or sends traffic out through it, passes. It cannot become an app principal (B8).
- Bad, because Storage only sees the client IP through DIS Edge, so the forwarded headers must be set and trusted correctly. A mistake there lets anyone fake the IP (B1).
- Bad, because it fails B3. Storage must know the network location of every cluster that runs apps.
  The allowlist must follow cluster rebuilds, migrations and NAT changes, or apps fail (B7).

### A7: Move the subscription key check into Storage

- Good, because it needs no app changes (B10) and is quick to build (B9).
- Good, because it adds no failure domain on the path (B6).
- Bad, because it fails B2. It keeps an old secret that has never been rotated and that service owners can read, and only puts off rotating it.

### A8: Kubernetes workload identity

- Good, because there is no long-lived secret. Kubernetes issues and rotates the token, and it is short-lived (B2).
- Good, because the token's `sub` claim names the app's service account, so it identifies the app from day one (B8).
- Bad, because it fails B3. Apps do not run in Storage's cluster, so Storage must know every cluster that runs apps and fetch each one's public keys from wherever it publishes them.
  In practice that is the OIDC issuer Azure Kubernetes Service hosts, so moving apps or running them elsewhere means changing what Storage trusts.
  The list of clusters must also follow rebuilds and new service owners, or their apps fail (B7).
- Bad, because it needs app changes (B10), although small ones. App-lib reads the token from a file and sends it.

## Notes

A4 and A5 are less alternatives to A3 than ways to build on it.
Both start from the operator's Maskinporten client: A4 exchanges its token at Authentication, and A5 needs it to ask for a grant.
Choosing A3 now leaves both open, and each removes some of A3's negatives.

### A3 with A4

Removes:

- Org-level binding only. The token carries a verified app claim, so Storage gets app-level binding (B8) without keeping its own mapping from `client_id` to app.
- Each platform service solving this on its own. Every service that trusts Authentication's tokens gets the same claim.

Does not remove:

- The need for Maskinporten about every 90 seconds. It adds Authentication and the lookup to the path (B6).
- The open question about service owners adding keys. A token from such a key would still be exchanged as the app.
- The upgrade deadline for v8 apps (B10).

### A3 with A5

Removes:

- The need for Maskinporten about every 90 seconds. The app only needs it to ask for a grant (B6).
- The broad reach of a leaked token. An A3 token works on any of the org's instances, and a grant only on one user, one instance and a fixed set of actions (B1, B2).
- The service owner token for the workflow engine's retries, if grants cover them (B8).

Does not remove:

- Org-level binding. A grant can only name the app if Storage knows which app asked for it, which needs the mapping from `client_id` to app, or A4.
- The open question about service owners adding keys. Such a key could also be used to ask for grants.
- The upgrade deadline for v8 apps (B10).

### A3 with A4 and A5

The two cover each other's gaps. A4 identifies the app when it asks for a grant, so grants are bound to the app.
A5 means the app only goes through Maskinporten and Authentication when it asks for a grant, not on every call, so A4's extra dependencies matter much less.

Neither combination removes the two open questions or the deadline for v8.
If a service owner can add a key of their own to the operator's client, that has to be fixed in A3 itself, for example by locking the client to keys the operator manages.

## Consequences

- Storage gets an app caller policy on the app-only endpoints, a validator behind `IAppCallerTokenValidator`, an `AppCallerSettings` section (`Mode`, Maskinporten metadata address and scope) and a metric tagged with outcome, mode and org.
  `PUT …/datavalues` also accepts the Dialogporten sync adapter scope.
- `Observe` records the outcome and lets the request through. `Enforce` rejects requests with a missing, invalid or mismatched token.
  The setting is temporary and is removed once production enforces.
- App-lib v9 must send the token on every Storage call before v9.0.0 GA.
  There is no v8 backport, so v8 apps must move to v9 before `Enforce` is turned on in their environment.
  v8 is not supported after Christmas 2026, but apps still on v8 keep running and cannot send the token. `Observe` shows how many there are.
- The scope `altinn:storage/app` must be registered as a scope owned by Altinn and added to every client the operator manages.
- App-level binding is the long-term goal. It needs a mapping from `client_id` to app, which Studio does not have yet (see [altinn-studio#21008](https://github.com/Altinn/altinn-studio/issues/21008)).
  Storage can use that mapping directly, or accept the token issued by Authentication (A4), which builds on the same mapping. It must be in place before the app can act as a principal for the workflow engine.
- The validation sits behind an interface, so an app token issued by Authentication (A4) or a grant (A5) can be accepted later without changing Storage's endpoints or rollout (see Notes).
- B4 and B5 are about the rollout and hold for every option. `Observe` gives B5.
  B4 holds only while APIM stays in front of Storage, so Storage sits behind both DIS Edge and APIM until `Enforce` is on in that environment.
  If APIM is removed earlier, the app-only endpoints are left without a gate until then. The DIS Edge migration has to plan for that.
- Maskinporten becomes a dependency for all of an app's writes to Storage, not just the workflow engine's.
  We accept this, because a v9 app already cannot finish its work without Maskinporten:
  - Every retry from the workflow engine needs a service owner token. If Maskinporten is down, the app cannot create the token, so the retry never reaches Storage.
  - Process transitions and instantiation already read data as the service owner in the same request, so their first attempt needs Maskinporten too.

  What A3 adds is the first attempt of calls made directly for the user, such as saving form data. How much that adds in practice is hard to measure, because a failed request can have many other causes.

  Without mitigation, an app stops writing to Storage at most about 90 seconds after it loses Maskinporten. The workflow engine's calls have the same exposure today, so the mitigations help both.
  Before `Enforce`, we must decide how long an outage apps should survive, and choose how to get there:
  - a longer access token lifetime on the operator's clients, if Maskinporten allows it
  - a bounded grace period in Storage that accepts a token from the same client for a while after it expires, which trades some of B2 for availability
  - app-lib refreshing tokens early and in the background, so a failed refresh does not block a request while the cached token is still valid
  - grants bound to actions (A5) later, so apps only need Maskinporten to get a grant

- Storage needs an alert when it cannot refresh Maskinporten's metadata, and app-lib needs a metric for failed token refreshes, so an outage is visible before requests start failing.
- Test tooling that writes directly to Storage, such as the K6 suites, needs a credential before `Enforce`.
- Out of scope and handled separately: APIM hides some internal endpoints today by OpenAPI operation (`process/authinfo`, `cleanup`, `ondemand`).
  DIS Edge routes by path prefix, so these endpoints need their own protection.

## Open questions

- Can the operator set a longer access token lifetime on its Maskinporten clients, and what is the longest Maskinporten allows?
  This decides how much of a Maskinporten outage apps can survive without a grace period in Storage.
- The operator's clients belong to the service owner's organization in Samarbeidsportalen.
  Can a service owner add a key of their own to such a client, or change it in other ways that a Studio deployment does not overwrite?
  If they can add a key, Storage cannot tell their tokens from the app's.
  That would need a fix, for example locking the client to keys the operator manages, or checking `client_id` against a list of operator clients.
