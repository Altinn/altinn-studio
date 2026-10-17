# Assistant runner

A Rust coordinator that runs the v9 upgrade and `dotnet build` of an app in a new microVM for each job, for the
Studio Assistant. The [README](README.md) has the isolation model, the guest image and the deploy.

## Commands

Run these in this folder:

```sh
make check
lizard -l rust -C 6 -w src
```

`make check` formats, builds, lints, tests and checks the dependencies. Keep the cyclomatic complexity of a function
at 6 or less; lizard also counts the arms of a `match`, and those are allowed. The unit tests use no VM. The workflow
[`assistant-runner-build-test.yaml`](../../../.github/workflows/assistant-runner-build-test.yaml) also runs the
commands of a job in the guest image as a container.

## Rules

- Do not give the coordinator, the guest image or a VM a secret or a token. The runner is safe because it has
  nothing to steal.
- A job reaches only the hosts in `ALLOWED_HOSTS`. Change the list only in code, with a test.
- Start a new VM for each job, and delete it when the job ends, also after an error.
- Use the shared [`sandbox-host`](../../common/rust/sandbox-host/README.md) crate for the Provider and the image
  checks.
- Each Dockerfile that builds a workspace crate copies every workspace member. Add a new member to
  `Dockerfile.dockerignore` here and in `src/ci/github-runner`.

## Update studioctl

`Dockerfile.guest` pins studioctl with two values:

1. Set `STUDIOCTL_VERSION` to the new release tag, for example `v0.1.0-preview.30`.
2. Set `STUDIOCTL_INSTALL_SCRIPT_SHA256` to the SHA-256 of `install.sh` of that release:

    ```sh
    gh release download studioctl/v0.1.0-preview.30 -R Altinn/altinn-studio -p install.sh -O - | sha256sum
    ```

3. Open a PR. The smoke test upgrades the v8 template with the new version.

Renovate cannot change the version and the checksum together, so do this manually.
