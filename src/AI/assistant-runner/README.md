# Assistant runner

The assistant runner runs app code for the [Studio Assistant](../assistant/README.md): the v8-to-v9 upgrade with
studioctl, and `dotnet build`. MSBuild runs code that the app controls, for example `<Exec>` steps and the build
steps of NuGet packages. The assistant holds the model key, the Langfuse keys and the Designer and Gitea keys of each
session, so this code must not run there.

## How a job is isolated

The runner is a Rust coordinator that uses the [Sandbox SDK](https://github.com/digdir/digdir-agents). For each job,
it starts a new microVM from the guest image, and it deletes the VM when the job ends. One pod has one VM at a time.

App code in a job can get:

- the files of that job;
- HTTPS to the hosts in [`ALLOWED_HOSTS`](src/policy.rs);
- the CPU, memory and disk of one VM, for the time of the job.

It cannot get:

- secrets: the guest image, the VM and the coordinator pod have none, and the pod has no service account token;
- other hosts: the Sandbox network layer denies all DNS, connections and HTTP requests that the allowlist does not
  allow. The [network policy](infra/kustomize/networkpolicy.yaml) of the pod is a second layer;
- other jobs: each job has its own VM;
- the node: the job runs as `app-build`, not root, in a VM.

The Sandbox network layer intercepts TLS. The guest agent adds its CA to the trust store of the guest when the VM
starts.

## API

| Route                      | Command in the job                                                                         | Timeout    |
| -------------------------- | ------------------------------------------------------------------------------------------ | ---------- |
| `POST /api/v1/upgrades/v9` | `studioctl app upgrade v9 -p . --json`, then `git add -A` and `git diff --cached --binary` | 11 minutes |
| `POST /api/v1/builds`      | `dotnet build App/App.csproj -nologo -v:q --disable-build-servers`                         | 5 minutes  |
| `GET /health`              |                                                                                            |            |

The request body is an `application/gzip` tar of the app, without `.git`, at most 50 MiB. The assistant puts the
files that git tracks and the new files that git does not ignore in it, as they are on disk.

The answer:

```json
{ "exitCode": 0, "timedOut": false, "stdout": "...", "stderr": "...", "patch": "base64 or null" }
```

- `exitCode` is `null` when the command timed out. The timeout starts with the request.
- `patch` is the output of `git diff --cached --binary` as base64, because a patch can have content that is not
  UTF-8. Only an upgrade that did not time out has a patch. App code made the patch, so check it before you apply it.
- The runner cuts `stdout` and `stderr` at 1 MiB, and the upgrade report in `stdout` at 8 MiB. A patch above 20 MiB
  fails the job.

Other answers:

| Status | Reason                                                                              |
| ------ | ----------------------------------------------------------------------------------- |
| 400    | The archive does not extract. `detail` has the error.                               |
| 413    | The body is larger than 50 MiB.                                                     |
| 415    | The content type is not `application/gzip`.                                         |
| 500    | The VM did not start, or the runner could not make the patch.                       |
| 503    | The pod has a job, or it stops. Try again with a new connection. It does not queue. |

## How a job runs

1. The runner starts a VM from the guest image.
2. It writes the archive to `/job/app.tar.gz`, extracts it into `/job/app`, and commits it as the base of the patch.
3. It runs the command in `/job/app` as `app-build`.
4. For an upgrade, it writes the patch to `/job/changes.patch` and reads it.
5. It deletes the VM, also after an error, a timeout, or when the client goes away. If the delete fails, the runner
   stops, and the restart empties the Provider home of the pod.

## Guest image

[`Dockerfile.guest`](Dockerfile.guest) has:

- the .NET 11 SDK, for v9 apps, and the .NET 10 SDK, because studioctl-server reads projects with its MSBuild;
- git, and studioctl at a pinned version;
- the user `app-build` and the folder `/job`;
- the environment of the jobs. `NUGET_CERT_REVOCATION_MODE=offline` is necessary, because the allowlist blocks the
  certificate revocation servers.

## Change the allowed hosts

Add the host to `ALLOWED_HOSTS` in [`src/policy.rs`](src/policy.rs), and add a test case. An app that uses a private
NuGet feed fails until its host is on the list.

## Run locally

The unit tests need no VM:

```sh
make check
```

A job VM needs `/dev/kvm`. To check the guest image without a VM, run the commands of a job in a container:

```sh
docker build -t assistant-runner-guest:local -f Dockerfile.guest .
docker run --rm -v "$PWD/../../App/template/v9/src:/template:ro" assistant-runner-guest:local \
  sh -c 'cp -R /template app && cd app && dotnet build App/App.csproj -nologo -v:q --disable-build-servers'
```

## Deploy

[`deploy-assistant-runner.yaml`](../../../.github/workflows/deploy-assistant-runner.yaml) builds the guest image, the
coordinator image and the prepared guest image, pins them by digest and pushes `infra/kustomize` as an OCI artifact.
Flux applies it to the namespace `assistant-runner` in dev and prod, from
[`altinn-assistant-runner.yaml`](../../../infra/studio/syncroot/base/altinn-assistant-runner.yaml). Staging has no
sandbox node, so it has no runner.

The pod runs on a node with the label `purpose=sandbox`, and gets `/dev/kvm` from the
[sandbox node plugin](../../ci/sandbox-node/README.md).
