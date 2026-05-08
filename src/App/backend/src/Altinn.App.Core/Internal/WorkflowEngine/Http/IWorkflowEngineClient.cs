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
    /// <param name="correlationId">Optional correlation ID sent via HTTP header</param>
    /// <param name="collectionKey">Optional collection key sent via HTTP header</param>
    /// <param name="request">The WorkflowEnqueueRequest body to send</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task<WorkflowEnqueueResponse.Accepted> EnqueueWorkflows(
        string ns,
        string idempotencyKey,
        Guid? correlationId,
        string? collectionKey,
        WorkflowEnqueueRequest request,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets a workflow collection by key.
    /// Returns <see langword="null"/> when the collection does not exist.
    /// </summary>
    Task<WorkflowCollectionDetailResponse?> GetCollection(
        string ns,
        string key,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists workflows, optionally filtered by correlation ID, collection key, labels, and statuses.
    /// Returns an empty list when no workflows match.
    /// </summary>
    /// <param name="ns">Namespace (URL path segment)</param>
    /// <param name="correlationId">Optional correlation ID to filter by</param>
    /// <param name="collectionKey">Optional collection key to filter by</param>
    /// <param name="labels">Optional label filters (key-value pairs)</param>
    /// <param name="statuses">Optional workflow statuses to filter by</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task<IReadOnlyList<WorkflowStatusResponse>> ListWorkflows(
        string ns,
        Guid? correlationId = null,
        string? collectionKey = null,
        Dictionary<string, string>? labels = null,
        IReadOnlyList<PersistentItemStatus>? statuses = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Requests cancellation of a workflow. Idempotent — repeated calls return the same result.
    /// </summary>
    /// <param name="ns">Namespace (URL path segment)</param>
    /// <param name="workflowId">The workflow database ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task<CancelWorkflowResponse> CancelWorkflow(
        string ns,
        Guid workflowId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Resumes a terminal workflow (failed, canceled, dependency-failed) for re-processing.
    /// </summary>
    /// <param name="ns">Namespace (URL path segment)</param>
    /// <param name="workflowId">The workflow database ID</param>
    /// <param name="cascade">Whether to also resume dependent workflows</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task<ResumeWorkflowResponse> ResumeWorkflow(
        string ns,
        Guid workflowId,
        bool cascade = false,
        CancellationToken cancellationToken = default
    );
}
