# Preview

The preview service shows an app the way the app developer is building it in Designer. It serves content from the
app's repository, including the app's own scripts. That content must not run on Studio's domain, where it could act
as the user in Designer and Gitea, so the service runs on a domain of its own.

## How it works

- Designer starts a session on the service's internal port, for the developer who is logged in to Studio. The
  service answers with a URL on the public port: `/{sessionId}/{org}/{app}/`. Designer's page shows that URL in a
  frame.
- The session ID in the URL is the only thing that identifies the session. Preview sets no cookies, because the
  preview domain's cookies would be third-party cookies in Studio's page, and Safari blocks those.
- A session reads one developer's working copy of one app. The service reads the working copies from the share that
  Designer writes them to, so preview shows changes the developer has not pushed.
- A session ends 30 minutes after its last request, and 24 hours after it started at the latest. The session ID is
  in URLs and logs, so it must not stay valid long.

## v9 apps

Preview serves a v9 app as the app backend serves it, with a mock of the backend's API over the working copy.

- Each of the app frontend's routes gets the page that starts the frontend. The frontend comes from Studio's app
  frontend distributions (`/designer/app-dist/`), in the version of the app library the app references, as a real app
  gets it from that package.
- The frontend builds every URL from `/{window.org}/{window.app}`. The page sets `window.org` to `{sessionId}/{org}`,
  so every request from the frontend carries the session ID, and published versions of the frontend work unchanged.
- The user is a mock person who may do everything. The instances the app creates, and their form data, are the
  session's state, which Redis keeps in the same key as the session, so they end together.
- Preview follows the process without evaluating its gateways, and moves past service tasks, as the process engine
  runs them without the user.

## The Studio bridge

A v9 app's page runs a script of preview's before the app frontend,
[studio-bridge.js](src/Altinn.Studio.Preview/AppApi/studio-bridge.js). It tells Studio's page which components the
frontend found errors in, and the UI editor shows the errors by the components. The script needs nothing new from
the frontend, so it works with each published version, and it is never part of a published app.

- It turns on the frontend's validation of the layout, which the frontend otherwise runs only on hosts it knows as
  Studio's or a test environment's. Only on those hosts does the frontend show its errors in place of the component,
  and nothing can turn that on, so preview leaves out a component with errors, and the editor says why.
- It defines `window.logError` and `window.logErrorOnce` before the frontend, which then logs through them. The
  frontend logs each error in a component's configuration with the component's ID.
- The frontend reads the layout schema from Studio's app frontend distributions, which Designer lets any origin read.
- It catches its own errors, so preview works without it. The app's own scripts run on the same page and can send the
  same messages, so Studio checks each message as untrusted input and only shows what it says.

It sends these messages to Studio's origin, with `source: 'altinn-studio-preview'` and `version: 1`:

| `type`            | When                                              | Content                                                                                                     |
| ----------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `ready`           | The page starts.                                  | Nothing. Studio forgets the errors of the page before.                                                      |
| `componentErrors` | The frontend logged errors, at most every 250 ms. | `errors`: each error so far, by component ID. At most 200 components, 20 errors each, 1000 characters each. |

## Security rules

- Only Designer reaches the internal port, because it starts a session for whichever developer the caller names.
  The [NetworkPolicy](infra/kustomize/base/networkpolicy.yaml) allows only Designer's pods, and the endpoints answer
  on their own port only.
- A session reads its own working copy and nothing else. [AppFolder](src/Altinn.Studio.Preview/Files/AppFolder.cs)
  is the only code that opens files, and the build fails on the .NET APIs that open files by path anywhere else
  ([BannedSymbols.txt](src/Altinn.Studio.Preview/BannedSymbols.txt)). It holds the working copy's directory open
  and opens each path from it with Linux's `openat2`, so the kernel refuses a path that leaves the working copy or
  passes through a symbolic link, even one that appears while preview reads. `AppFolder` also refuses `.git`.
- These rules are in preview's own code. The process can read every working copy on the share, so code running in
  it could too.
- Preview can't change a working copy, because the share is mounted read-only.
- The service keeps its sessions in a Redis of its own, so it has no access to Designer's. Whoever can write a session
  there can read any working copy, so only preview's pods reach it and it requires a password.
  [SessionId](src/Altinn.Studio.Preview/Sessions/SessionId.cs) says why Redis keeps a hash of each ID.
- The service's spans record `/{sessionId}` in place of a session ID.
- Preview responses let only the Studio origin show them in a frame.
- The NetworkPolicy also limits what the service reaches to its Redis, the telemetry collector and DNS, in case
  content from a repository ever gets code running in it.

## Development

The service runs in Designer's [local stack](../../Designer/development/README.md), on <http://preview.localhost>.

The service opens files with Linux system calls, so it and its tests run on Linux only, such as in a container or
WSL. From this directory:

```bash
dotnet csharpier check .
dotnet build
dotnet test
node --test tests/studio-bridge/studio-bridge.test.mjs
```

The session lifetime tests run against a real Redis when `PREVIEW_TEST_REDIS` names one, and are skipped otherwise:

```bash
docker run -d --rm --name preview-test-redis -p 6390:6379 docker.io/library/redis:alpine
PREVIEW_TEST_REDIS=localhost:6390 dotnet test
```

## Deployment

The service and its Redis run in the Studio clusters, from the manifests in [infra/kustomize](infra/kustomize).
Each environment's overlay sets the preview domain and the Studio origin in the `altinn-preview-environment`
ConfigMap. The [deploy workflow](../../../.github/workflows/deploy-studio-preview.yaml) builds the image and pushes
the manifests as an OCI artifact with a tag for each environment. No cluster reads the artifact yet: the overlays,
the syncroot entry and the load balancer's route come with the preview domain and its certificate, which
[altinn-studio-infra](https://dev.azure.com/brreg/altinn-studio-ops/_git/altinn-studio-infra) configures.

External Secrets generates the Redis password in the cluster, since nothing outside it needs the password. Redis and
preview read it only when they start, so the [ExternalSecret](infra/kustomize/base/externalsecret.yaml) creates the
Secret once and never changes it. To change the password, delete the `altinn-preview-redis` Secret, then restart Redis
and preview.

The route must do what the [local one](../../load-balancer/local/servers/preview.conf.template) does:

- It forwards only paths that start with a session ID.
- It looks the service's address up on each request, so the load balancer starts without preview and follows its
  Service to a new address.
- It keeps session IDs out of the load balancer's logs and spans.
- It neither traces requests nor passes trace context on, so the preview service's spans are the requests' traces.
  nginx's spans would hold the session ID, and an unsampled context from nginx would make preview drop its spans.
