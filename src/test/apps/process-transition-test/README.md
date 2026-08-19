# process-transition-test

Fixture app for exercising the **live workflow-status state machine** (`workflow` annotation on
process reads) and the **service-task views** (waiting / custom layout / recoverable failure) in
the app frontend. Task_1 is a form of "levers" that two app hooks read to control the forward
transition; the workflow-status e2e suite (`test/e2e/integration/process-transition-test/`)
drives the real workflow engine through this app.

Process shape: `Task_1 (data) → gateway → [Task_Service | Task_ServiceLayout (service task) →
gateway →] Task_2 (data) → gateway → EndEvent`, where reject actions route backwards to Task_1.

## Levers (on Task_1)

| Lever               | Values                                                       | Meaning                                                                                                                                                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `path` («Scenario») | `none` / `preCommit` / `postCommit`                          | Where in the transition the scenario runs: nowhere (straight to Task_2), in the task-ending hook before the Storage commit (committed task stays Task_1), or in the service task after it. The other levers decide what actually happens there.                                                                                        |
| `delayMs`           | 0 / 3000 / 8000 / 15000 / 30000                              | Delay injected on every attempt.                                                                                                                                                                                                                                                                                                       |
| `attempts`          | 1 / 2 / 3 / 5                                                | Engine attempts; every attempt but the last fails retryably (auto-retried), the last settles on `endState`.                                                                                                                                                                                                                            |
| `endState`          | `success` / `failure` / `failureThenSuccess` / `waitExpired` | What the last attempt does. `waitExpired` never settles at all: the task defers forever until the step's wait budget runs out and the engine fails it with `wait_expired`. `failureThenSuccess` fails terminally once but keeps the attempt counter, so a resume-driven replay succeeds.                                               |
| `advance`           | `auto` / `park` / `parkThenRelease`                          | After a successful settle: auto-advance to Task_2; **park** — the process stays on the service task until an out-of-band `process/next`; or park and let the app's own background task release it after ~5s (an external callback arriving on its own).                                                                                |
| `deferrals`         | `0` / `1` / `3`                                              | How many times the service task **defers** before settling — "ran fine, the outcome isn't here yet". The engine parks the workflow in `Waiting` and re-runs the task itself. Not the same as `attempts`, which forces retryable _failures_: a deferral records no error and resets the retry counter. Only meaningful on `postCommit`. |
| `deferDelayMs`      | `2000` / `5000`                                              | How long the engine waits between deferrals. The task picks this per re-check; the step's wait budget caps the sum.                                                                                                                                                                                                                    |
| `serviceView`       | `default` / `layout`                                         | Which service task the postCommit path routes through: `Task_Service` (frontend's built-in waiting/failure views) or `Task_ServiceLayout` (has a ui folder — the app's custom layout renders instead, with the same follow-the-process behavior).                                                                                      |

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
- **Durable yield (deferral):** `postCommit` + `deferrals: 3` → submit Task_1. The service task
  answers "not ready yet" three times; the workflow sits in the engine's non-terminal `Waiting`
  status between checks, holding no worker and no lease, then settles and advances on its own.
  Compare with `advance: park` above: both leave you on the service task, and they are opposites
  underneath. A parked task has **succeeded** — its workflow is settled, and only an out-of-band
  `process/next` moves it — whereas a deferring task is **still running** and the engine resumes it
  on its own timer. On the default view the UI follows that difference: parked shows the
  service-task waiting view («Vi behandler forespørselen din»), deferring shows the ordinary
  advancing view («Vi jobber med skjemaet ditt»). With `serviceView: layout` the two are
  deliberately identical: the app's own page owns the waiting presentation for both. A lost
  external signal strands the first and merely delays the second.
- **Why is it waiting?** while a deferral is parked, the task's own reason (this app passes one on
  every `Defer`) travels all the way out: `lastDeferReason` on the engine step, `waitingReason` on
  the collection head and on the app's `workflow` process-read annotation, and the dashboard card.
- **Accelerating a wait:** the same, plus a nudge —
  `POST {engine}/api/v1/ttd%2Fprocess-transition-test/workflows/{workflowId}/nudge` (or the
  dashboard's «check now» button) clears the pending wait so the next check happens immediately
  instead of when the timer elapses. The task still decides for itself whether the outcome is
  ready, so nudging early is safe.
- **Wait budget expiry:** `postCommit` + `endState: waitExpired` → the task defers forever. After
  `ScenarioServiceTask.ScenarioWaitBudget` (30s — production budgets are hours or days) the engine
  gives up and fails the step with `wait_expired`, which the frontend renders as the recoverable
  failure view. Note the distinct failure reason: nothing broke, the awaited outcome simply never
  arrived, which is why `wait_expired` is kept out of the default ops alert.
- **State across checks:** a deferring task's data changes are saved on every attempt that makes
  them, and the next attempt sees them — the instance is where a polling task remembers what it
  learned. `context.Wait.DeferCount` and `context.Wait.Deadline` tell it which check it is on and how
  much budget is left.
- **Recoverable failure:** `postCommit` + `endState: failureThenSuccess` → the failure view with
  «Prøv igjen» (POST `process/resume`) and «Gå tilbake» (reject → Task_1).
- **Failure beats layout:** `postCommit` + `serviceView: layout` + `endState: failure` → the
  failure view renders even though the task has a custom layout.

## Releasing a parked service task

A parked task advances on any authorized `process/next`. From the browser devtools console on the
waiting page:

```js
const [root, rest] = location.href.split('/instance/');
await fetch(
  `${root}/instances/${rest.split('/').slice(0, 2).join('/').split(/[?#]/)[0]}/process/next`,
  {
    method: 'PUT',
    headers: { 'X-XSRF-TOKEN': document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '' },
  },
);
```

The e2e suite does the same via the existing `cy.moveProcessNext()` command.

## Running locally

```bash
studioctl env up
# serve the dev frontend on :8080 (from src/App/frontend): yarn build && yarn serve -p 8080
studioctl run --mode process --dev-frontend --path src/test/apps/process-transition-test
# → http://local.altinn.cloud:8000/ttd/process-transition-test/
```
