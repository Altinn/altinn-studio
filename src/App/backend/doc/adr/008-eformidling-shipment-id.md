# Keep the instance id as the eFormidling shipment id

- Status: Accepted
- Deciders: Daniel Skovli
- Date: 2026-07-24

## Result

The eFormidling message/shipment id remains the instance guid. Idempotency is achieved *around* the
fixed id (duplicate-create self-healing + a shipment-ownership claim on the instance), not by
changing it.

## Problem context

The app sends eFormidling shipments with the instance guid as the message id
(`DocumentIdentification.InstanceIdentifier`, and the id used for attachment upload, send, and
status queries). The integrasjonspunkt rejects a second create with the same id
(`MessageAlreadyExistsException`), which historically left instances permanently stuck when a send
was retried (Altinn/app-lib-dotnet#854) - the retry could never succeed, and users had to start a
new instance.

Under the v9 workflow engine, retries are routine (steps are retried with backoff, delivery is
at-least-once), so this collision moved from an incident to an architectural problem.

## Considered: a per-workflow message id

The technically obvious fix is to derive the message id from the engine-assigned workflow id:
stable across retries of the same transition (dedupe works), fresh on every new pass through the
task (loop-backs can re-send, no lockup). This was the original proposal.

**Rejected because the id is load-bearing outside our system.** Consumers in the Altinn ecosystem
are known to have rigged their receiving/archive systems around the invariant *shipment id ==
instance id* to correlate an eFormidling shipment with the Altinn instance it came from. Changing
the id semantics would silently break an unknown number of such consumers - there is no registry of
who depends on it, so the blast radius cannot be assessed. The app's own status-check event loop
also keys on the instance guid as shipment id.

## Consequences

- **One shipment per instance, ever** - inherent to the fixed id, now explicit in the design.
- Retries of the same send self-heal inside `DefaultEFormidlingService`: on duplicate create it
  queries message status and either treats the send as already done, resumes the unfinished
  upload/send steps, or fails permanently if the message is terminally failed (`feil`,
  `levetid_utlopt`) - the id cannot be reused, so retrying is pointless.
- `EFormidlingServiceTask` records the sending workflow's id on the instance
  (`eFormidlingShipmentWorkflowId` data value). A *different* pass reaching the task later fails
  permanently with a clear message: silently skipping would hide a stale shipment, re-sending is
  impossible, so a human has to decide.
- Apps that genuinely need to re-send for the same instance (e.g. corrected data after a loop-back)
  are not supported automatically; that scenario requires manual intervention by design.
