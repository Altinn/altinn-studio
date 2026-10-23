# Assistant runner

A Rust job host that runs one v9 upgrade or `dotnet build` of an app in a new microVM for the Studio Assistant, and
then exits. The assistant starts one Kubernetes Job for each run. The [README](README.md) has the isolation model, the
API, the exit codes and the guest image.

## Commands

Run these in this folder:

```sh
make check
lizard -l rust -C 6 -w src
```

`make check` formats, builds, lints, tests and checks the dependencies. Keep the cyclomatic complexity of a function
at 6 or less; lizard also counts the arms of a `match`, and those are allowed. The unit tests use no VM; the README
says what CI runs with one.

## Rules

- Do not give the job host, the guest image or a VM a secret or a token. The runner is safe because it has nothing
  to steal.
- The job host serves one job request and then exits. Do not add a queue or a second job; each run gets a new Job.
- Use the shared [`sandbox-host`](../../ci/sandbox-host/README.md) crate for the Provider and the image
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
