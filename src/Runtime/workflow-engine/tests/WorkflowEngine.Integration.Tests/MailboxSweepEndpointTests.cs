using System.Globalization;
using Microsoft.Extensions.DependencyInjection;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Covers the deadline sweep against a live engine, driven directly rather than waited for: what this file
/// is about is the path from a passed deadline to a running receiver on a real host.
/// </summary>
[Collection(EngineAppCollection.Name)]
public sealed class MailboxSweepEndpointTests(EngineAppFixture<Program> fixture) : IAsyncLifetime
{
    /// <summary>
    /// The deadline is derived from the mint instant, so a short timeout is the only way to produce an overdue
    /// mailbox through the public surface.
    /// </summary>
    private static readonly TimeSpan _shortTimeout = TimeSpan.FromSeconds(1);

    private readonly EngineApiClient _client = new(fixture);
    private readonly TestHelpers _helpers = new(fixture);

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync()
    {
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    [Fact]
    public async Task SweptMailbox_ClosesAtItsDeadline_AndItsParkedReceiverRuns()
    {
        var mailbox = await _client.MintMailbox("step-1", _shortTimeout);
        var receiver = await EnqueueHeldReceiver(mailbox.Id);

        await WaitForDeadline(mailbox);
        var result = await Sweep();

        Assert.Equal(1, result.Closed);
        Assert.Equal(1, result.ReceiversReleased);

        var closed = await _client.GetMailbox(mailbox.Id);
        Assert.NotNull(closed);
        Assert.Equal(MailboxStatus.Disposed, closed.Status);
        Assert.Equal(MailboxDisposedReason.Deadline, closed.DisposedReason);

        await _client.WaitForWorkflowStatus(receiver, PersistentItemStatus.Completed, TimeSpan.FromSeconds(30));
    }

    [Fact]
    public async Task SweptMailbox_RefusesFurtherDeliveries_AsAClosedMailboxDoes()
    {
        var mailbox = await _client.MintMailbox("step-1", _shortTimeout);

        await WaitForDeadline(mailbox);
        Assert.Equal(1, (await Sweep()).Closed);

        using var late = await _client.DeliverToMailboxRaw(
            mailbox.Id,
            new MailboxDeliveryRequest { IdempotencyKey = "source-msg-1", Payload = "{}" }
        );
        Assert.Equal(System.Net.HttpStatusCode.Conflict, late.StatusCode);
    }

    [Fact]
    public async Task SweptMailbox_CountsItsClosureAsDeadline_AndTheDeliveriesNobodyRead()
    {
        var mailbox = await _client.MintMailbox("step-1", _shortTimeout);
        await _client.DeliverToMailbox(mailbox.Id, "source-msg-1");
        await _client.DeliverToMailbox(mailbox.Id, "source-msg-2");

        await WaitForDeadline(mailbox);

        using var collector = new TelemetryCollector();
        Assert.Equal(1, (await Sweep()).Closed);

        var closure = Assert.Single(collector.GetMeasurements("engine.mailboxes.closed"));
        Assert.Equal("deadline", closure.Tags.Single(t => t.Key == "reason").Value);

        var unconsumed = Assert.Single(collector.GetMeasurements("engine.mailboxes.deliveries.unconsumed"));
        Assert.Equal(2L, Convert.ToInt64(unconsumed.Value, CultureInfo.InvariantCulture));
    }

    /// <summary>Runs one pass of the sweep the host has running, rather than waiting out its cadence.</summary>
    private async Task<MailboxSweepResult> Sweep()
    {
        var repository = fixture.Services.GetRequiredService<IEngineRepository>();
        return await repository.SweepOverdueMailboxes(
            DateTimeOffset.UtcNow,
            MailboxDeadlineService.SweepBatchSize,
            TestContext.Current.CancellationToken
        );
    }

    private static async Task WaitForDeadline(MailboxResponse mailbox)
    {
        var remaining = mailbox.Deadline - DateTimeOffset.UtcNow;
        if (remaining > TimeSpan.Zero)
            await Task.Delay(remaining + TimeSpan.FromMilliseconds(200), TestContext.Current.CancellationToken);
    }

    private async Task<Guid> EnqueueHeldReceiver(Guid mailboxId)
    {
        var request = _helpers.CreateWorkflow("receiver", [_helpers.CreateWebhookStep("/receive")]) with
        {
            Mailbox = new MailboxReference { Id = mailboxId },
        };

        var accepted = await _client.Enqueue(_helpers.CreateEnqueueRequest(request), idempotencyKey: "receiver");
        var workflowId = Assert.Single(accepted.Workflows).DatabaseId;

        var status = await _client.GetWorkflow(workflowId);
        Assert.Equal(PersistentItemStatus.Held, status!.OverallStatus);

        return workflowId;
    }
}
