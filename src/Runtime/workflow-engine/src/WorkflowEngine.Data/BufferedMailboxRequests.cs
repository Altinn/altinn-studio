using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data;

/// <summary>
/// A single caller's close request waiting in the mailbox close buffer. <c>Now</c> rides on the record rather
/// than being taken by the flush: the disposal instant a caller was answered with is the one it minted, however
/// long its request waited for a batch. Caps and other limits stay method parameters of the batch call, matching
/// the per-request repository signatures.
/// </summary>
internal sealed record BufferedMailboxCloseRequest(
    Guid MailboxId,
    string Namespace,
    MailboxDisposedReason Reason,
    DateTimeOffset Now,
    string? TraceContext,
    TaskCompletionSource<MailboxCloseResult> Completion
) : IBufferedRequest<MailboxCloseResult>;
