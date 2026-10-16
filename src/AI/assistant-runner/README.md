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
