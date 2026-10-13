# Assistant runner

A .NET service that runs `studioctl app upgrade v9` and `dotnet build` on a copy of an app, for the Studio
Assistant. The app code runs as the user `app-build`, in a Kata VM pod without secrets. The
[README](README.md) has the API, the threat model and how a job runs.

## Commands

Run these in this folder:

```sh
dotnet tool restore
dotnet csharpier format .
CI=true dotnet build
dotnet test
docker build -t assistant-runner:local -f Dockerfile .
```

`CI=true` makes the analyzer warnings errors, as in CI. The unit tests use a fake job. Test a change to the job
in the image, with the `docker run` command in the README. The workflow
[`assistant-runner-build-test.yaml`](../../../.github/workflows/assistant-runner-build-test.yaml) runs a smoke
test on the image.

## Rules

- Do not give the runner a secret or a token, and do not mount the service account token. The runner is safe
  because it has nothing to steal.
- A request cannot choose a command, an argument or an environment variable. Add a new command as a new route with
  a fixed command.
- Do not give the job a variable of the service. `JobRunner.CreateEnvironment` has the full list.
- Root does not read or write in a job folder. Root cannot: the service has no `DAC_OVERRIDE` capability. A job can
  change its files at any time, so the job user does all work in the folder.
- A job stops all processes of `app-build`. Keep one job at a time in each pod.

## Update studioctl

The `Dockerfile` pins studioctl with two values:

1. Set `STUDIOCTL_VERSION` to the new release tag, for example `v0.1.0-preview.29`.
2. Set `STUDIOCTL_INSTALL_SCRIPT_SHA256` to the SHA-256 of `install.sh` of that release:

    ```sh
    gh release download studioctl/v0.1.0-preview.29 -R Altinn/altinn-studio -p install.sh -O - | sha256sum
    ```

3. Open a PR. The smoke test upgrades the v8 template with the new version.

Renovate cannot change the version and the checksum together, so do this manually.
