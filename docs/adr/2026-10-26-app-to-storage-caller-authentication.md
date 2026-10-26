# Storage authenticates requests from apps with Maskinporten tokens from the operator's clients

- Status: Proposed
- Deciders: Team Studio
- Date: 26.10.2026

## Result

A3: App-lib v9 gets a Maskinporten token from the per-app client that Studio's runtime operator provisions, and sends it
to Storage in the `Altinn-App-Token` header. The token carries a new app-only scope owned by Altinn,
`altinn:storage/app`. Storage validates the token directly against Maskinporten and checks that the token's `consumer`
org owns the target instance or app (org-level binding). App-level binding is the long-term goal.

Storage rolls this out on the existing v1 endpoints behind a temporary `Observe` / `Enforce` setting per environment.
Storage stays behind both DIS Edge and APIM until `Enforce` is on in that environment.

## Problem context

Storage's mutating endpoints are meant to be called by apps. Most of them are on instances and data elements, but this
covers every mutating endpoint apps call, including:

- creating and deleting instances
- process updates
- data elements
- instance events
- locks
- signing
- completion
- read status and substatus

A user or service owner token alone should not be enough to call them directly, because the app is where validation,
process rules and data processing happen.

Today that gate is APIM's per-app subscription key (`Ocp-Apim-Subscription-Key`). APIM is being replaced by DIS Edge
([altinn-platform RFC 0015](https://github.com/Altinn/altinn-platform/blob/main/rfcs/0015-envoy-gateway-api-edge.md)) and subscription keys are being retired, so Storage has to identify app callers itself.

The current keys are also weak credentials. They are years old, have never been rotated and service owners can read
them. A replacement should not just move that secret from APIM into Storage.

The gate protects against three things:

- end users and other outside parties calling Storage directly
- a service owner's own systems and integrations calling Storage directly instead of going through the app, whether
  for convenience or by mistake
- a leaked or copied credential staying usable for a long time

It does not protect against a service owner who deliberately sets out to bypass their own app. Service owners write and
control the app, so no option in this ADR can tell the app apart from a service owner acting on purpose. That is out of
scope.

Relevant facts:

- Studio's runtime operator (`src/Runtime/operator`) already creates one Maskinporten client per app through Digdir's
  supplier client. The client has `client_orgno` set to the service owner and gets its scopes from the
  `MaskinportenClient` resource. The operator generates the key, stores it in a Kubernetes Secret, rotates it and
  restarts the app. Nothing is stored in the service owner's Key Vault, so service owners do not have the key at hand.
- App-lib v9 reads that key through provisioned secrets, and every deployed v9 app has one. `MaskinportenClient` caches
  tokens.
- App-lib v8 support ends in November 2026.
  v8 apps can opt in to an operator client, but since it is opt-in it cannot be relied on, and there is no v8 backport.
- The org-signed `PlatformAccessToken` is signed with a certificate in the service owner's Key Vault.
- Storage already binds service owner access at org level, by mapping the consumer org number to a service owner code.
- Apps on old app-lib versions can never be made to send a new credential. Any gate based on a credential therefore
  becomes a deadline for upgrading.
- Later, the workflow engine will need the app to act on its own identity, because retries outlive user tokens. The app
  credential then becomes a principal and not just a gate, and app-level binding matters more.

## Decision drivers

- B1: Only apps, and a few named platform callers, can call Storage's app-only endpoints. A service owner's own systems,
  or a user with a valid token, cannot bypass the app.
- B2: The credential is short-lived and rotated automatically, and service owners do not have it at hand.
- B3: Storage is never left without a gate while moving away from APIM.
- B4: The rollout can be observed, so we know which apps still lack the credential before anything is rejected.
- B5: Little operational coupling, with no new call to another service on each request.
- B6: Long-term goal: identifies the app and not just the org (app-level binding), so it can serve as the app principal
  for the workflow engine. Not required for the first rollout.
- B7: Nice to have: works without app changes, so v8 apps are covered too.
- B8: Nice to have: can be built now, without waiting for other teams' roadmaps.

## Alternatives considered

- A1: Reuse the existing service owner scopes `altinn:serviceowner/instances.read` and `altinn:serviceowner/instances.write` in a token from the app.
- A2: The org-signed `PlatformAccessToken` that app-lib already sends to Register, Profile, Events, Notifications and others.
- A3: A Maskinporten token from the per-app client the operator provisions, with a new scope that only those clients get.
- A4: An app token issued by Authentication. When the service owner's Maskinporten token is exchanged, Authentication
  looks up the token's `client_id` in a mapping from client ID to app, and adds a verified app claim. The lookup could be
  served by Designer or by a standalone service.
  Proposed in [altinn-studio#21008](https://github.com/Altinn/altinn-studio/issues/21008).
- A5: Trust the egress IPs of the service owner app clusters, collected from the runtime gateway or Designer. This needs no app changes.
- A6: Move APIM's subscription key check into Storage.
- A7: Kubernetes workload identity. Each pod gets a short-lived projected service account token with Storage as the audience, and Storage trusts the OIDC issuer of each service owner cluster.

## Pros and cons

### A1: Existing service owner scopes

- Good, because the scopes and their validation already exist (B5, B8).
- Bad, because it fails B1. Service owners already have these scopes on their own Maskinporten clients and use them to
  call apps from their own systems. A token with them proves "the service owner" and not "the app", so their systems could call Storage directly and bypass the app.
- Bad, because it is already unclear whether these scopes belong to the app's API or to Storage's. Giving them a second meaning makes that worse.

### A2: `PlatformAccessToken` signed with the org certificate

- Good, because app-lib already generates it, other platform services already validate it, and v8 could send it with a small backport (B8).
- Bad, because it fails B2. The signing certificate sits in the service owner's Key Vault, where the service owner can read it, and in practice it is never rotated. It has the same weaknesses as the subscription key.
- Bad, because it fails B6. The app sets the `urn:altinn:app` claim itself, and every app in the service owner's cluster uses the same certificate. So the token cannot prove which app sent it.
- Bad, because the existing `PlatformAccess` policy accepts any issuer with a certificate, including `platform`, so Storage would need a stricter variant anyway.

### A3: Maskinporten token from the operator's client, with an app-only scope

- Good, because it meets B2. The operator generates, stores and rotates the key in a Kubernetes Secret, not in the service owner's Key Vault, and the tokens are short-lived.
- Good, because Storage validates the token locally against Maskinporten's metadata, without calling another service on each request (B5).
- Good, because every v9 app already has the client and the code to get tokens. Only the scope and a header are new (B8).
- Good, because there is one client per app, so `client_id` can later be mapped to an app to get app-level binding (B6). 
  Studio does not store this mapping yet. Today the `client_id` is only in the `MaskinportenClient` status in the service owner's cluster.
- Good, because the scope is owned by Altinn, so a service owner cannot grant it to a client of their own (B1).
- Neutral, because the operator's clients are registered on the service owner's organization, even though Altinn creates and maintains them.
  A service owner could add other scopes to such a client, which Studio would likely overwrite on the next deployment.
  We have not yet confirmed whether they could also add a key of their own and get tokens with the app-only scope that way (see open questions).
- Neutral, because it does not stop a service owner who deliberately bypasses their own app. No option does, as described under the threat model.
- Bad, because it fails B7. v8 apps cannot send the token, so `Enforce` is a hard deadline for upgrading to v9.
- Bad, because Digdir/Altinn must register the scope, and the Maskinporten metadata must be configured for each environment.

### A4: App token issued by Authentication

- Good, because it identifies the app (B6) and fits the token exchange apps already do.
- Good, because Authentication owns the logic for issuing it, and other platform services could use the same claim.
- Neutral, because the token exchange would depend on the lookup service.
  If Designer serves it, the exchange is tied to Designer's runtime and availability. A standalone service avoids that, but is one more service to build, run and keep in sync with the operator.
- Neutral, because choosing A3 now does not block A4. A4 can be added later behind the same validator interface without changing Storage's endpoints or rollout.
- Bad, because it needs app changes (B7).
- Bad, because it is only proposed so far (B8).
  [altinn-studio#21008](https://github.com/Altinn/altinn-studio/issues/21008) describes it from the Studio side, but there is no matching issue or agreement with Authentication yet, and where the mapping from client ID to app should live is still open.

### A5: Egress IP allowlist for the service owner clusters

- Good, because it needs no app changes and covers v8 apps from day one (B7).
- Good, because the IPs are stable. Service owners already allowlist them in their own systems.
- Good, because org-level binding is what Storage does today, and each cluster belongs to one service owner.
- Neutral, because it may still be useful as an extra signal, for example to tie requests without a token to an org during `Observe`.
- Bad, because it identifies a network location and not a workload. Anything that runs in the cluster, or sends traffic out through it, passes. It cannot become an app principal (B6).
- Bad, because Storage only sees the client IP through DIS Edge, so the forwarded headers must be set and trusted correctly. A mistake there lets anyone fake the IP (B1).
- Bad, because the allowlist must be updated at the same time as cluster rebuilds, migrations or NAT changes, or apps fail (B5). Local and test setups need their own handling.

### A6: Move the subscription key check into Storage

- Good, because it needs no app changes (B7) and is quick to build (B8).
- Bad, because it fails B2. It keeps an old secret that has never been rotated and that service owners can read, and only puts off rotating it.

### A7: Kubernetes workload identity

- Good, because there is no long-lived secret. Kubernetes issues and rotates the token, and it is short-lived (B2).
- Good, because the token's `sub` claim names the app's service account, so it identifies the app from day one (B6).
- Good, because it does not depend on Maskinporten or Authentication.
- Neutral, because, like A3, it does not stop a service owner who deliberately bypasses their own app. The two are equal on security.
- Bad, because Storage must discover and trust one OIDC issuer per service owner cluster, for example through the runtime gateway. That is new infrastructure, while A3 only trusts Maskinporten (B5, B8).
- Bad, because it needs app changes (B7), although small ones. App-lib reads the token from a file and sends it.
- Bad, because it does not lead to A4. The Maskinporten client in A3 is also the basis for the token issued by Authentication.

## Consequences

- Storage gets an app caller policy on the app-only endpoints, a validator behind `IAppCallerTokenValidator`, an
  `AppCallerSettings` section (`Mode`, Maskinporten metadata address and scope) and a metric tagged with outcome, mode and org.
  `PUT …/datavalues` also accepts the Dialogporten sync adapter scope.
- `Observe` records the outcome and lets the request through. `Enforce` rejects requests with a missing, invalid or mismatched token.
  The setting is temporary and is removed once production enforces.
- App-lib v9 must send the token on every Storage call before v9.0.0 GA.
  There is no v8 backport, so v8 apps must move to v9 before `Enforce` is turned on in their environment. They get 6 to 12 months to do so.
- The scope `altinn:storage/app` must be registered as a scope owned by Altinn and added to every client the operator manages.
- App-level binding is the long-term goal. It needs a mapping from `client_id` to app, which Studio does not have yet (see [altinn-studio#21008](https://github.com/Altinn/altinn-studio/issues/21008)).
  Storage can use that mapping directly, or accept the token issued by Authentication (A4), which builds on the same mapping. It must be in place before the app can act as a principal for the workflow engine.
- The validation sits behind an interface, so an app token issued by Authentication (A4) can be accepted later as a second credential.
- Storage sits behind both DIS Edge and APIM during the rollout.
  APIM can only be removed in front of Storage once `Enforce` is on in that environment, which is at least 6 to 12 months away because of the v8 migration.
  The DIS Edge migration has to plan for that.
- B3 and B4 are requirements on the rollout and hold for every option.
  `Observe` gives B4.
  B3 holds only as long as APIM stays in front of Storage until `Enforce`.
  If APIM is removed earlier, the app-only endpoints are left without a gate until `Enforce` is turned on.
- Test tooling that writes directly to Storage, such as the K6 suites, needs a credential before `Enforce`.
- Out of scope and handled separately: APIM hides some internal endpoints today by OpenAPI operation (`process/authinfo`, `cleanup`, `ondemand`).
  DIS Edge routes by path prefix, so these endpoints need their own protection.

## Open questions

- The operator's clients belong to the service owner's organization in Samarbeidsportalen.
  Can a service owner add a key of their own to such a client, or change it in other ways that a Studio deployment does not overwrite?
  If they can add a key, Storage cannot tell their tokens from the app's.
  That would need a fix, for example locking the client to keys the operator manages, or checking `client_id` against a list of operator clients.
