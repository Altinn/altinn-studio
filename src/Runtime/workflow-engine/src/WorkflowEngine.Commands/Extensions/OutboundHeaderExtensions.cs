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
    /// namespace, and optionally collection key) to an outbound HTTP request.
    /// </summary>
    public static void AddWorkflowMetadataHeaders(this HttpRequestMessage request, CommandExecutionContext context)
    {
        request.Headers.Add(WorkflowMetadataConstants.Headers.IdempotencyKey, context.Step.DatabaseId.ToString());
        request.Headers.Add(WorkflowMetadataConstants.Headers.WorkflowId, context.Workflow.DatabaseId.ToString());
        request.Headers.Add(WorkflowMetadataConstants.Headers.OperationId, AsHeaderValue(context.Step.OperationId));
        request.Headers.Add(WorkflowMetadataConstants.Headers.Namespace, context.Workflow.Namespace);
        if (context.Workflow.CollectionKey is { } collectionKey)
            request.Headers.Add(WorkflowMetadataConstants.Headers.CollectionKey, collectionKey);
    }

    /// <summary>
    /// The OperationId is a free-text display identity, but HTTP headers reject anything outside
    /// printable ASCII — and a throwing header write would fail the step on every attempt, turning a
    /// cosmetic string into an unrecoverable retry loop. The header is informational, so a lossy
    /// substitution is safe.
    /// </summary>
    private static string AsHeaderValue(string value) =>
        value.All(c => c >= 0x20 && c <= 0x7E)
            ? value
            : string.Create(
                value.Length,
                value,
                (chars, source) =>
                {
                    for (int i = 0; i < source.Length; i++)
                    {
                        char c = source[i];
                        chars[i] = c >= 0x20 && c <= 0x7E ? c : '?';
                    }
                }
            );
}
