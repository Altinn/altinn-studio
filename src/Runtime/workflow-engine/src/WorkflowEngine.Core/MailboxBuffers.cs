using System.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Core;

/// <summary>
/// Batches mailbox mints, so a burst of exchanges opening at once costs one connection per flush instead of one
/// per mailbox. Every verdict the repository can answer a mint with — minted, replayed, refused at the
/// collection cap — is an ordinary result, so the fan-out has no failure cases of its own.
/// </summary>
internal sealed class MailboxMintBuffer : BatchBuffer<BufferedMailboxMintRequest, MailboxMintResult>
{
    private readonly int _maxOpenPerCollection;

    public MailboxMintBuffer(
        IServiceScopeFactory scopeFactory,
        ILogger<MailboxMintBuffer> logger,
        IOptions<EngineSettings> settings
    )
        : base(scopeFactory, logger, settings.Value.MailboxBuffers.Mint, "mint")
    {
        _maxOpenPerCollection = settings.Value.MaxOpenMailboxesPerCollection;
    }

    /// <summary>
    /// Submits one mailbox for batched minting, answered with the verdict
    /// <see cref="IEngineRepository.MintMailbox"/> would have given it.
    /// </summary>
    /// <remarks>
    /// <paramref name="mailboxId"/> is the candidate id the caller minted and <paramref name="now"/> its own
    /// instant; both ride on the request rather than being taken at flush time, so the id a fresh mailbox gets
    /// and the <c>createdAt</c> and deadline it is stamped with are the ones the call itself decided, however
    /// long its request waited for a batch.
    /// <para>
    /// A flush is one attempt for the whole batch and carries no retry of its own (see
    /// <see cref="IEngineRepository.BatchMintMailboxes"/>), so a failure answers every caller in it with the
    /// same exception. Convergence is the caller's replay: the same idempotency key is answered by whatever the
    /// failed attempt left behind — minted or existing — and never mints a second mailbox.
    /// </para>
    /// </remarks>
    public Task<MailboxMintResult> Enqueue(
        Guid mailboxId,
        string ns,
        string idempotencyKey,
        string? collectionKey,
        TimeSpan timeout,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        var item = new BufferedMailboxMintRequest(
            mailboxId,
            ns,
            idempotencyKey,
            collectionKey,
            timeout,
            now,
            Activity.Current?.Id,
            new TaskCompletionSource<MailboxMintResult>(TaskCreationOptions.RunContinuationsAsynchronously)
        );

        return EnqueueItem(item, ct);
    }

    /// <inheritdoc/>
    protected override async Task FlushCore(
        IReadOnlyList<BufferedMailboxMintRequest> batch,
        IEngineRepository repository,
        CancellationToken ct
    )
    {
        var results = await repository.BatchMintMailboxes(batch, _maxOpenPerCollection, ct);

        CompleteInOrder(batch, results);
    }
}

/// <summary>
/// Batches mailbox closures into one transaction each, so a saga tearing down many exchanges at once costs one
/// connection per flush instead of one per closure. Every verdict the repository can answer a close with —
/// closed, already closed, unknown mailbox — is an ordinary result, so the fan-out has no failure cases of its
/// own.
/// </summary>
internal sealed class MailboxCloseBuffer : BatchBuffer<BufferedMailboxCloseRequest, MailboxCloseResult>
{
    public MailboxCloseBuffer(
        IServiceScopeFactory scopeFactory,
        ILogger<MailboxCloseBuffer> logger,
        IOptions<EngineSettings> settings
    )
        : base(scopeFactory, logger, settings.Value.MailboxBuffers.Close, "close") { }

    /// <summary>
    /// Submits one mailbox for batched closing, answered with the verdict
    /// <see cref="IEngineRepository.CloseMailbox"/> would have given it.
    /// </summary>
    /// <remarks>
    /// <paramref name="now"/> is the caller's, and rides on the request rather than being taken at flush time,
    /// so the <c>disposedAt</c> a closure is stamped with — and replayed to every later close of the same
    /// mailbox — is the instant its own call minted, however long it waited for a batch.
    /// <para>
    /// A flush is one attempt for the whole batch and carries no retry of its own (see
    /// <see cref="IEngineRepository.BatchCloseMailboxes"/>), so a failure answers every caller in it with the
    /// same exception. Convergence is the caller's replay: closing the same mailbox again either effects the
    /// closure the failed attempt rolled back or reports the one it committed, so the disposal stays single.
    /// </para>
    /// </remarks>
    public Task<MailboxCloseResult> Enqueue(
        Guid mailboxId,
        string ns,
        MailboxDisposedReason reason,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        var item = new BufferedMailboxCloseRequest(
            mailboxId,
            ns,
            reason,
            now,
            Activity.Current?.Id,
            new TaskCompletionSource<MailboxCloseResult>(TaskCreationOptions.RunContinuationsAsynchronously)
        );

        return EnqueueItem(item, ct);
    }

    /// <inheritdoc/>
    protected override async Task FlushCore(
        IReadOnlyList<BufferedMailboxCloseRequest> batch,
        IEngineRepository repository,
        CancellationToken ct
    )
    {
        var results = await repository.BatchCloseMailboxes(batch, ct);

        CompleteInOrder(batch, results);
    }
}

/// <summary>
/// Batches mailbox deliveries into one transaction each, so a storm of messages costs one connection per flush
/// instead of one per message. Every verdict a delivery can be answered with — appended, replayed, refused — is
/// an ordinary result, so the fan-out has no failure cases of its own.
/// </summary>
internal sealed class MailboxDeliveryBuffer : BatchBuffer<BufferedMailboxDeliveryRequest, MailboxDeliveryResult>
{
    /// <summary>
    /// The payload one batch may carry, counted in UTF-16 code units. A second bound is needed because the
    /// batch-size limit does not bound a batch's <em>size</em>: 100 requests at the default
    /// <see cref="EngineSettings.MaxMailboxPayloadSize"/> of 256 KiB would build a single command out of 25 MiB
    /// of text.
    /// </summary>
    /// <remarks>
    /// Code units rather than the bytes Npgsql will encode them into, because a batch's total is recomputed for
    /// every candidate and <c>string.Length</c> is the O(1) reading. UTF-8 spends between one and three bytes
    /// per code unit, so this budget holds a command's payload under 12 MiB even for text encoding at the worst
    /// of those rates.
    /// </remarks>
    private const int MaxBatchPayloadUnits = 4 * 1024 * 1024;

    private readonly int _maxLogLength;

    public MailboxDeliveryBuffer(
        IServiceScopeFactory scopeFactory,
        ILogger<MailboxDeliveryBuffer> logger,
        IOptions<EngineSettings> settings
    )
        : base(scopeFactory, logger, settings.Value.MailboxBuffers.Delivery, "delivery")
    {
        _maxLogLength = settings.Value.MaxMailboxLogLength;
    }

    /// <summary>
    /// Submits one message for batched delivery, answered with the verdict
    /// <see cref="IEngineRepository.DeliverToMailbox"/> would have given it.
    /// </summary>
    /// <remarks>
    /// <paramref name="now"/> is the caller's, and rides on the request rather than being taken at flush time,
    /// so the <c>acceptedAt</c> a message is answered with — and replayed on every later resend of its key — is
    /// the instant its own call minted, however long it waited for a batch.
    /// <para>
    /// A flush is one attempt for the whole batch and carries no retry of its own (see
    /// <see cref="IEngineRepository.BatchDeliverToMailboxes"/>), so a failure answers every caller in it with
    /// the same exception. Convergence is the caller's replay: the same key is appended if the failed attempt
    /// rolled back and answered <see cref="MailboxDeliveryResult.Duplicate"/> if it committed, so no message is
    /// stored twice.
    /// </para>
    /// </remarks>
    public Task<MailboxDeliveryResult> Enqueue(
        Guid mailboxId,
        string ns,
        string idempotencyKey,
        string payload,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        var item = new BufferedMailboxDeliveryRequest(
            mailboxId,
            ns,
            idempotencyKey,
            payload,
            now,
            Activity.Current?.Id,
            new TaskCompletionSource<MailboxDeliveryResult>(TaskCreationOptions.RunContinuationsAsynchronously)
        );

        return EnqueueItem(item, ct);
    }

    /// <inheritdoc/>
    protected override async Task FlushCore(
        IReadOnlyList<BufferedMailboxDeliveryRequest> batch,
        IEngineRepository repository,
        CancellationToken ct
    )
    {
        var results = await repository.BatchDeliverToMailboxes(batch, _maxLogLength, ct);

        CompleteInOrder(batch, results);
    }

    /// <inheritdoc/>
    protected override bool CanAddToBatch(
        BufferedMailboxDeliveryRequest item,
        IReadOnlyList<BufferedMailboxDeliveryRequest> batch
    )
    {
        long units = item.Payload.Length;
        foreach (var queued in batch)
        {
            units += queued.Payload.Length;
        }

        return units <= MaxBatchPayloadUnits;
    }
}
