using WorkflowEngine.Models;

namespace WorkflowEngine.Data;

/// <summary>
/// A single caller's enqueue request waiting in the write buffer.
/// </summary>
public sealed record BufferedEnqueueRequest(
    WorkflowEnqueueRequest Request,
    WorkflowRequestMetadata Metadata,
    byte[] RequestBodyHash,
    TaskCompletionSource<WorkflowEnqueueOutcome> Completion
);
