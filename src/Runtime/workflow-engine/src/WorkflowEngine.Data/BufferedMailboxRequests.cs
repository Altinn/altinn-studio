using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data;

/// <summary>
/// One caller's mint request waiting in the mailbox mint buffer.
/// </summary>
internal sealed record BufferedMailboxMintRequest(
    Guid MailboxId,
    string Namespace,
    string IdempotencyKey,
    string? CollectionKey,
    TimeSpan Timeout,
    DateTimeOffset Now,
    string? TraceContext,
    TaskCompletionSource<MailboxMintResult> Completion
) : IBufferedRequest<MailboxMintResult>;

/// <summary>
/// One caller's close request waiting in the mailbox close buffer.
/// </summary>
internal sealed record BufferedMailboxCloseRequest(
    Guid MailboxId,
    string Namespace,
    MailboxDisposedReason Reason,
    DateTimeOffset Now,
    string? TraceContext,
    TaskCompletionSource<MailboxCloseResult> Completion
) : IBufferedRequest<MailboxCloseResult>;

/// <summary>
/// One caller's delivery request waiting in the mailbox delivery buffer.
/// </summary>
internal sealed record BufferedMailboxDeliveryRequest(
    Guid MailboxId,
    string Namespace,
    string IdempotencyKey,
    string Payload,
    DateTimeOffset Now,
    string? TraceContext,
    TaskCompletionSource<MailboxDeliveryResult> Completion
) : IBufferedRequest<MailboxDeliveryResult>;
