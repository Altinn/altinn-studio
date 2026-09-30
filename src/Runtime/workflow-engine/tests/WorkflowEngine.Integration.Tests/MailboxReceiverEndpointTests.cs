using System.Globalization;
using System.Net;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Covers the receive-workflow declaration through the whole stack: what the enqueue endpoint accepts, what it
/// refuses and with which status, and what a held receiver looks like to a caller reading it back.
/// </summary>
[Collection(EngineAppCollection.Name)]
public sealed class MailboxReceiverEndpointTests(EngineAppFixture<Program> fixture) : IAsyncLifetime
{
    private readonly EngineApiClient _client = new(fixture);
    private readonly TestHelpers _helpers = new(fixture);

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync()
    {
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    private Task<MailboxResponse> MintMailbox(string key = "step-1") => _client.MintMailbox(key, TimeSpan.FromHours(1));

    private static EngineSettings Settings(EngineAppFixture<Program> f) =>
        f.Services.GetRequiredService<IOptions<EngineSettings>>().Value;

    private WorkflowRequest Receiver(Guid mailboxId, DateTimeOffset? startAt = null) =>
        _helpers.CreateWorkflow("receiver", [_helpers.CreateWebhookStep("/never-called")]) with
        {
            Mailbox = new MailboxReference { Id = mailboxId },
            StartAt = startAt,
        };

    #region Accepted

    [Fact]
    public async Task Enqueue_ReceiverForAnOpenMailbox_IsAcceptedAndReadsBackAsHeld()
    {
        var mailbox = await MintMailbox();

        var accepted = await _client.Enqueue(_helpers.CreateEnqueueRequest(Receiver(mailbox.Id)));

        var workflowId = Assert.Single(accepted.Workflows).DatabaseId;
        var status = await _client.GetWorkflow(workflowId);
        Assert.NotNull(status);
        Assert.Equal(PersistentItemStatus.Held, status.OverallStatus);

        var afterwards = await _client.GetMailbox(mailbox.Id);
        Assert.NotNull(afterwards);
        Assert.Equal(1L, afterwards.NextSeq);
        Assert.Equal(0L, afterwards.NextIdx);
    }

    [Fact]
    public async Task Enqueue_HeldReceiver_StaysHeldUntilSomethingReleasesIt()
    {
        var mailbox = await MintMailbox();
        var accepted = await _client.Enqueue(_helpers.CreateEnqueueRequest(Receiver(mailbox.Id)));
        var workflowId = Assert.Single(accepted.Workflows).DatabaseId;

        await Task.Delay(TimeSpan.FromSeconds(2), TestContext.Current.CancellationToken);

        var status = await _client.GetWorkflow(workflowId);
        Assert.NotNull(status);
        Assert.Equal(PersistentItemStatus.Held, status.OverallStatus);
        Assert.All(status.Steps, s => Assert.Equal(PersistentItemStatus.Enqueued, s.Status));
    }

    [Fact]
    public async Task Enqueue_ReceiverForAClosedMailbox_IsAcceptedAndRunnable()
    {
        var mailbox = await MintMailbox();
        await _client.CloseMailbox(mailbox.Id);

        var accepted = await _client.Enqueue(_helpers.CreateEnqueueRequest(Receiver(mailbox.Id)));
        var workflowId = Assert.Single(accepted.Workflows).DatabaseId;

        var status = await _client.GetWorkflow(workflowId);
        Assert.NotNull(status);
        Assert.NotEqual(PersistentItemStatus.Held, status.OverallStatus);
    }

    #endregion

    #region Refused

    [Fact]
    public async Task Enqueue_ReceiverForAnUnknownMailbox_Returns400()
    {
        using var response = await _client.EnqueueRaw(_helpers.CreateEnqueueRequest(Receiver(Guid.CreateVersion7())));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.Contains("does not exist in namespace", problem, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Enqueue_ReceiverWithAStartAt_Returns400()
    {
        var mailbox = await MintMailbox();

        using var response = await _client.EnqueueRaw(
            _helpers.CreateEnqueueRequest(Receiver(mailbox.Id, startAt: DateTimeOffset.UtcNow.AddMinutes(5)))
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.Contains("has no schedule", problem, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Enqueue_ReceiverWithAnEmptyMailboxId_Returns400()
    {
        using var response = await _client.EnqueueRaw(_helpers.CreateEnqueueRequest(Receiver(Guid.Empty)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Enqueue_WhenTheReceiversLogIsFull_Returns429()
    {
        var cap = Settings(fixture).MaxMailboxLogLength;
        var mailbox = await MintMailbox();

        for (int i = 0; i < cap; i++)
        {
            await _client.Enqueue(_helpers.CreateEnqueueRequest(Receiver(mailbox.Id)), idempotencyKey: $"receiver-{i}");
        }

        using var response = await _client.EnqueueRaw(
            _helpers.CreateEnqueueRequest(Receiver(mailbox.Id)),
            idempotencyKey: "one-too-many"
        );

        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);

        var afterwards = await _client.GetMailbox(mailbox.Id);
        Assert.Equal(cap, afterwards!.NextSeq);
    }

    #endregion

    #region Telemetry

    [Fact]
    public async Task ReceiversAreCountedByTheStateTheyWereBornIn()
    {
        var open = await MintMailbox("step-open");
        var withDelivery = await MintMailbox("step-delivered");
        await _client.DeliverToMailbox(withDelivery.Id, "source-msg-1");
        var closed = await MintMailbox("step-closed");
        await _client.CloseMailbox(closed.Id);

        using var collector = new TelemetryCollector();

        await _client.Enqueue(_helpers.CreateEnqueueRequest(Receiver(open.Id)));
        await _client.Enqueue(_helpers.CreateEnqueueRequest(Receiver(withDelivery.Id)));
        await _client.Enqueue(_helpers.CreateEnqueueRequest(Receiver(closed.Id)));
        (await _client.EnqueueRaw(_helpers.CreateEnqueueRequest(Receiver(Guid.CreateVersion7())))).Dispose();

        var byBirth = collector
            .GetMeasurements("engine.mailboxes.receivers.created")
            .GroupBy(m => (string)m.Tags.Single(t => t.Key == "birth").Value!)
            .ToDictionary(g => g.Key, g => g.Sum(m => Convert.ToInt64(m.Value, CultureInfo.InvariantCulture)));

        Assert.Equal(
            new Dictionary<string, long>
            {
                ["held"] = 1,
                ["delivered"] = 1,
                ["closed"] = 1,
            },
            byBirth
        );
    }

    #endregion
}
