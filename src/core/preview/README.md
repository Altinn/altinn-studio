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
```

The session lifetime tests run against a real Redis when `PREVIEW_TEST_REDIS` names one, and are skipped otherwise:

```bash
docker run -d --rm --name preview-test-redis -p 6390:6379 docker.io/library/redis:alpine
PREVIEW_TEST_REDIS=localhost:6390 dotnet test
```

## Deployment

The service and its Redis run in the Studio clusters, from the manifests in [infra/kustomize](infra/kustomize).
Each environment's overlay sets the preview domain and the Studio origin in the `altinn-preview-environment`
ConfigMap. The overlays, the deploy workflow and the load balancer's route come with the preview domain and its
certificate, which [altinn-studio-infra](https://dev.azure.com/brreg/altinn-studio-ops/_git/altinn-studio-infra)
configures.

altinn-studio-infra also generates the Redis password and keeps it in the Studio Key Vault as
`preview-redis-password`. The [ExternalSecret](infra/kustomize/base/externalsecret.yaml) copies it into the cluster.
Redis and preview read it when they start, so restart both after the password changes.

The route must do what the [local one](../../load-balancer/local/servers/preview.conf.template) does:

- It forwards only paths that start with a session ID.
- It keeps session IDs out of the load balancer's logs and spans.
