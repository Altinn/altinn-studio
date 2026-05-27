# Workflow Engine Actor Propagation

## Problem

Workflow-engine handoff currently reduces the caller identity to:

- `UserIdOrOrgNumber`
- `Language`

When the workflow callback later recreates `PlatformUser`, it only restores:

- `UserId`, or
- `OrgId`

This loses fidelity compared to synchronous process execution, especially for:

- user auth level and NIN
- system-user identifiers
- service-owner/system-user attribution

## Target State

Workflow-engine-driven follow-up work should preserve the same actor information that synchronous processing already emits into `PlatformUser`.

## Proposed Shape

### Preferred approach

Keep `Language`, but replace the reduced actor payload with a lossless representation that can recreate the correct `PlatformUser`.

Suggested fields:

- `Kind`
- `Language`
- `UserId`
- `OrgId`
- `AuthenticationLevel`
- `NationalIdentityNumber`
- `SystemUserId`
- `SystemUserOwnerOrgNo`
- `SystemUserName`

### Why not keep the current string-only payload?

Because it forces guessing during reconstruction and cannot distinguish:

- ordinary org auth vs service owner
- user vs system user when both can map to org-related data
- rich user identity fields needed for events/auditing

## Proposed Changes

### 1. Expand the app-command actor model

Update:

- `src/Altinn.App.Core/Internal/WorkflowEngine/Models/AppCommand/Actor.cs`
- any serialized workflow context/callback payloads that include `Actor`

### 2. Build the richer actor in `ProcessNextRequestFactory`

Replace the current `ExtractActor()` logic with one that maps each `Authenticated` variant explicitly.

### 3. Rebuild `PlatformUser` losslessly in `ProcessEngine`

Replace `CreatePlatformUser(Actor actor)` string parsing with a direct mapping from the richer actor model.

### 4. Keep `Language`

Language should remain part of the actor payload for notifications and other downstream behavior.

## Affected Areas

- `src/Altinn.App.Core/Internal/WorkflowEngine/ProcessNextRequestFactory.cs`
- `src/Altinn.App.Core/Internal/WorkflowEngine/Models/AppCommand/Actor.cs`
- `src/Altinn.App.Core/Internal/WorkflowEngine/Models/AppCommand/*`
- `src/Altinn.App.Core/Internal/Process/ProcessEngine.cs`
- workflow-engine service/client tests

## Test Plan

- unit tests for actor extraction from:
  - `Authenticated.User`
  - `Authenticated.ServiceOwner`
  - `Authenticated.SystemUser`
- unit tests for `CreatePlatformUser(...)`
  - verify same fields as synchronous extraction path
- process/workflow-engine tests that assert emitted `PlatformUser` data for dependent execution paths

## Definition of Done

- workflow-engine callbacks no longer reconstruct user/org identity from a single ambiguous string
- `PlatformUser` emitted after workflow-engine execution matches synchronous semantics closely enough for events/auditing

