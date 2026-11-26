# A payment attempt holds the instance, not the payment task

- Status: Proposed
- Deciders: App backend team
- Date: 25.11.2026

## Result

A4: A user action starts an action pipeline, which holds the instance for one payment attempt.

A payment task is a user task that rests idle. `pay` starts a payment attempt: an action pipeline that creates the
payment at the payment processor, opens a mailbox and holds the instance in `processing`. Messages from the payment
processor and from the user reach the attempt through the mailbox, one at a time. The attempt ends when the process
moves on or back, or when the app releases the instance on the same task.

## Problem context

A payment is settled outside the app. The payment processor reports the outcome in a webhook, the user comes back to
the app and can cancel, and the app asks the processor for the status. In v9 these arrive as separate requests against
an idle instance, and each can race the others. The app has to order them itself with version checks, a wait for the
transition and a second try when it loses a race.

A [mailbox](../../src/App/backend/docs/service-task-pipelines.md#mailboxes-work-answered-by-a-message) orders messages
and hands them to one handler at a time, while the instance is `processing` and nothing else can write. Only a service
task can open one today. A service task holds the instance for as long as it runs.

A user can leave a payment task open for weeks. While an instance is `processing`:

- Storage refuses every other write, so the user cannot delete the instance from the inbox and the service owner
  cannot set a substatus.
- The workflow counts as active in the workflow engine.
- The mailbox lives at most 21 days, and nothing extends it.

## Decision drivers

- B1: The app decides on one event at a time, and nothing can change the instance between the decision and the
  process moving.
- B2: An instance that waits for a user stays an ordinary idle instance: the user can delete it, and it costs the
  workflow engine nothing.
- B3: The process never moves on an unpaid payment, and never leaves a paid one behind, whatever is lost or late.
- B4: No change to the workflow engine.
- B5: Nice to have: other user tasks that wait for an outside system can use the same mechanism later.

None of the alternatives adds a dependency or goes against an [architecture principle](../architecture.md).

## Alternatives considered

- A1: Settle with the payment processor before each transition, against an idle instance.
- A2: Make payment a service task with a page of its own.
- A3: Open the mailbox when the user task starts, and hold the instance for the whole stay.
- A4: A user action starts an action pipeline, which holds the instance for one payment attempt.

## Pros and cons

### A1

- Good, because it meets B2 and B4.
- Bad, because it does not meet B1. The webhook has to wait for its own transition and start over once when another
  request wins.
- Bad, because the webhook moves the process without a user, through an entry point that skips the policy check and
  the app's user actions.

### A2

- Good, because it needs no new mechanism, which meets B4. A service task can open a mailbox today, and the app
  frontend already shows a service task's own page.
- Bad, because it does not meet B2. The instance is held from the moment the task starts.
- Bad, because an idle instance in a service task means a failed one. Instances that rest on a payment task, such as
  those an earlier major version left there, would need special handling.

### A3

- Good, because it meets B1 for the whole stay.
- Bad, because it does not meet B2. A user who never pays cannot delete the instance.
- Bad, because it does not meet B4. A wait of weeks needs the workflow engine to extend or reopen a mailbox and to
  sign a parked workflow's state again.

### A4

- Good, because it meets B1 while a payment can change, and B2 the rest of the time.
- Good, because the mailbox lives as long as one checkout. The app sets a deadline of 24 hours, which meets B4.
- Good, because it meets B3. At the deadline the handler asks the payment processor, and releases the instance only
  after the processor has accepted a call that makes the payment final.
- Good, because it meets B5. A user action that starts a pipeline is not specific to payment.
- Bad, because it adds two things to the app libraries: a pipeline that a user action starts, and an ending that
  releases the instance without moving the process.
- Bad, because the user's actions during an attempt are messages with their own endpoints. `process/next` stays
  refused while the instance is `processing`.
- Bad, because an event from the payment processor that arrives with no attempt open is dropped. Every attempt
  therefore has to end with nothing pending at the processor.
