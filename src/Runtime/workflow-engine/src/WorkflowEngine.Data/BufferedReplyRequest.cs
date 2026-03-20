namespace WorkflowEngine.Data;

/// <summary>
/// A single caller's reply submission waiting in the reply write buffer.
/// </summary>
public sealed record BufferedReplyRequest(
    Guid ReplyId,
    string? Payload,
    string IdempotencyKey,
    byte[] PayloadHash,
    TaskCompletionSource<SubmitReplyResult> Completion
);
