# AGENTS.md

- If you change how a run runs, do not rely on `make check` alone, because the unit tests use a fake in place of the
  VM. Say so when you report the change. Only the CI workflow runs a command in a microVM.
- Do not give the operator runner, the guest image or a VM a secret or a token. The operator runner is safe because it
  has nothing to steal.
- The operator runner serves one run and then exits. Do not add a queue or a second run. The core operator queues runs.
- Change the run pod only in `infra/kustomize/base/podtemplate.yaml`. The operator copies its pod spec into each Job,
  and the admission policy refuses a Job with any other pod spec.
