using System.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Core;

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
        : base(scopeFactory, logger, settings.Value.MailboxBuffers.Delivery)
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
