# Serve app preview from a new service on `altinnusercontent.studio`

- Status: Proposed
- Deciders: Team
- Date: 04.11.2026

## Result

A4 and S2: A new preview service in the Studio clusters serves app preview on `preview.altinnusercontent.studio`.
The first segment of the URL path contains a preview session ID. Designer keeps the page that shows preview in an
iframe. The session gives only read access, and only to the working copy of one developer for one app.

## Problem context

With preview, an app developer can use the app in Studio while they change it. Designer served preview on the Studio
origin, for example `altinn.studio`. Designer made preview from the developer's working copy of the app repository.

Because preview must run the content of the app, this content cannot be safe on the Studio origin. Preview must run
this content on a different origin. The browser then isolates this content from Studio.

The working copies are on a file share in the Studio clusters. Designer mounts this file share
([`values.yaml`](../../charts/altinn-designer/values.yaml)). The working copies contain changes that the developer
did not push.

On a different domain, preview cannot use the Studio session cookie. Each request from preview must identify the
preview session in a different way. The app frontend sends all requests to `/{org}/{app}` on the origin of the page
([`GlobalData.ts`](../../src/App/frontend/src/GlobalData.ts)).

## Decision drivers

- D1: Content from an app repository never runs on the Studio origin or on a subdomain of the Studio domain. This
  content cannot use the Studio session or the Gitea session of the user.
- D2: If the preview code has an error, an attacker gets the minimum access. The attacker does not get Designer
  secrets or write access to repositories, and cannot deploy apps.
- D3: Preview shows the working copy of the developer, with changes that the developer did not push. Preview shows
  each change a short time after the developer makes it.
- D4: Preview operates in the browsers of app developers. This includes Safari, which does not accept third-party
  cookies.
- D5: Only the browser of the user and the Studio services can see the session ID. Persons who see the network
  traffic cannot see the session ID.
- D6: Nice to have: The solution adds a minimum of new infrastructure that the team must build and operate.

## Alternatives considered

These alternatives are about the service that serves preview:

- A1: Designer serves preview on the Studio origin again. Designer adds a sandbox policy and an allowlist of content
  types to the responses.
- A2: Designer serves preview on a subdomain of the Studio domain, for example `preview.altinn.studio`.
- A3: Designer serves preview on a different registrable domain. The same Designer deployment serves both host names.
- A4: A new preview service in the Studio clusters serves preview on a different registrable domain.
- A5: A new preview service in DIS Core serves preview on a different registrable domain, behind DIS Edge.

These alternatives are about how a request identifies the preview session:

- S1: The host name contains the session ID, for example `{sessionId}.altinnusercontent.studio/{org}/{app}/`.
- S2: The first segment of the URL path contains the session ID, for example
  `preview.altinnusercontent.studio/{sessionId}/{org}/{app}/`.
- S3: A cookie on the preview domain contains the session ID.

## Pros and cons

### A1: Designer serves preview on the Studio origin with a sandbox policy

- Good, because it does not add a new domain, certificate or service (D6).
- Good, because the cookies are first-party cookies (D4).
- Bad, because preview runs scripts from the repository, for example rule handlers and the page of a v8 app. A
  sandbox policy can give these scripts an opaque origin. The app frontend cannot use cookies or storage in an opaque
  origin. As a result, preview does not operate (D1).
- Bad, because if one route serves repository content without the policy, the security risk occurs again on the
  Studio origin (D1).

### A2: Designer serves preview on a subdomain of the Studio domain

- Good, because the wildcard certificate of the Studio domain can also cover the subdomain (D6).
- Good, because the cookies are first-party cookies (D4).
- Bad, because browsers identify the subdomain and Studio as the same site. Designer sets its session cookie with
  `SameSite=Lax`
  ([`StudioOidcAuthenticationExtensions.cs`](../../src/Designer/backend/src/Designer/Infrastructure/StudioOidc/StudioOidcAuthenticationExtensions.cs)).
  As a result, browsers send this cookie on requests from preview to Designer (D1).
- Bad, because a script on a subdomain can set cookies for all host names in the Studio domain. Designer and Gitea
  read these cookies (D1).
- Bad, because Designer serves preview, as in A3. The bad points of A3 about Designer also apply to A2 (D2).

### A3: Designer serves preview on a different domain

- Good, because the browser isolates preview from Studio and from the Studio cookies (D1).
- Good, because preview reads the working copies as before (D3).
- Good, because the preview code does not move from Designer, and no new service is necessary (D6).
- Bad, because a script on the preview domain can call each Designer endpoint on that host name. Designer is safe
  only if each endpoint, also each new endpoint, does not accept the preview host name or the preview session (D1).
- Bad, because preview runs in the Designer process. If the preview code has an error, an attacker can get the
  Designer secrets, Gitea access and deploy access (D2).

### A4: A new preview service in the Studio clusters

- Good, because the browser isolates preview from Studio and from the Studio cookies (D1).
- Good, because requests to the preview domain go only to the preview service. This service has only preview
  endpoints (D1).
- Good, because the service mounts the working copies as read-only and does not have Designer secrets (D2).
- Good, because the service reads the working copy from the same file share that Designer writes to. As a result,
  preview shows changes immediately (D3).
- Bad, because the team must build, deploy and monitor a new service. The team must also add a new domain,
  certificate and load balancer route (D6).

### A5: A new preview service in DIS Core

- Good, because the browser isolates preview from Studio and from the Studio cookies (D1).
- Good, because if an attacker gets control of the preview service, the attacker is in a different cluster from
  Designer and Gitea (D2).
- Bad, because the working copies are only in the Studio clusters. Designer must send the working copy to DIS Core
  after each change. This makes preview slower and adds a dependency between clusters (D3).
- Bad, because the team must add a new service and a route in DIS Edge. Two teams must also change their
  configuration (D6).

### S1: The host name contains the session ID

- Good, because the app frontend operates without changes.
- Good, because each session has a different origin. A script in one preview cannot read the browser storage of a
  different preview.
- Bad, because DNS lookups and the TLS handshake send the host name without encryption. Persons who see this network
  traffic get read access to the working copy (D5).
- Bad, because each Studio environment must have a wildcard DNS record and a wildcard certificate (D6).

### S2: The URL path contains the session ID

- Good, because TLS encrypts the URL path. Only the browser and the Studio services see the session ID (D5).
- Good, because one host name and one certificate for each environment are enough (D6).
- Bad, because the app frontend sends its requests to `/{org}/{app}` without the session ID. Both app frontends must
  add the session ID to the path.
- Bad, because all previews share one origin. A script in one preview can read and change the browser storage of the
  other previews of the same user.

### S3: A cookie contains the session ID

- Good, because the URL does not contain the session ID (D5).
- Bad, because in the Studio page, the cookie of the preview domain is a third-party cookie. Safari does not accept
  third-party cookies (D4).

## Consequences

### Domain and host names

- `altinnusercontent.studio` is a different registrable domain from `altinn.studio`. Browsers identify the two
  domains as different sites.
- In production, the preview host name is `preview.altinnusercontent.studio`. Each other Studio environment has a
  different host name on this domain.
- The infrastructure repository
  [altinn-studio-infra](https://dev.azure.com/brreg/altinn-studio-ops/_git/altinn-studio-infra) contains the
  configuration for the domain, its certificate and DNS.
- The load balancer sends requests for the preview host name only to the preview service. Now, the load balancer
  sends each unknown path on the Studio host to Designer ([`nginx.conf.template`](../../src/load-balancer/nginx.conf.template)).

### Session start

These steps start a preview session:

1. The user opens a Studio page that shows preview.
2. The browser sends a request to Designer to start a preview session.
3. Designer authenticates the user with the Studio session. Designer makes sure that the user has read access to the
   app.
4. Designer sends the developer, the org and the app to an internal endpoint of the preview service. Designer does
   not send a folder path.
5. The preview service creates the session and the session ID. The preview service returns the ID to Designer.
6. Designer returns the full preview URL to the browser.
7. The browser opens the URL in an iframe.

Rules for the session:

- The Studio page uses one session while the page is open. When the editors reload the iframe, they use the same
  session.
- Each request extends the session, up to a maximum time. When the user logs out, Designer stops all preview sessions
  of the user.
- The internal endpoint uses a port that the load balancer does not send requests to. A network policy lets only
  Designer call this endpoint.

### Session ID

- The session ID contains 128 bits from a cryptographic random generator. The ID is in lowercase hex.
- The session ID is not a UUID. [RFC 9562](https://www.rfc-editor.org/rfc/rfc9562#section-8) does not let
  implementations use UUIDs as security capabilities. A UUIDv7 also shows its creation time and has a maximum of 74
  random bits.
- The URL path contains the session ID. As a result, the logs of the load balancer and the preview service contain
  the session ID. For this reason, the session stops a short time after the last request.
- Preview responses have the header `Referrer-Policy: no-referrer`. As a result, the browser does not send the
  preview URL to other sites.

### Preview service

- The preview service makes the folder path from the developer, the org and the app. It does not accept paths
  outside the repository share.
- The preview service serves files only from the working copy of the session, and only under `/{sessionId}/`. As a
  result, a service worker from one app cannot control the paths of other sessions.
- The preview service does not set cookies.
- The preview service keeps the form data and the process state of each session. Before, Designer kept this data in
  its Redis cache.
- Preview responses let only the Studio origin of the same environment show preview in an iframe. The Studio iframe
  does not let preview open a different page in the Studio window.

### App frontend and editors

- Both app frontends put the session ID before `/{org}/{app}` in each URL. This applies to the router base path, the
  API base URL, the `<base>` element, cookie paths and storage keys.
- The app frontend for v9 apps is in [`src/App/frontend`](../../src/App/frontend). The app frontend for v8 apps is
  in [app-frontend-react](https://github.com/Altinn/app-frontend-react). Preview operates only with versions of the
  app frontend that have these changes.
- A spike examines if it is enough that the preview service sets `window.org` to `{sessionId}/{org}`.
- All previews share one origin. A script in one preview can read and change the browser storage of the other
  previews of the same user. For this reason, the app frontend must not keep secrets in browser storage.
- The editors use the window of the preview iframe to reload preview
  ([`AppContext.tsx`](../../src/Designer/frontend/packages/ux-editor/src/AppContext.tsx)). Browsers do not let a page
  do this across origins. As a result, the editors send messages to preview. The app frontend examines the sender of
  each message.

### Other changes

- The local development setup serves preview on a different host name. As a result, developers test the
  cross-origin setup.
- The team moves the preview code from Designer to the new service. When the service is in operation, the team
  removes the [`isPreviewDisabled`](../../src/Designer/frontend/packages/shared/src/utils/previewAvailability.ts)
  flag.
