# Job host

The job host runs one command on the code of an app in a new microVM, for the
[core operator](../operator/README.md). Today the only command is the v8-to-v9 upgrade with studioctl. The upgrade
restores and compiles the app, and MSBuild then runs code that the app controls, for example `<Exec>` steps and the
build steps of NuGet packages. Studio services hold model keys, session tokens and the Designer and Gitea keys, so this
code must not run in them.

Each command declares what its VM can reach and what the job host returns, so other commands can come without changes
to the protocol. [Add a command](#add-a-command) says how.

## How a run is isolated

The core operator creates one Kubernetes Job for each run, in the namespace `sandbox-runs`. The pod of that Job runs
the job host: a Rust program that uses the [Sandbox SDK](https://github.com/digdir/digdir-agents). The job host takes
one run. It starts a new microVM from the guest image, runs the command, deletes the VM, keeps the result until the
caller of the operator fetches it, and exits. No pod exists between runs.

App code in a run can get:

- the files of that run;
- HTTPS to the hosts that its command lists, from [`src/policy.rs`](src/policy.rs);
- the CPU, memory and disk of one VM, for the time of the run.

It cannot get:

- secrets: the guest image, the VM and the Job pod have none, and the pod has no service account token;
- other hosts: the Sandbox network layer denies all DNS, connections and HTTP requests that the allowlist does not
  allow. The network policy of `sandbox-runs` blocks the private address ranges, so a run cannot connect to the
  cluster, the node or the Azure services. Only this policy blocks those addresses, because the job host checks host
  names and not addresses;
- other runs: each run has its own pod and its own VM;
- the node: the command runs as `app-build`, not root, in a VM.

The Sandbox network layer intercepts TLS. The guest agent adds its CA to the trust store of the guest when the VM
starts. The network layer opens its own TLS connection to the server and verifies that the server has a valid
certificate for the host name. Thus a run can send data only to the hosts in the allowlist, also when it connects to an
address that is not theirs.

## API

The core operator is the only client, and the network policy lets only its pods reach the job host. The operator's
client follows this protocol, so change both in the same pull request.

A client names a command. It cannot send a command line. Each command is a `Spec` in [`src/run.rs`](src/run.rs):

| Command      | What runs in the VM                                               | Hosts | Report             | Patch | Timeout    |
| ------------ | ----------------------------------------------------------------- | ----- | ------------------ | ----- | ---------- |
| `upgrade-v9` | `studioctl app upgrade v9 -p . --json`, with stdout to the report | NuGet | `/job/report.json` | yes   | 11 minutes |

The run is asynchronous, so that it survives a restart of the operator. The operator keeps neither the archive nor the
result. It relays them between its caller and the job host:

1. The operator streams the archive that its caller uploads to the job host, to [start the run](#start-a-run).
2. The operator [follows the run](#follow-the-run) until the run ends.
3. When its caller fetches the result, the operator relays the request to [Fetch the result](#fetch-the-result) and its
   answer unchanged.

The operator must not fetch the result itself, because the first fetch starts the
[exit of the job host](#when-the-job-host-exits).

### Start a run

`PUT /runs/{runId}?command={command}` with the app as the body. `runId` is a UUID that the client chooses. The body is
an `application/gzip` tar of the app, without `.git`, at most 50 MiB, and it must arrive within 2 minutes.

The job host reads the whole body before the run claims the job host. If an upload stops before the end, the client can
send the archive again. The job host answers as soon as it has the archive. The VM starts, and the command runs, after
the answer.

| Status | When                                                                                                            |
| ------ | --------------------------------------------------------------------------------------------------------------- |
| 202    | The run started: `{"runId": "…", "status": "running"}`.                                                         |
| 202    | This run id claimed the job host before. The answer has the current status, and the job host discards the body. |
| 400    | The run id is not a UUID, the query has no command, or the body is not gzip.                                    |
| 404    | The job host has no such command.                                                                               |
| 408    | The body did not arrive in time.                                                                                |
| 409    | Another run id claimed the job host. Each run needs a new Job.                                                  |
| 413    | The body is larger than 50 MiB.                                                                                 |
| 415    | The content type is not `application/gzip`.                                                                     |
| 503    | The job host stops, for example because the Job was deleted.                                                    |

### Follow the run

`GET /runs/{runId}?wait={seconds}` answers with the status of the run, without its output. It waits as
[Fetch the result](#fetch-the-result) does, and answers 200 with one of these:

```json
{ "status": "running" }
{ "status": "completed", "exitCode": 0, "timedOut": false }
{ "status": "failed", "error": "..." }
```

The fields mean the same as in the result. A status read does not count as the fetch, so the operator can follow the
run with it as often as it needs to. The job host answers 404 and 400 as it does for the result.

### Fetch the result

`GET /runs/{runId}/result?wait={seconds}`. While the command runs, the job host waits up to `wait` seconds, from 0 to
30, for the end of the run. Without `wait`, it answers at once. It answers 200 with one of these:

```json
{ "status": "running" }
{ "status": "completed", "exitCode": 0, "timedOut": false, "stdout": "...", "stderr": "...", "report": {}, "patch": "base64" }
{ "status": "failed", "error": "..." }
```

- `completed` means that the command ran. The result has its exit code, also when the command failed.
  - `exitCode` is `null` when the command timed out. The timeout starts when the run starts.
  - `report` is the JSON object that the command wrote to its report file, such as the report of studioctl for
    `upgrade-v9`. Its shape belongs to the command. It is `null` when the command has no report file, or wrote no JSON
    object of at most 8 MiB to it, for example because it stopped early. The output then says why.
    [`examples/upgrade-v9-report.json`](examples/upgrade-v9-report.json) is the report of an upgrade of the v8
    template.
  - `patch` is the changes of the command to the app, as base64, because a patch can have content that is not UTF-8.
    It is `null` when the command does not change the app, or timed out. The job host [checks the patch](#the-patch)
    first.
  - The job host cuts `stdout` and `stderr` at 1 MiB.
- `failed` means that the job host could not run the command: the archive does not extract, the VM did not start,
  the patch is larger than 20 MiB, git could not make it or the job host refused it, or the job host stopped during
  the run. `error` says which.

The job host answers 404 when this run id has not claimed it, and 400 when `wait` is not a number from 0 to 30.

The first answer with a `completed` or `failed` result counts as the fetch. A later request gets the same answer until
the job host exits.

`GET /health` answers 200 when the job host is ready for a run. The readiness probe of the pod uses it.

## How a run runs

1. The job host starts a VM from the guest image, with the hosts of the command.
2. It writes the archive to `/job/app.tar.gz`, extracts it into `/job/app`, and commits it as the base of the patch.
3. It runs the script of the command in `/job` as `app-build`.
4. It reads the report file of the command, if the command has one.
5. If the command changes the app, it writes the patch with `git diff --cached --binary --no-renames` to
   `/job/changes.patch`, reads it and checks it.
6. It deletes the VM by name, and then keeps the result. If the delete fails, the job host tries again before it
   exits.

The run does not depend on the request that started it. A client that goes away, or an operator that restarts, does
not stop the run.

### The patch

App code ran in the VM and could have written the patch file, so [`src/patch.rs`](src/patch.rs) reads it as untrusted
input. It accepts only the format that `git diff` writes there, because `git apply` could read another line as one
more change. It refuses a patch that adds or changes:

- a symbolic link or a submodule, which can send `git apply` and the later steps of the client out of the repository;
- a file in `.github/` or `.gitea/`, because CI workflows run with the secrets of the repository;
- a `.gitattributes` or `.gitmodules` file, which changes what git does with the other files;
- a path outside the app.

A client applies the patch with `git apply`, which also refuses paths outside the repository and in `.git`.

## When the job host exits

After the run, the job host keeps the result for the caller of the operator:

- After the first fetch, the job host keeps the result for 30 seconds, so that a caller whose answer did not arrive
  can fetch it again.
- If no caller fetches the result within `RESULT_RETENTION_SECONDS` after the run ended, the job host stops waiting.
  A status read does not count as a fetch.

| Exit code | When                                                                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 0         | A caller fetched the result, and 30 seconds passed. This is also true when the result is `failed`, or when the command failed.               |
| 0         | No caller fetched the result within `RESULT_RETENTION_SECONDS` after the run ended, for example because the caller went away.                |
| 0         | No run claimed the job host within `REQUEST_TIMEOUT_SECONDS` after it was ready. An archive that arrives at that time can still claim it.    |
| 143       | It got SIGTERM or SIGINT, for example because the operator deleted the Job. It stops a running command and deletes the VM first.             |
| 1         | An error, or the VM could not be deleted. A Job pod is never restarted, so the job host clears the Provider home of the pod before it exits. |

The [PodTemplate](infra/kustomize/base/podtemplate.yaml) sets both times, and the size of the VM. The operator gives its
caller 5 minutes to upload the archive, from when the operator sees that the pod is ready. `REQUEST_TIMEOUT_SECONDS` is
a minute longer, because the operator can take up to a minute to see that the pod is ready. The operator gives its
caller `RESULT_RETENTION_SECONDS` to fetch the result.

## Guest image

[`Dockerfile.guest`](Dockerfile.guest) has:

- the .NET 11 SDK, for v9 apps, and the .NET 10 SDK, because studioctl-server reads projects with its MSBuild;
- git, and studioctl at a pinned version;
- the user `app-build` and the folder `/job`;
- the environment of the commands. `NUGET_CERT_REVOCATION_MODE=offline` is necessary, because the allowlist blocks the
  certificate revocation servers.

### Update studioctl

`Dockerfile.guest` pins studioctl with two values. Renovate cannot change them together, so update them manually:

1. Set `STUDIOCTL_VERSION` to the new release tag, for example `v0.1.0-preview.30`.
2. Set `STUDIOCTL_INSTALL_SCRIPT_SHA256` to the SHA-256 of `install.sh` of that release:

   ```sh
   gh release download studioctl/v0.1.0-preview.30 -R Altinn/altinn-studio -p install.sh -O - | sha256sum
   ```

3. Open a pull request. CI upgrades the v8 template with the new version in a microVM.

## Add a command

1. Add a `Spec` and a variant of `Command` in [`src/run.rs`](src/run.rs). The spec has the script, the timeout, the
   output limits, the hosts, whether the command changes the app, and the report file.
2. If the command needs other tools, make a guest image and a `PodTemplate` for it. The kind in the core operator
   names the `PodTemplate` and the command together. Add the `PodTemplate` to `resourceNames` in
   [`role.yaml`](infra/kustomize/base/role.yaml), and give it its own binding in
   [`admission-policy.yaml`](infra/kustomize/base/admission-policy.yaml). The one binding there compares every Job of
   the operator with `job-host`, so each binding must then match only the Jobs of its own `PodTemplate`.
3. Add a kind in the [operator's configuration](../operator/README.md#develop) for each environment.

The job host does not interpret the report: the shape of each report belongs to its command and the callers of the
kind.

## Change the allowed hosts

Add the host to the list of the command in [`src/policy.rs`](src/policy.rs), and add a test case. An app that uses a
private NuGet feed fails until its host is on the list.

## Develop

The job host uses the shared [`sandbox-host`](../../ci/sandbox-host/README.md) crate for the Provider and the image
checks. See the [`Makefile`](Makefile) for the commands. The unit tests use a fake in place of the VM, so they need no
KVM:

```sh
make check
```

A VM needs `/dev/kvm`. To check the guest image without a VM, run the upgrade in a container:

```sh
docker build -t job-host-guest:local -f Dockerfile.guest .
docker run --rm -v "$PWD/../../App/template/v8/src:/template:ro" job-host-guest:local \
  sh -c 'cp -R /template app && cd app && git init -q && git add -A && git commit -qm base && studioctl app upgrade v9 -p .'
```

The workflow [`core-job-host-build-test.yaml`](../../../.github/workflows/core-job-host-build-test.yaml) also runs one
upgrade through the job host in a real microVM, on a GitHub runner with KVM. Its steps show how to start the job host
in a container and call it with `curl`.

## Deploy

[`infra/kustomize`](infra/kustomize) has the namespace `sandbox-runs`, and what the core operator needs to start
runs in it:

- `podtemplate.yaml`: the pod of each run Job.
- `role.yaml` and `rolebinding.yaml`: the ServiceAccount of the operator can read the PodTemplate, create, follow and
  delete Jobs, and read their pods. It cannot create pods or change Jobs.
- `admission-policy.yaml`: a Job from the operator must have the pod of the PodTemplate, `backoffLimit: 0`, an
  `activeDeadlineSeconds` of at most 1800 seconds, and a TTL. The deadline must cover the upload of the caller, the
  run and the time that the job host keeps the result.
- `resourcequota.yaml`: the cap on runs at the same time, 2 in dev and 4 in prod. The operator queues runs below this
  cap. The quota is the backstop.
- `networkpolicy.yaml`: only the operator pods can reach a run pod, and a run pod can reach only DNS and the internet
  on port 443.

[`deploy-core-job-host.yaml`](../../../.github/workflows/deploy-core-job-host.yaml) builds the guest image, the job
host image and the prepared guest image, pins them by digest in the PodTemplate, and pushes `infra/kustomize` as an
OCI artifact. Flux applies it in dev and prod, from `infra/studio/syncroot/base/studio-job-host.yaml`. Staging has no
sandbox node, so it has no job host.

The pod runs on a node with the label `purpose=sandbox`, and gets `/dev/kvm` from
[`sandbox-node`](../../ci/sandbox-node/README.md).
