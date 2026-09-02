using System.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Core;

/// <summary>
/// Batches mailbox mints, one connection per flush instead of one per mailbox.
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
/// Batches mailbox closures, one transaction per flush instead of one per closure.
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
/// Batches mailbox deliveries, one transaction per flush instead of one per message.
/// </summary>
internal sealed class MailboxDeliveryBuffer : BatchBuffer<BufferedMailboxDeliveryRequest, MailboxDeliveryResult>
{
    /// <summary>
    /// The payload one batch may carry, in UTF-16 code units rather than the bytes Npgsql encodes them into:
    /// the total is recomputed per candidate and <c>string.Length</c> is the O(1) reading. At UTF-8's worst three
    /// bytes per unit this holds a command's payload under 12 MiB.
    /// </summary>
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
