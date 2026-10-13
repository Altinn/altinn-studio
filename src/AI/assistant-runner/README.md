# Assistant runner

The assistant runner runs app code for the [Studio Assistant](../assistant/README.md). It has two fixed commands:

- the v8-to-v9 upgrade, `studioctl app upgrade v9 -p . --json`
- `dotnet build App/App.csproj -nologo -v:q --disable-build-servers`

The assistant sends a copy of the app. The runner runs the command on the copy and sends back the exit code, the
output and, for the upgrade, the changes as a patch. The assistant decides what to do with the result.

## Why a separate service

MSBuild runs code that the app controls: `<Exec>` targets, inline tasks, and the targets, analyzers and source
generators of NuGet packages. The user and the model can change the app. If the assistant pod ran this code, the code
could read the model key, the Langfuse keys and the Designer API key of each session.

The runner holds no secrets. If app code gets control of a job, it can get:

- the app copy of the job, which the caller sent;
- the internet on port 443;
- the CPU, memory and disk of one pod for the time of the job.

It cannot get:

- secrets: the pod has none, and it has no service account token;
- other pods and Services in the cluster, the Azure instance metadata service and the Azure host: the network policy
  stops them;
- the files and processes of an earlier or a later job: the service stops all processes of the job user and deletes
  the job folder after each job;
- the service process: the job runs as a different user, without capabilities and without the environment of the
  service;
- the node: the pod is a Kata VM.

## API

| Route                      | Command in the job                                                                         | Timeout    |
| -------------------------- | ------------------------------------------------------------------------------------------ | ---------- |
| `POST /api/v1/upgrades/v9` | `studioctl app upgrade v9 -p . --json`, then `git add -A` and `git diff --cached --binary` | 11 minutes |
| `POST /api/v1/builds`      | `dotnet build App/App.csproj -nologo -v:q --disable-build-servers`                         | 5 minutes  |
| `GET /health`              |                                                                                            |            |

The request body is an `application/gzip` tar of the app, without `.git`, at most 50 MiB. Make it with
`git archive --format=tar.gz HEAD`.

The response:

```json
{ "exitCode": 0, "timedOut": false, "stdout": "...", "stderr": "...", "patch": "base64 or null" }
```

- `exitCode` is `null` when the command timed out.
- `patch` is the output of `git diff --cached --binary` as base64, because a patch can hold content that is not
  UTF-8. Only the upgrade has a patch. The patch is the output of a job that ran app code, so check it before you
  apply it.
- The runner cuts `stdout` and `stderr` at 1 MiB, and the upgrade report in `stdout` at 8 MiB. A patch above
  20 MiB fails the job.
- Paths in the output are relative to the app.
- The runner does not read the studioctl report in `stdout`. The client reads it.

Other answers:

| Status | Reason                                                               |
| ------ | -------------------------------------------------------------------- |
| 400    | The archive does not extract. `detail` has the error.                |
| 413    | The body is larger than 50 MiB.                                      |
| 415    | The content type is not `application/gzip`.                          |
| 503    | The pod runs a job. Try again after a short time. It does not queue. |

## How a job runs

The service runs as root in the Kata VM, with only the capabilities `CHOWN`, `SETUID` and `SETGID`. At start-up, it
stops if it is not root or if the user `app-build` does not exist. Then it changes `/work`, so that only root can
make folders in it.

For each job:

1. The service stops all processes of `app-build`. It makes the folder `/work/<id>` and gives it to `app-build`.
2. As `app-build`, it extracts the archive into `app/`, makes the folders `home/`, `tmp/` and `studioctl/`, and
   commits the app as the base of the patch.
3. As `app-build`, it runs the command in `app/`, through
   `setpriv --reuid --regid --clear-groups --no-new-privs`, with an environment that has only the variables that the
   job needs. Each job has its own NuGet cache and its own studioctl-server. `prlimit` limits `app-build` to 1024
   processes and threads, so a fork bomb cannot stop the service from starting the process that stops the job.
4. At the end, also after a timeout, an error or an abort, it stops all processes of `app-build`. Then, as
   `app-build`, it deletes the job folder and the files of `app-build` in `/tmp` and `/dev/shm`.

A job stops every process of `app-build`, so a pod runs one job at a time. If the processes do not stop, the service
stops itself. Its container stops with all processes in it, and Kubernetes starts a new container.

## Run locally

Build the image and start it with the restrictions of the pod:

```sh
docker build -t assistant-runner:local -f Dockerfile .
docker run -d --name assistant-runner -p 8080:8080 \
  --read-only \
  --cap-drop ALL --cap-add CHOWN --cap-add SETUID --cap-add SETGID \
  --security-opt no-new-privileges \
  --tmpfs /work:exec --tmpfs /tmp \
  assistant-runner:local
```

Send an app:

```sh
git -C path/to/app archive --format=tar.gz HEAD > app.tar.gz
curl -X POST -H 'Content-Type: application/gzip' --data-binary @app.tar.gz http://localhost:8080/api/v1/builds
```

The unit tests use a fake job, because a real job needs root and the user `app-build`:

```sh
dotnet test
```

## Scale

One pod runs one job at a time. To run N jobs at a time, the runner code does not change:

1. Make sure that the runner node pool has space for N pods, together with the Gitea CI runners.
2. In `infra/kustomize/deployment.yaml`, set `replicas: N`, and add a `topologySpreadConstraints` so that one node
   does not get all pods.
3. In the assistant, let N upgrades run at a time. The client already tries again on `503`.

The Service sends each new connection to a random pod, so a client that gets `503` must use a new connection for the
next try.

## Deploy

[`deploy-assistant-runner.yaml`](../../../.github/workflows/deploy-assistant-runner.yaml) builds the image and pushes
`infra/kustomize` as an OCI artifact. Flux applies it to the namespace `assistant-runner`, from
[`altinn-assistant-runner.yaml`](../../../infra/studio/syncroot/base/altinn-assistant-runner.yaml).
