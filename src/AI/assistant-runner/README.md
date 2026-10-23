# Assistant runner

The assistant runner runs the v8-to-v9 upgrade with studioctl for the [Studio Assistant](../assistant/README.md). The
upgrade restores and compiles the app, and MSBuild then runs code that the app controls, for example `<Exec>` steps and
the build steps of NuGet packages. The assistant holds the model key, the Langfuse keys and the Designer and Gitea keys of each
session, so this code must not run there.

## How a job is isolated

The assistant starts one Kubernetes Job for each run. The pod of that Job runs the job host: a Rust program that uses
the [Sandbox SDK](https://github.com/digdir/digdir-agents). The job host serves one job request. It starts a new
microVM from the guest image, runs the command, answers, deletes the VM and exits. No runner pod exists between runs.

App code in a job can get:

- the files of that job;
- HTTPS to the hosts in [`ALLOWED_HOSTS`](src/policy.rs);
- the CPU, memory and disk of one VM, for the time of the job.

It cannot get:

- secrets: the guest image, the VM and the Job pod have none, and the pod has no service account token;
- other hosts: the Sandbox network layer denies all DNS, connections and HTTP requests that the allowlist does not
  allow. The network policy of the runner namespace is a second layer;
- other jobs: each job has its own pod and its own VM;
- the node: the job runs as `app-build`, not root, in a VM.

The Sandbox network layer intercepts TLS. The guest agent adds its CA to the trust store of the guest when the VM
starts.

## API

| Route                      | Command in the job                                                                         | Timeout    |
| -------------------------- | ------------------------------------------------------------------------------------------ | ---------- |
| `POST /api/v1/upgrades/v9` | `studioctl app upgrade v9 -p . --json`, then `git add -A` and `git diff --cached --binary` | 11 minutes |
| `GET /health`              |                                                                                            |            |

The job host takes one job request. The first `POST` takes it, also when the request then fails, and every later
`POST` gets 409. Each run needs a new Job.

The request body is an `application/gzip` tar of the app, without `.git`, at most 50 MiB. The assistant puts the
files that git tracks and the new files that git does not ignore in it, as they are on disk.

The answer:

```json
{ "exitCode": 0, "timedOut": false, "stdout": "...", "stderr": "...", "patch": "base64 or null" }
```

- `exitCode` is `null` when the command timed out. The timeout starts with the request.
- `patch` is the patch from the table above, as base64, because a patch can have content that is not UTF-8. Only an upgrade that did not time out has a patch. App code made the patch, so check it before you apply it.
- The runner cuts `stdout` and `stderr` at 1 MiB, and the upgrade report in `stdout` at 8 MiB. A patch above 20 MiB
  fails the job.

Other answers:

| Status | Reason                                                          |
| ------ | --------------------------------------------------------------- |
| 400    | The archive does not extract. `detail` has the error.           |
| 409    | The job host has already taken its job request.                 |
| 413    | The body is larger than 50 MiB.                                 |
| 415    | The content type is not `application/gzip`.                     |
| 500    | The VM did not start, or the job host could not make the patch. |
| 503    | The job host stops, for example because the Job was deleted.    |

## How a job runs

1. The job host starts a VM from the guest image.
2. It writes the archive to `/job/app.tar.gz`, extracts it into `/job/app`, and commits it as the base of the patch.
3. It runs the command in `/job/app` as `app-build`.
4. For an upgrade, it writes the patch to `/job/changes.patch` and reads it.
5. When the job host stops, it deletes the VM by name. It does this after every job, also after an error, a timeout,
   when the client goes away, or when the job host gets a signal.

## When the job host exits

| Exit code | When                                                                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 0         | It answered the job request, also when the command failed. The answer has the exit code of the command.                                      |
| 0         | No job request came within `REQUEST_TIMEOUT_SECONDS` after it was ready, for example because the assistant stopped.                          |
| 143       | It got SIGTERM or SIGINT, for example because the assistant deleted the Job. It cancels a running job and deletes the VM first.              |
| 1         | An error, or the VM could not be deleted. A Job pod is never restarted, so the job host clears the Provider home of the pod before it exits. |

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

A job VM needs `/dev/kvm`. To check the guest image without a VM, run the upgrade in a container:

```sh
docker build -t assistant-runner-guest:local -f Dockerfile.guest .
docker run --rm -v "$PWD/../../App/template/v8/src:/template:ro" assistant-runner-guest:local \
  sh -c 'cp -R /template app && cd app && git init -q && git add -A && git commit -qm base && studioctl app upgrade v9 -p .'
```

The workflow [`assistant-runner-build-test.yaml`](../../../.github/workflows/assistant-runner-build-test.yaml) also
runs one upgrade through the job host in a real microVM, on a GitHub runner with KVM.

## Deploy

The assistant creates one Job for each run, in the namespace `assistant-runners`. The pod runs on a node with the
label `purpose=sandbox`, and gets `/dev/kvm` from the [sandbox node plugin](../../ci/sandbox-node/README.md). The
Kubernetes manifests and the deploy workflow are not in this folder yet.
