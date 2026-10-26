# AGENTS.md

Read [README.md](README.md) before changing the assistant runner. It documents the isolation model, the API and the
exit codes.

If you change how a job runs, do not rely on `make check` alone: the unit tests use no VM. Say so when you report the
change, because only the CI workflow runs a job in a microVM.

- Do not give the job host, the guest image or a VM a secret or a token. The runner is safe because it has nothing to
  steal.
- The job host serves one job request and then exits. Do not add a queue or a second job.
- Use the shared [`sandbox-host`](../../ci/sandbox-host/README.md) crate for the Provider and the image checks.
- Each Dockerfile that builds a workspace crate copies every workspace member. Add a new member to
  `Dockerfile.dockerignore` here and in `src/ci/github-runner`.

To update studioctl in the guest image, follow [docs/update-studioctl.md](docs/update-studioctl.md).
