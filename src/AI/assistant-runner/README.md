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

| Route                      | What it does                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `POST /api/v1/vms`         | Starts a VM with sshd, and answers `201` with the address and keys of the VM.        |
| `GET /api/v1/vms/{id}/ssh` | With `Upgrade: ssh`, answers `101` and then relays the connection to sshd in the VM. |
| `DELETE /api/v1/vms/{id}`  | Deletes the VM.                                                                      |
| `GET /health`              |                                                                                      |

The answer to `POST /api/v1/vms`:

```json
{
  "url": "http://<pod IP>:8080/api/v1/vms/<id>",
  "lifetimeSeconds": 780,
  "id": "<id>",
  "hostKey": "ssh-ed25519 ...",
  "clientKey": "-----BEGIN OPENSSH PRIVATE KEY-----...",
  "user": "app-build"
}
```

- `url` has the IP address of the pod, so that all calls for the VM go to the pod that has it.
- The VM makes its host key and a client key when it starts, before app code runs. The client key opens only this
  VM.
- sshd runs as `app-build` on the guest loopback, and accepts only that key. It does not forward ports.
- The runner deletes the VM after `lifetimeSeconds`, also when the client does not.
- `503` means that the pod has a VM or stops. Try again with a new connection. It does not queue.

## How the assistant runs a job

1. `POST /api/v1/vms`.
2. rsync copies the files that git tracks and the new files that git does not ignore to `/job/app`. ssh and rsync
   reach the VM through the relay, with `agents/core/ssh_proxy.py` as `ProxyCommand`.
3. ssh runs the upgrade (`studioctl app upgrade v9 -p . --json`, after a base commit) or the build
   (`dotnet build App/App.csproj -nologo -v:q --disable-build-servers`). The assistant stops it after 11 or 5 minutes.
4. For an upgrade, ssh runs `git add -A` and `git diff --cached --binary` in the VM. The assistant reads the patch
   from stdout and stops above 20 MiB. After app code runs, the assistant takes only this patch from the VM, not
   files. The upgrade tool checks the patch before it changes the session repo.
5. `DELETE /api/v1/vms/{id}`, also after an error.

## Guest image

[`Dockerfile.guest`](Dockerfile.guest) has:

- the .NET 11 SDK, for v9 apps, and the .NET 10 SDK, because studioctl-server reads projects with its MSBuild;
- git, and studioctl at a pinned version;
- the user `app-build` and the folder `/job`;
- sshd and rsync, and the environment of the jobs in `~/.ssh/environment`, because an SSH session does not get the
  environment of the image;
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
