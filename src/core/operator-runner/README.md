# Operator runner

The operator runner runs one command on the code of an app in a new microVM, for the core operator. Today the only
command is the v8-to-v9 upgrade with studioctl. The upgrade restores and compiles the app, so MSBuild runs code that the
app controls, such as `<Exec>` steps and NuGet build steps. Studio services hold model keys, session tokens and the
Designer and Gitea keys, so this code must not run in them. Each command declares what its VM can reach and what the
operator runner returns, so [a new command](#add-a-command) needs no change to the protocol.

## How a run is isolated

The core operator creates one Kubernetes Job for each run, in the namespace `core-operator-runners`. Its pod runs the
operator runner, a Rust program on the [Sandbox SDK](https://github.com/digdir/digdir-agents). It takes one run, runs
the command in a new microVM, deletes the VM, keeps the result until the operator's caller fetches it, and exits.

App code in a run gets the files of the run, the CPU, memory and disk of one VM ([why this size](docs/vm-size.md)), and
HTTPS to the hosts that its command lists in [`src/policy.rs`](src/policy.rs). Add a host there with a test case. An
app that uses a private NuGet feed fails until its host is on the list. App code cannot get:

- Secrets. The guest image, the VM and the pod have none, and the pod has no service account token.
- Other hosts. The Sandbox network layer denies DNS, connections and HTTP requests outside the allowlist. The guest
  trusts its CA for TLS, and the layer checks the certificate of the server for the host name, so a run reaches only
  allowed hosts, also at an address that is not theirs. The layer checks names, not addresses, so only the
  [network policy](infra/kustomize/base/networkpolicy.yaml) keeps a run from the cluster, the node and Azure services.
- Other runs or the node. Each run has its own pod and VM, and the command runs as `app-build`, not root.

## API

The core operator is the only client, and the network policy lets only its pods reach the operator runner. The route
tests and the operator's client tests both check [`examples/protocol.json`](examples/protocol.json), so change it with
both sides. They deploy separately, so a change must also work with the previous version of the other side. A run
survives a restart of the operator, which follows it with status reads and relays its caller's fetch of the result.

[`src/routes.rs`](src/routes.rs) has the routes and their limits, and [`src/protocol.rs`](src/protocol.rs) has the
answers and their fields.

- The client chooses the run id. The first run id that sends a whole archive claims the operator runner, so a client
  can send the archive again after an upload that broke off. A repeat of that run id gets the status of the run.
  Another run id gets 409, because each run needs a new Job.
- The client names a command from [`src/run.rs`](src/run.rs), not a command line, and sends the timeout of the run. The
  command stops a minute before the end of the timeout, to leave time for the report and the patch. The operator
  runner then deletes the VM, so the result can come up to about a minute after the timeout.
- A status read does not count as the fetch, so the operator can follow the run. The first result with the end of the
  run counts, and starts the [exit of the operator runner](#when-the-operator-runner-exits).

## How a run runs

The operator runner starts a VM from the guest image, [`Dockerfile.guest`](Dockerfile.guest), with the hosts of the
command. It extracts the archive into `/job/app`, commits it as the base of the patch, runs the command in `/job` as
`app-build`, and reads the report file and the patch. It deletes the VM before it keeps the result, and tries again
before it exits if the delete fails.

### The patch

App code ran in the VM and could have written the patch file, so [`src/patch.rs`](src/patch.rs) reads it as untrusted
input. It accepts only the format that `git diff` writes, and refuses the changes that no command makes, such as
symbolic links, submodules, CI workflows and git attribute files. The module says why for each. A client applies the
patch with `git apply`, which also refuses paths outside the repository and in `.git`.

## When the operator runner exits

The operator runner exits with 0 when a client fetched the result and the grace passed, when no client fetched the
result in time, or when no run claimed it in time. The [PodTemplate](infra/kustomize/base/podtemplate.yaml) sets these
times. A signal, such as when the operator deletes the Job, stops the command, and the operator runner deletes the VM
before it exits. Kubernetes never restarts a Job pod, so the operator runner clears the Provider home of the pod when
it starts.

## Add a command

1. Add a `Spec` and a variant of `Command` in [`src/run.rs`](src/run.rs).
2. If the command needs other tools, make a guest image and a `PodTemplate` for it. Add the `PodTemplate` to
   `resourceNames` in [`role.yaml`](infra/kustomize/base/role.yaml), and give it its own binding in
   [`admission-policy.yaml`](infra/kustomize/base/admission-policy.yaml). The one binding there compares every Job of
   the operator with `operator-runner`, so each binding must match only the Jobs of its own `PodTemplate`.
3. Add a kind with the command, its `PodTemplate` and its `runTimeout` to the configuration of the operator for each
   environment.

## Develop and deploy

`make check` runs the unit tests, which use a fake in place of the VM and need no KVM. The workflow
[`core-operator-runner-build-test.yaml`](../../../.github/workflows/core-operator-runner-build-test.yaml) runs one
upgrade in a real microVM on a GitHub runner with KVM, and its steps show how to start and call the operator runner.
The shared [`sandbox-hosting`](../../ci/sandbox-hosting/README.md) crate has the Provider and the image checks.

[`deploy-core-operator-runner.yaml`](../../../.github/workflows/deploy-core-operator-runner.yaml) builds the images for
each change and each studioctl release, pins them by digest in the PodTemplate, and pushes
[`infra/kustomize`](infra/kustomize) as an OCI artifact. Each file there says why it is there. Flux applies it in each
environment with sandbox nodes, from [`operator-runner.yaml`](../../../infra/studio/syncroot/base/operator-runner.yaml).
There, the pod gets `/dev/kvm` from [`sandbox-node`](../../ci/sandbox-node/README.md).
