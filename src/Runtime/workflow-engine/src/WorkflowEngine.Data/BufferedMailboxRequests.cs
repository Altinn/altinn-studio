using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data;

/// <summary>
/// A single caller's mint request waiting in the mailbox mint buffer. <c>MailboxId</c> is the candidate id the
/// caller minted before joining the batch, and it is what decides the verdict: a returned row carrying it was
/// this request's own insert, any other row is somebody else's mailbox replayed. <c>Now</c> rides on the record
/// rather than being taken by the flush, so the <c>created_at</c> and deadline a caller is answered with are
/// the ones its own call minted, however long its request waited for a batch. Caps stay method parameters of
/// the batch call, matching the per-request repository signature.
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
