# process-transition-test

Fixture app for exercising the **live workflow-status state machine** (`workflow` annotation on
process reads) and the **service-task views** (waiting / custom layout / recoverable failure) in
the app frontend. Task_1 is a form of "levers" that two app hooks read to control the forward
transition; the workflow-status e2e suite (`test/e2e/integration/process-transition-test/`)
drives the real workflow engine through this app.

Process shape: `Task_1 (data) → gateway → [Task_Service | Task_ServiceLayout (service task) →
gateway →] Task_2 (data) → gateway → EndEvent`, where reject actions route backwards to Task_1.

## Levers (on Task_1)

| Lever         | Values                                      | Meaning                                                                                                                                        |
| ------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `path` («Scenario») | `none` / `preCommit` / `postCommit`   | Where in the transition the scenario runs: nowhere (straight to Task_2), in the task-ending hook before the Storage commit (committed task stays Task_1), or in the service task after it. The other levers decide what actually happens there. |
| `delayMs`     | 0 / 3000 / 8000 / 15000 / 30000             | Delay injected on every attempt.                                                                                                               |
| `attempts`    | 1 / 2 / 3 / 5                               | Engine attempts; every attempt but the last fails retryably (auto-retried), the last settles on `endState`.                                    |
| `endState`    | `success` / `failure` / `failureThenSuccess` | What the last attempt does. `failureThenSuccess` fails terminally once but keeps the attempt counter, so a resume-driven replay succeeds.      |
| `advance`     | `auto` / `park` / `parkThenRelease`         | After a successful settle: auto-advance to Task_2; **park** — the process stays on the service task until an out-of-band `process/next`; or park and let the app's own background task release it after ~5s (an external callback arriving on its own). |
| `serviceView` | `default` / `layout`                        | Which service task the postCommit path routes through: `Task_Service` (frontend's built-in waiting/failure views) or `Task_ServiceLayout` (has a ui folder — the app's custom layout renders instead, with the same follow-the-process behavior). |

`delayMs`, `attempts`, `endState`, `advance` and `serviceView` only matter on an error/service
path and are hidden while `path` is `none`; `advance`/`serviceView` further apply only to
`postCommit` (the service-task path).

## Scenarios worth trying

- **Waiting step (#18935):** `postCommit` + `advance: park` → submit Task_1. The transition
  commits, the service task succeeds without advancing, and the frontend shows the built-in
  waiting view (spinner + «Vi behandler forespørselen din»), polling underneath. Release it (see
  below) and the page navigates to Task_2 on its own. Survives a refresh.
- **Self-releasing wait:** `postCommit` + `advance: parkThenRelease` → the same, but hands-free:
  the app's `ParkedTaskReleaser` waits ~5s and drives an authorized `process/next` itself, using a
  service-owner (org) token against the public app URL — like the Maskinporten-authenticated
  callback a real external integration would send. Watch the waiting view carry you to Task_2
  with no interaction.
- **Custom waiting layout:** same, plus `serviceView: layout` → the app's own
  `Task_ServiceLayout` page renders instead of the built-in view; auto-navigation still applies.
- **Recoverable failure:** `postCommit` + `endState: failureThenSuccess` → the failure view with
  «Prøv igjen» (POST `process/resume`) and «Gå tilbake» (reject → Task_1).
- **Failure beats layout:** `postCommit` + `serviceView: layout` + `endState: failure` → the
  failure view renders even though the task has a custom layout.

## Releasing a parked service task

A parked task advances on any authorized `process/next`. From the browser devtools console on the
waiting page:

```js
const [root, rest] = location.href.split('/instance/');
await fetch(`${root}/instances/${rest.split('/').slice(0, 2).join('/').split(/[?#]/)[0]}/process/next`, {
  method: 'PUT',
  headers: { 'X-XSRF-TOKEN': document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '' },
});
```

The e2e suite does the same via the existing `cy.moveProcessNext()` command.

## Running locally

```bash
studioctl env up
# serve the dev frontend on :8080 (from src/App/frontend): yarn build && yarn serve -p 8080
studioctl run --mode process --dev-frontend --path src/test/apps/process-transition-test
# → http://local.altinn.cloud:8000/ttd/process-transition-test/
```
