# AGENTS.md

- `make check` runs no command in a microVM. Only the CI workflow does. If you change how a run runs, say in your
  report that only CI tests it in a microVM.
- Do not give the operator runner, the guest image or a VM a secret or a token. The operator runner is safe because it
  has nothing to steal.
- The operator runner serves one run and then exits. Do not add a queue or a second run. The core operator queues runs.
- Change the run pod only in `infra/kustomize/base/podtemplate.yaml`. The operator copies its pod spec into each Job,
  and the admission policy refuses a Job with any other pod spec.
