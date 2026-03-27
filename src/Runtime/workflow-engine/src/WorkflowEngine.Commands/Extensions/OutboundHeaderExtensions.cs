using WorkflowEngine.Models;

namespace WorkflowEngine.Commands.Extensions;

/// <summary>
/// Extension method for adding standard workflow metadata headers to outbound HTTP requests.
/// Used by all command implementations (WebhookCommand, AppCommand, etc.).
/// </summary>
public static class OutboundHeaderExtensions
{
    /// <summary>
    /// Adds standard workflow metadata headers (idempotency key, workflow ID, operation ID,
    /// namespace, and optionally correlation ID) to an outbound HTTP request.
    /// </summary>
    public static void AddWorkflowMetadataHeaders(this HttpRequestMessage request, CommandExecutionContext context)
    {
        request.Headers.Add(WorkflowMetadataConstants.Headers.IdempotencyKey, context.Step.IdempotencyKey);
        request.Headers.Add(WorkflowMetadataConstants.Headers.WorkflowId, context.Workflow.DatabaseId.ToString());
        request.Headers.Add(WorkflowMetadataConstants.Headers.OperationId, context.Step.OperationId);
        request.Headers.Add(WorkflowMetadataConstants.Headers.Namespace, context.Workflow.Namespace);
        if (context.Workflow.CorrelationId is { } cid)
            request.Headers.Add(WorkflowMetadataConstants.Headers.CorrelationId, cid.ToString());
    }
}
