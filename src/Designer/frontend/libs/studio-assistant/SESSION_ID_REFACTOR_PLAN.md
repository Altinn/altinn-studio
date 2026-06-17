# Session ID refactor: thread.id as session_id

## Context

The AI assistant's chat ↔ workflow plumbing currently conflates two unrelated identifiers:

- **SignalR session_id** — one per WebSocket connection, minted by the Designer hub on connect.
- **threadId** — one per chat thread, persisted in the database.

Today, all workflows started from the same browser tab share **one** session_id (the SignalR one). This causes two visible problems and one latent one:

1. **Concurrency routing bug.** Starting multiple workflows in parallel (the load-test dropdown introduced for the Altinity stress test) causes every assistant response to be routed to the most recently started thread. Root cause: `useAltinityWorkflow` keeps a single `activeWorkflowThreadId` ref, overwritten by each `runWorkflowForSession`; the WebSocket events carry the shared SignalR session_id which can't disambiguate.
2. **Thread-history leakage.** The agent backend stores `conversation_history` keyed by `session_id`. Today all threads in one tab share one session_id, so the agent's "memory" of prior turns leaks across threads.
3. **Latent multi-developer ambiguity.** Session ownership is enforced only via the SignalR-issued session_id; this works only because the registry is keyed off connection.

The fix: **use `thread.Id` as the agent-facing `session_id`**. Each thread owns exactly one session_id (its own database PK), and the SignalR connection registers as many session_ids as the user touches.

This plan covers the frontend changes inside this package and the Designer-backend + agent-backend changes it depends on. The agent backend needs no changes.

## Design summary

- `WorkflowRequest.session_id` becomes the chat thread's UUID (`ChatThreadDbModel.Id`, a UUIDv7).
- The Designer hub stops auto-minting a session_id on connect. It exposes a new hub method `RegisterSession(threadId)` that the frontend invokes when a thread is opened or created. The hub validates that the developer owns the thread (`CreatedBy`-check in the DB), then adds the threadId to its session ownership registry and registers it with the agents-side WebSocket service.
- The hub's connection → sessions tracking becomes a set, so one connection can hold many session_ids.
- The frontend drops `backendSessionId` and `activeWorkflowThreadId`. Routing of `WorkflowEvent`s goes purely by `event.session_id`, which is now identical to the threadId.
- Workflow cancellation is invoked against the active thread's id.
- The agent backend keys all its per-workflow state by `session_id`, so no agent changes are required.
- The thread.Id format (UUIDv7 canonical string, `[a-f0-9-]{36}`) satisfies the agent's `^[a-zA-Z0-9_\-]{1,128}$` regex.

## Single-tab assumption

We deliberately do not handle the case where the same user has the same thread open in two browser tabs. If tab 1 disconnects, its `OnDisconnectedAsync` will remove that thread's entry from the global ownership registry; tab 2's next `StartWorkflow` for the same thread will then fail validation. Documented limitation, traded off against simpler bookkeeping (no reference counting).

## Out of scope

- Persisting `session_id` independently from `threadId`. We use the existing PK; no new DB column, no migration.
- Multi-tab synchronization or distributed session registries.
- Backporting agent-side conversation history from old SignalR session_ids onto thread.Ids. Existing threads will start with empty agent-side history at first follow-up after deploy; that's accepted.
- Repository branches created under old session_ids. They are orphaned. Follow-up messages will re-clone under the thread.Id-based branch name.

---

## Implementation plan

### 1. Designer backend — `AltinityProxyHub.cs`

Path: [src/Designer/backend/src/Designer/Hubs/Altinity/AltinityProxyHub.cs](../../../../backend/src/Designer/Hubs/Altinity/AltinityProxyHub.cs)

**Remove from `OnConnectedAsync`:**

- The `Guid.NewGuid()` mint.
- The `s_sessionIdToDeveloper.TryAdd` call.
- The `s_signalRConnectionToSessionId.TryAdd` call.
- The `_webSocketService.RegisterSessionAsync(developer, sessionId)` call.
- The `Clients.Caller.SessionCreated(sessionId)` push.

Keep the developer authentication, group membership, and WS-service `EnsureConnectedAsync` calls.

**Change static field type:**

```csharp
// before
private static readonly ConcurrentDictionary<string, string> s_signalRConnectionToSessionId = new();

// after
private static readonly ConcurrentDictionary<string, HashSet<string>> s_connectionToSessionIds = new();
```

(Rename for accuracy. The `HashSet` is mutated only under the per-connection key, so wrap the mutation in a `lock(set)` or use `ConcurrentDictionary<string, byte>` per connection instead — see the implementation note below.)

**Add new hub method:**

```csharp
public async Task RegisterSession(string threadId)
{
    string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
    string connectionId = Context.ConnectionId;

    if (!Guid.TryParse(threadId, out Guid parsedThreadId))
    {
        throw new HubException("Invalid threadId format");
    }

    bool isOwner = await _chatService.ThreadBelongsToDeveloperAsync(parsedThreadId, developer);
    if (!isOwner)
    {
        throw new HubException("Access denied: You don't own this thread");
    }

    s_sessionIdToDeveloper.TryAdd(threadId, developer);
    s_connectionToSessionIds.AddOrUpdate(
        connectionId,
        _ => new HashSet<string> { threadId },
        (_, existing) => { lock (existing) { existing.Add(threadId); } return existing; });

    await _webSocketService.EnsureConnectedAsync(developer);
    await _webSocketService.RegisterSessionAsync(developer, threadId);
}
```

**Inject `IChatService`, not `IChatRepository`.** Hubs are an API-layer concern and should depend on the service layer; the repository should not be reached past the service boundary. Add a private `_chatService` field and constructor argument.

**Extend `IChatService` with an ownership check** ([../../../../backend/src/Designer/Services/Interfaces/IChatService.cs](../../../../backend/src/Designer/Services/Interfaces/IChatService.cs)):

```csharp
/// <summary>
/// Returns true if a thread with the given id exists and was created by the given developer.
/// Used by the SignalR hub to gate session_id registration.
/// </summary>
Task<bool> ThreadBelongsToDeveloperAsync(
    Guid threadId,
    string developer,
    CancellationToken cancellationToken = default
);
```

The implementation in `ChatService` delegates to `IChatRepository.GetThreadAsync(threadId, ...)` and compares `CreatedBy == developer`. Note this method intentionally doesn't take `AltinnRepoEditingContext` — `RegisterSession` is called at thread-open time, before any org/app scope is in play. It only needs (threadId, developer), which is exactly what an ownership check requires.

If the existing `GetThreadAsync` repository method requires an `AltinnRepoEditingContext` and there's no thread-only variant, add `IChatRepository.GetThreadByIdAsync(Guid threadId, CancellationToken)` (single PK lookup, no scoping) to back the new service method. Otherwise reuse what's there.

Add Moq-based tests for the new service method: returns true for owner, false for non-owner, false for non-existent thread.

**Update `OnDisconnectedAsync`:**

```csharp
if (s_connectionToSessionIds.TryRemove(connectionId, out HashSet<string>? sessionIds) && sessionIds is not null)
{
    foreach (string sessionId in sessionIds)
    {
        s_sessionIdToDeveloper.TryRemove(sessionId, out _);
    }
}
```

**`StartWorkflow` and `CancelWorkflow`:** unchanged. They already call `ValidateSessionOwnership(sessionId, developer)`, which works as-is against the new registry.

**Tests:**

- Update existing hub tests that assert `SessionCreated` is pushed on connect — drop that assertion.
- Add tests for `RegisterSession`:
  - happy path: developer owns the thread → registry contains the entry, agents WS is informed.
  - non-owner: developer does not own the thread → `HubException("Access denied")`.
  - bad format: malformed UUID → `HubException("Invalid threadId format")`.
  - idempotent: registering the same thread twice on the same connection is a no-op (no duplicate WS registration, set still contains one entry).
- Update `OnDisconnectedAsync` tests to assert all session_ids registered by the connection are removed.

### 2. Agent backend

No changes. Confirmed:

- [src/AI/agents/api/routes/agent.py:26](../../../../../../AI/agents/api/routes/agent.py#L26) regex accepts UUIDv7 strings.
- All per-workflow state (`sink.register_developer_session`, `sink.add_to_conversation_history`, `sink.mark_session_started`, `run_in_background`, repo clone, branch name) is keyed by `req.session_id`.
- Cancel and status endpoints are session-keyed.

### 3. Frontend — this package and `app-development/features/aiAssistant`

#### 3a. `useAltinityWebSocket` ([../../app-development/features/aiAssistant/hooks/useAltinityWebSocket/useAltinityWebSocket.ts](../../app-development/features/aiAssistant/hooks/useAltinityWebSocket/useAltinityWebSocket.ts))

- Remove the `sessionId` React state, the `SessionCreated` SignalR handler, and the `registerSessionCreatedHandler` helper.
- Remove `sessionId` from `UseAltinityWebSocketResult`.
- Update `connectionStatus` so it transitions to `'connected'` when the SignalR connection reports connected, not when `SessionCreated` arrives.
- Add `registerSession: (threadId: string) => Promise<void>` to `UseAltinityWebSocketResult`. Implementation invokes `RegisterSession` on the hub via `connection.invoke('RegisterSession', threadId)`. Surfaces errors so callers can handle "not the owner" gracefully (toast).
- `cancelWorkflow(sessionId)` is unchanged in shape; it now takes the threadId-as-sessionId. The internal cleanup helpers (`cleanupConnectionHandlers`) drop the `SessionCreated` line.

#### 3b. `useAltinityWorkflow` ([../../app-development/features/aiAssistant/hooks/useAltinityWorkflow/useAltinityWorkflow.ts](../../app-development/features/aiAssistant/hooks/useAltinityWorkflow/useAltinityWorkflow.ts))

- Drop `backendSessionId`, `backendSessionIdRef`, and the `useEffect` that mirrors them. There's no longer a SignalR-scoped session.
- Drop `activeWorkflowThreadId` entirely.
- `startAgentWorkflow(threadId, ...)` already takes the threadId. Inside, pass `session_id: threadId` to `startWorkflow(...)`.
- `onSubmitMessage`:
  - If `currentSessionId` (the active thread) is present → reuse it.
  - If absent → create a new thread (existing `createThread(title)` path), then call `registerSession(newThreadId)` _before_ `runWorkflowForSession`. Order matters: the hub will reject `StartWorkflow` if registration hasn't happened.
- `runWorkflowForSession(threadId, message)`:
  - Drop the `activeWorkflowThreadId.current = threadId` line.
  - Everything else stays.
- `handleAssistantMessage(event)`:
  - Replace `const threadId = activeWorkflowThreadId.current || currentSessionIdRef.current;` with `const threadId = event.session_id;`.
  - If `event.session_id` is missing, fall back to `currentSessionIdRef.current` — defensive, shouldn't happen in practice.
- `handleWorkflowEvent`'s `error` branch:
  - Same substitution: route to `event.session_id`.
- Event-filtering effect (the one currently checking `event.session_id !== activeBackendSession`):
  - Replace with "is this `event.session_id` one of the developer's threads we know about?" The simplest correct version is to keep a `useRef<Set<string>>` of registered threadIds that the workflow hook bumps when it calls `registerSession`. Events whose `session_id` isn't in the set are dropped.
- `cancelCurrentWorkflow`:
  - Pass `currentSessionIdRef.current` (the active thread) to `cancelWorkflow(...)`. It already does this; no change beyond what `cancelWorkflow` expects.

#### 3c. `useAltinityThreads` ([../../app-development/features/aiAssistant/hooks/useAltinityThreads/useAltinityThreads.ts](../../app-development/features/aiAssistant/hooks/useAltinityThreads/useAltinityThreads.ts))

- Call `registerSession(thread.id)` when a thread is selected (`selectThread`) and immediately after `createThread` returns.
- Optionally batch-register all visible threads on mount, but a registration-on-open model is enough and matches the lazy strategy.
- Add a `pendingRegistrations` guard to avoid registering the same thread twice within one mount; not strictly necessary because the hub is idempotent, but it saves round-trips.

#### 3d. `useAltinityAssistant` ([../../app-development/features/aiAssistant/hooks/useAltinityAssistant/useAltinityAssistant.ts](../../app-development/features/aiAssistant/hooks/useAltinityAssistant/useAltinityAssistant.ts))

- No surface changes. It composes the three hooks above and exposes the same `UseAltinityAssistantResult`.

#### 3e. This package (`@studio/assistant`) — `UserInput` and types

- [src/components/MessageColumn/UserInput/UserInput.tsx](src/components/MessageColumn/UserInput/UserInput.tsx): the load-test loop already calls `onCreateThread()` before each `onSubmitMessage()`. After the refactor:
  - `onCreateThread` (wired to `clearCurrentSession`) sets the active session to null.
  - `onSubmitMessage` sees null → creates a new thread → registers it → starts the workflow.
  - Each iteration now correctly creates a new thread with its own session_id. The "all responses end up in thread #3" bug disappears because routing is per `event.session_id`.
- [src/types/AssistantConfig.ts](src/types/AssistantConfig.ts) — no type changes. `WorkflowRequest.session_id` and `WorkflowEvent.session_id` keep their existing types (string).
- Tests for `UserInput.test.tsx` — no change needed; the load-test tests already verify per-iteration content and `onCreateThread` invocation, which still holds.

### 4. Frontend integration — `AiAssistant.tsx`

Path: [../../app-development/features/aiAssistant/AiAssistant.tsx](../../app-development/features/aiAssistant/AiAssistant.tsx)

- The `Assistant` component receives `onCreateThread`, `onSelectThread`, `onSubmitMessage`, `connectionStatus`. No surface change here.
- Verify the `connectionStatus` indicator no longer waits on `SessionCreated` — should flip green as soon as SignalR is connected.

---

## Verification

1. **Designer backend tests** — `dotnet test --filter "FullyQualifiedName~AltinityProxyHub"` covers the new `RegisterSession` cases plus the modified connect/disconnect lifecycle.
2. **Frontend unit tests** — `yarn test studio-assistant` and `yarn test aiAssistant`. Existing tests for `useAltinityWorkflow` will need their mocks updated (drop `sessionId: 'backend-session'` from the WS mock; add a `registerSession` jest.fn).
3. **Manual smoke (`yarn start-app-development`):**
   - Open the assistant, create a new thread, send "Hei" → assistant replies, response lands in the new thread.
   - Open a second thread, switch back and forth — each thread shows its own conversation history.
   - Trigger the concurrency dropdown at 5 — five new threads are created, each with `Concurrency testing #N` as the user message, **and each assistant response lands in its own thread**.
   - Cancel a running workflow mid-flight → only that thread's workflow stops; other in-flight ones continue.
4. **Backward-compat check** — open a thread that existed before the deploy. Send a follow-up. Confirm the agent treats history as empty (expected) and the response lands in this thread (not leaked to another).

## Rollout / migration notes

- No database migration.
- One-time UX discontinuity: in-flight branches from before the deploy are abandoned; agent-side conversation history for existing threads starts empty on first follow-up. Acceptable for the R&D feature; worth a heads-up in the release notes for testers.
- Feature flag: the load-test dropdown is itself behind no flag and is fine to ship; the underlying session_id refactor doesn't need one either, since the old `SessionCreated` path is replaced atomically.

## Open questions

- Should `RegisterSession` also be called on thread _list_ load (eager), or only on open (lazy)? Plan defaults to lazy.
- If a tester runs into the documented single-tab limitation, do we want a UI hint ("This thread is already open in another tab")? Out of scope for now.
