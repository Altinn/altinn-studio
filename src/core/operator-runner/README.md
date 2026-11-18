# Operator runner

The operator runner runs one command on the code of an app in a new microVM, for the core operator. Today the only
command is the v8-to-v9 upgrade with studioctl. The upgrade restores and compiles the app, so MSBuild runs code that the
app controls, such as `<Exec>` steps and the build steps of NuGet packages. Studio services hold model keys, session
tokens and the Designer and Gitea keys, so this code must not run in them.

Each command declares what its VM can reach and what the operator runner returns, so a new command needs no change to
the protocol. [Add a command](#add-a-command) says how.

## How a run is isolated

The core operator creates one Kubernetes Job for each run, in the namespace `core-operator-runners`. The pod of that Job
runs the operator runner, a Rust program that uses the [Sandbox SDK](https://github.com/digdir/digdir-agents). The
operator runner takes one run. It runs the command in a new microVM, deletes the VM, keeps the result until the caller
of the operator fetches it, and exits.

App code in a run can get:

- the files of that run
- HTTPS to the hosts that its command lists in [`src/policy.rs`](src/policy.rs)
- the CPU, memory and disk of one VM, for the time of the run

It cannot get:

- Secrets. The guest image, the VM and the pod have none, and the pod has no service account token.
- Other hosts. The Sandbox network layer denies DNS, connections and HTTP requests outside the allowlist. It checks
  host names, not addresses, so only the [network policy](infra/kustomize/base/networkpolicy.yaml) keeps a run from the
  cluster, the node and the Azure services.
- Other runs. Each run has its own pod and its own VM.
- The node. The command runs as `app-build`, not root, in a VM.

The Sandbox network layer intercepts TLS, and the guest trusts its CA. The network layer opens its own TLS connection
and verifies the certificate of the server for the host name. So a run can send data only to the hosts in the
allowlist, also when it connects to an address that is not theirs.

## API

The core operator is the only client, and the network policy lets only its pods reach the operator runner.
[`examples/protocol.json`](examples/protocol.json) has an example of each answer that the operator reads. The route
tests check that the operator runner gives these answers, and the core operator's tests check that its client reads its
fake operator runner the same way. Change the examples together with both sides. The two deploy separately, so a change
must also work with the previous version of the other side.

A client names a command from [`src/run.rs`](src/run.rs). It cannot send a command line.

The run survives a restart of the operator. The operator follows the run with status reads, and relays the fetch of the
result from its caller. It must not fetch the result itself, because the first fetch starts the
[exit of the operator runner](#when-the-operator-runner-exits).

### Start a run

`PUT /runs/{runId}?command={command}&timeout={seconds}` with the app as the body: an `application/gzip` tar, without
`.git`, of at most 50 MiB. The body must arrive within 2 minutes. The client chooses `runId`, a UUID. The run has its
result at most `timeout` seconds after it starts. The command stops a minute before, to leave time for the report and
the patch.

The operator runner answers 202 as soon as it has the whole body, and then starts the VM. The first run id that sends a
whole body claims the operator runner, so a client can send the archive again after an upload that broke off. A repeat
of the run id that claimed it answers 202 with the current status, and the operator runner discards the body. Another
run id gets 409, because each run needs a new Job.

Other errors are RFC 9457 problem details with a 4xx status, or 503 when the operator runner stops.
[`src/routes.rs`](src/routes.rs) has each one.

### Read the run

`GET /runs/{runId}/result` answers 200 with the result of the run. `GET /runs/{runId}` answers 200 with its status: the
result without `stdout`, `stderr`, `report` and `patch`. While the command runs, both wait up to `wait` seconds, from 0
to 30, for the end of the run. Without `wait`, they answer at once. Both answer 404 when this run id has not claimed the
operator runner.

```json
{ "status": "running" }
{ "status": "completed", "exitCode": 0, "timedOut": false, "stdout": "...", "stderr": "...", "report": {}, "patch": "base64" }
{ "status": "failed", "error": "..." }
```

- `completed` means that the command ran. `exitCode` is its exit code, also when the command failed, and `null` when
  the command timed out.
  - `report` is the JSON object that the command wrote to its report file, such as the report of studioctl for
    `upgrade-v9` ([example](examples/upgrade-v9-report.json)). Its shape belongs to the command. It is `null` when the
    command has no report file, or wrote no JSON object of at most 8 MiB to it. The output then says why.
  - `patch` is the changes of the command to the app, as base64, because a patch can have bytes that are not UTF-8. It
    is `null` when the command does not change the app, or timed out. The operator runner
    [checks the patch](#the-patch) first.
  - The operator runner cuts `stdout` and `stderr` at 1 MiB.
- `failed` means that the operator runner could not run the command, and `error` says why. For example, the archive
  does not extract, the VM did not start, or the patch is larger than 20 MiB or refused.

A status read does not count as the fetch, so the operator can follow the run with it. The first result that is
`completed` or `failed` counts as the fetch. A later request gets the same answer until the operator runner exits.

`GET /health` answers 200 for the readiness probe of the pod.

## How a run runs

The operator runner starts a VM from the guest image, with the hosts of the command. It extracts the archive into
`/job/app` and commits it as the base of the patch. Then it runs the command in `/job` as `app-build`, and reads the
report file and the patch. It deletes the VM before it keeps the result. If the delete fails, it tries again before it
exits.

### The patch

App code ran in the VM and could have written the patch file, so [`src/patch.rs`](src/patch.rs) reads it as untrusted
input. It accepts only the format that `git diff` writes, and refuses the changes that no command makes, such as
symbolic links, submodules, CI workflows and git attribute files. The module says why for each. A client applies the
patch with `git apply`, which also refuses paths outside the repository and in `.git`.

## When the operator runner exits

After the run, the operator runner keeps the result for the caller of the operator. It exits with:

- 0 `RESULT_GRACE_SECONDS` after the first fetch, so that a caller whose answer did not arrive can fetch it again. This
  is also true when the run failed.
- 0 when no caller fetched the result within `RESULT_RETENTION_SECONDS` after the run ended.
- 0 when no run claimed it within `REQUEST_TIMEOUT_SECONDS` after it was ready. An archive that arrives at that time
  can still claim it.
- 143 on SIGTERM or SIGINT, for example when the operator deletes the Job. It stops a running command and deletes the
  VM first.
- 1 on an error, or when it could not delete the VM. Kubernetes never restarts a Job pod, so the operator runner clears
  the Provider home of the pod first.

The [PodTemplate](infra/kustomize/base/podtemplate.yaml) sets these times and the size of the VM.

## Guest image

[`Dockerfile.guest`](Dockerfile.guest) has the tools of the commands and the user `app-build`. Its comments say why
each part is there, and how to update studioctl.

## Add a command

1. Add a `Spec` and a variant of `Command` in [`src/run.rs`](src/run.rs).
2. If the command needs other tools, make a guest image and a `PodTemplate` for it. The kind in the core operator names
   the `PodTemplate` and the command together. Add the `PodTemplate` to `resourceNames` in
   [`role.yaml`](infra/kustomize/base/role.yaml), and give it its own binding in
   [`admission-policy.yaml`](infra/kustomize/base/admission-policy.yaml). The one binding there compares every Job of
   the operator with `operator-runner`, so each binding must then match only the Jobs of its own `PodTemplate`.
3. Add a kind with the command's `runTimeout` to the configuration of the operator for each environment.

## Change the allowed hosts

Add the host to the list of the command in [`src/policy.rs`](src/policy.rs), and add a test case. An app that uses a
private NuGet feed fails until its host is on the list.

## Develop

The operator runner uses the shared [`sandbox-hosting`](../../ci/sandbox-hosting/README.md) crate for the Provider and
the image checks. The [`Makefile`](Makefile) has the commands. The unit tests use a fake in place of the VM, so they
need no KVM:

```sh
make check
```

A VM needs `/dev/kvm`. To check the guest image without a VM, run the upgrade in a container:

```sh
docker build -t operator-runner-guest:local -f Dockerfile.guest .
docker run --rm -v "$PWD/../../App/template/v8/src:/template:ro" operator-runner-guest:local \
  sh -c 'cp -R /template app && cd app && git init -q && git add -A && git commit -qm base && studioctl app upgrade v9 -p .'
```

The workflow [`core-operator-runner-build-test.yaml`](../../../.github/workflows/core-operator-runner-build-test.yaml)
runs one upgrade through the operator runner in a real microVM, on a GitHub runner with KVM. Its steps show how to start
the operator runner in a container and call it with `curl`.

## Deploy

[`infra/kustomize`](infra/kustomize) has the namespace `core-operator-runners`, and what the core operator needs to
start runs in it. Each file says why it is there.

[`deploy-core-operator-runner.yaml`](../../../.github/workflows/deploy-core-operator-runner.yaml) builds the guest
image, the operator runner image and the prepared guest image. It pins them by digest in the PodTemplate, and pushes
`infra/kustomize` as an OCI artifact. Flux applies it in each environment with sandbox nodes, from
[`operator-runner.yaml`](../../../infra/studio/syncroot/base/operator-runner.yaml). There, the pod gets
`/dev/kvm` from [`sandbox-node`](../../ci/sandbox-node/README.md).
