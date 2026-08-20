using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine.Http;

/// <summary>
/// HTTP client for communicating with the Workflow Engine service.
/// </summary>
internal interface IWorkflowEngineClient
{
    /// <summary>
    /// Enqueues one or more workflows via HTTP.
    /// </summary>
    /// <param name="ns">Namespace (URL path segment, e.g. "org/app")</param>
    /// <param name="idempotencyKey">Idempotency key sent via HTTP header</param>
    /// <param name="collectionKey">Optional collection key sent via HTTP header</param>
    /// <param name="request">The WorkflowEnqueueRequest body to send</param>
    /// <param name="ct">Cancellation token</param>
    Task<WorkflowEnqueueResponse.Accepted> EnqueueWorkflows(
        string ns,
        string idempotencyKey,
        string? collectionKey,
        WorkflowEnqueueRequest request,
        CancellationToken ct = default
    );

    /// <summary>
    /// Gets a workflow collection by key.
    /// Returns <see langword="null"/> when the collection does not exist.
    /// </summary>
    Task<WorkflowCollectionDetailResponse?> GetCollection(string ns, string key, CancellationToken ct = default);

    /// <summary>
    /// Lists workflows, optionally filtered by collection key, labels, and statuses.
    /// Returns an empty list when no workflows match.
    /// </summary>
    /// <param name="ns">Namespace (URL path segment)</param>
    /// <param name="collectionKey">Optional collection key to filter by</param>
    /// <param name="labels">Optional label filters (key-value pairs)</param>
    /// <param name="statuses">Optional workflow statuses to filter by</param>
    /// <param name="ct">Cancellation token</param>
    Task<IReadOnlyList<WorkflowStatusResponse>> ListWorkflows(
        string ns,
        string? collectionKey = null,
        Dictionary<string, string>? labels = null,
        IReadOnlyList<PersistentItemStatus>? statuses = null,
        CancellationToken ct = default
    );

    /// <summary>
    /// Requests cancellation of a workflow. Idempotent — repeated calls return the same result.
    /// </summary>
    /// <param name="ns">Namespace (URL path segment)</param>
    /// <param name="workflowId">The workflow database ID</param>
    /// <param name="ct">Cancellation token</param>
    Task<CancelWorkflowResponse> CancelWorkflow(string ns, Guid workflowId, CancellationToken ct = default);

    /// <summary>
    /// Resumes a terminal workflow (failed, canceled, dependency-failed) for re-processing.
    /// </summary>
    /// <param name="ns">Namespace (URL path segment)</param>
    /// <param name="workflowId">The workflow database ID</param>
    /// <param name="cascade">Whether to also resume dependent workflows</param>
    /// <param name="ct">Cancellation token</param>
    Task<ResumeWorkflowResponse> ResumeWorkflow(
        string ns,
        Guid workflowId,
        bool cascade = false,
        CancellationToken ct = default
    );

    /// <summary>
    /// Writes off an unsuccessful terminal workflow (failed, canceled, dependency-failed) by marking
    /// it Abandoned, so it no longer condemns workflows enqueued afterwards that depend on it.
    /// Idempotent for an already-abandoned workflow.
    /// </summary>
    /// <param name="ns">Namespace (URL path segment)</param>
    /// <param name="workflowId">The workflow database ID</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>
    /// <see langword="true"/> when the workflow is abandoned; <see langword="false"/> when the engine
    /// rejected the compare-and-set because the workflow is in a non-abandonable state - e.g. a
    /// concurrent resume revived it.
    /// </returns>
    Task<bool> AbandonWorkflow(string ns, Guid workflowId, CancellationToken ct = default);

    /// <summary>
    /// Mints a mailbox — the durable inbox a service task publishes as its reply address. Idempotent on
    /// <see cref="MailboxCreateRequest.IdempotencyKey"/> within the namespace, so a retried step is handed the
    /// address it published on its first attempt rather than opening a second mailbox nobody was told about.
    /// </summary>
    /// <param name="ns">Namespace (URL path segment, e.g. "org/app")</param>
    /// <param name="request">The mint request: idempotency key, timeout, optional collection key</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>
    /// <see cref="MailboxMintResult.Minted"/> with the mailbox, or <see cref="MailboxMintResult.Rejected"/> when
    /// the engine refused the request as invalid. Every other unsuccessful status throws.
    /// </returns>
    Task<MailboxMintResult> MintMailbox(string ns, MailboxCreateRequest request, CancellationToken ct = default);

    /// <summary>
    /// Closes a mailbox for further messages. Terminal and idempotent: a repeat close — including one that lost the
    /// race to the mailbox's own deadline — reports the original closure rather than overwriting it.
    /// </summary>
    /// <param name="ns">Namespace (URL path segment, e.g. "org/app")</param>
    /// <param name="mailboxId">The mailbox to close</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>
    /// The closed mailbox, or <see langword="null"/> when no mailbox with that id exists in the namespace
    /// (<c>404</c>). Every other unsuccessful status throws, so it rides the caller's retry ladder.
    /// </returns>
    Task<MailboxResponse?> CloseMailbox(string ns, Guid mailboxId, CancellationToken ct = default);

    /// <summary>
    /// Delivers one message into a mailbox, appending it at the next gapless position. Idempotent on
    /// <see cref="MailboxDeliveryRequest.IdempotencyKey"/> within the mailbox.
    /// </summary>
    /// <param name="ns">Namespace (URL path segment, e.g. "org/app")</param>
    /// <param name="mailboxId">The mailbox to deliver into</param>
    /// <param name="request">The delivery: idempotency key and payload</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>
    /// The engine's status and, on <c>202</c>/<c>200</c>, the delivery it holds. Every documented status comes back
    /// as a value rather than an exception, because each means something different to the forwarding channel and
    /// only the forwarder knows what. Only a transport failure throws.
    /// </returns>
    Task<MailboxDeliveryResult> DeliverToMailbox(
        string ns,
        Guid mailboxId,
        MailboxDeliveryRequest request,
        CancellationToken ct = default
    );
}
