# Keep the instance id as the eFormidling shipment id

- Status: Accepted
- Deciders: Daniel Skovli
- Date: 24.07.2026

## Result

A1: The eFormidling message/shipment id remains the instance guid. Idempotency is achieved around
the fixed id: duplicate-create self-healing in `DefaultEFormidlingService`, plus a
shipment-ownership claim (`eFormidlingShipmentWorkflowId` instance data value) gating
`EFormidlingServiceTask`.

Later note (Aug 2026): driver B5 - "no changes to the status-check event loop" - lapsed in #19827,
which deleted that loop and moved the delivery wait into the service task. The decision itself is
unaffected: the poll queries status by the same instance guid, so *shipment id == instance id* remains
the only correlation the app keeps, and both idempotency layers survive the move unchanged.

## Problem context

The app sends eFormidling shipments with the instance guid as the message id
(`DocumentIdentification.InstanceIdentifier`, and the id used for attachment upload, send, and
status queries). The integrasjonspunkt rejects a second create with the same id
(`MessageAlreadyExistsException`), which historically left instances permanently stuck when a send
was retried (Altinn/app-lib-dotnet#854) - the retry could never succeed, and users had to start a
new instance.

Under the v9 workflow engine, retries are routine (steps are retried with backoff, delivery is
at-least-once), so this collision moved from an incident to an architectural problem.

## Decision drivers

- B1: Must not break external consumers. There is a non-zero chance that consumers in the Altinn
  ecosystem have rigged their receiving/archive systems around the invariant *shipment id ==
  instance id* to correlate an eFormidling shipment with the Altinn instance it came from. There is
  no registry of who depends on this, so the risk cannot be assessed or ruled out - the invariant
  has to be treated as load-bearing.
- B2: Retries of the same send must never lock the instance permanently.
- B3: A shipment that was already sent must never be silently re-sent or silently skipped when the
  process loops back to the task with (potentially) changed data.
- B4: Nice to have: support automatic re-send on a deliberate loop-back (e.g. corrected data).
- B5: Nice to have: no changes to the status-check event loop, which also keys on the instance guid
  as shipment id.

## Alternatives considered

- A1: Keep the instance guid as the message id. On duplicate create, query message status and
  self-heal (skip if sent, resume if unsent, fail permanently if terminally failed). Record the
  sending workflow's id on the instance; a different pass reaching the task later fails permanently
  so a human decides.
- A2: Derive the message id from the engine-assigned workflow id - stable across retries of the
  same transition, fresh on every new pass through the task.
- A3: Treat `MessageAlreadyExistsException` as success unconditionally, keeping the instance guid
  id.

## Pros and cons

### A1

- Good, because it fully preserves B1 and B5 - nothing changes on the wire or in the status loop.
- Good, because retries self-heal (B2) and a loop-back becomes an explicit permanent failure with a
  clear message (B3).
- Bad, because B4 is not met: one shipment per instance, ever; a legitimate re-send requires manual
  intervention by design.

### A2

- Good, because it is the technically cleanest idempotency mechanism: retries dedupe (B2) and
  loop-backs re-send automatically (B4).
- Bad, because it risks breaking B1 - silently, for an unknown and unknowable set of consumers.
  This is the decisive point.
- Bad, because the status-check loop and any stored correlation would need a persisted message-id
  lookup (B5).

### A3

- Good, because it is the smallest possible change and satisfies B2.
- Bad, because it violates B3: a loop-back with changed data would silently skip the new shipment,
  hiding a stale delivery from everyone.
