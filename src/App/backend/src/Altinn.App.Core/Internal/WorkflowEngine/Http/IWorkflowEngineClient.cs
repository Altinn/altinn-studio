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
}
