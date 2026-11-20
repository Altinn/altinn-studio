# process-transition-test

The app that the App frontend's
[workflow status tests](../../../App/frontend/test/e2e/integration/process-transition-test) run against the real
workflow engine. It covers the `workflow` annotation on process reads, and the App frontend's views for a
waiting or failed service task.

The process runs `Task_1` (data), then on the `postCommit` path `Task_Service` or `Task_ServiceLayout` (service
tasks), then `Task_2` (data). Rejecting `Task_2` goes back to `Task_1`. `Task_1` is a form of levers that decide what happens on the way to
`Task_2`: where a scenario runs, delays, failed attempts, deferrals, how the last attempt ends, and whether the service
task has a layout of its own. [TransitionControl.cs](App/models/TransitionControl.cs) describes each lever.

A test can hold an instance at the first step of the service task with
`PUT /{org}/{app}/test/service-task-gates/{instanceGuid}`, and release it with `DELETE` on the same URL, so that its
assertions on the waiting view do not race the task's completion. A test releases the instance in its cleanup when an
assertion fails.

## Scenarios

The [workflow engine's technical guide](../../../Runtime/workflow-engine/docs/technical-guide.md#deferral-durable-yield)
explains deferral, wait budgets, nudge and resume. With `path` set to `postCommit`:

- `deferrals: 3` defers the service task three times before it succeeds. The frontend shows the loading view, or the
  app's own layout with `serviceView: layout`, and follows the process to `Task_2`. The reason the task gives travels
  to the engine step, the process read and the engine's dashboard.
- `endState: waitExpired` defers until the 30-second wait budget runs out, and the engine fails the task with
  `wait_expired`.
- `endState: failureThenSuccess` fails once. «Prøv igjen» resumes the process, and the next attempt succeeds.
- `endState: failure` with `serviceView: layout` shows the failure view, even though the task has a layout.

## Running locally

Start the App frontend's dev server with `yarn start --host 0.0.0.0`, then:

```sh
studioctl env up
studioctl run --mode process --dev-frontend --path src/test/apps/process-transition-test
```

The app is at <http://local.altinn.cloud:8000/ttd/process-transition-test/>.
