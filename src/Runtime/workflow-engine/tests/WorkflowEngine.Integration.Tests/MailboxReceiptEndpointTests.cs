using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;
using WorkflowEngine.TestApp;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Covers what a receive workflow's first step is handed by a live engine — and that every attempt, retry
/// and resume is handed the same thing.
/// </summary>
[Collection(EngineAppCollection.Name)]
public sealed class MailboxReceiptEndpointTests(EngineAppFixture<Program> fixture) : IAsyncLifetime
{
    private readonly EngineApiClient _client = new(fixture);
    private readonly TestHelpers _helpers = new(fixture);

    public async ValueTask InitializeAsync()
    {
        ReceivingCommand.Reset();
        await fixture.Reset();
    }

    public ValueTask DisposeAsync()
    {
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    private Task<MailboxResponse> MintMailbox(string key = "step-1") => _client.MintMailbox(key, TimeSpan.FromHours(1));

    private async Task<Guid> EnqueueReceiver(
        Guid mailboxId,
        string recordingKey,
        int succeedOnAttempt = 1,
        bool failCritically = false,
        string enqueueKey = "receiver",
        TimeSpan? retryDelay = null
    )
    {
        var step = new StepRequest
        {
            OperationId = "handle-reply",
            Command = CommandDefinition.Create(
                "test-receive",
                new ReceivingCommandData
                {
                    Key = recordingKey,
                    SucceedOnAttempt = succeedOnAttempt,
                    FailCritically = failCritically,
                }
            ),
            RetryStrategy = failCritically
                ? RetryStrategy.None()
                : RetryStrategy.Fixed(retryDelay ?? TimeSpan.FromMilliseconds(100), maxRetries: 5),
        };

        var workflow = _helpers.CreateWorkflow("receiver", [step]) with
        {
            Mailbox = new MailboxReference { Id = mailboxId },
        };

        var accepted = await _client.Enqueue(_helpers.CreateEnqueueRequest(workflow), idempotencyKey: enqueueKey);
        return Assert.Single(accepted.Workflows).DatabaseId;
    }

    #region What a released receiver is handed

    [Fact]
    public async Task Receiver_WokenByItsDelivery_IsHandedThatMessage()
    {
        var mailbox = await MintMailbox();
        var receiver = await EnqueueReceiver(mailbox.Id, "woken");

        await _client.DeliverToMailbox(mailbox.Id, "source-msg-1", payload: """{"status":"confirmed"}""");
        await _client.WaitForWorkflowStatus(receiver, PersistentItemStatus.Completed);

        var received = Assert.Single(ReceivingCommand.Received("woken"));
        Assert.Equal(mailbox.Id, received.MailboxId);
        Assert.Equal(0L, received.Seq);
        Assert.Equal("source-msg-1", received.DeliveryKey);
        Assert.Equal("""{"status":"confirmed"}""", received.Payload);
        Assert.Null(received.DisposedReason);
    }

    [Fact]
    public async Task Receiver_BornOntoABacklogDelivery_IsHandedThatMessage()
    {
        var mailbox = await MintMailbox();
        await _client.DeliverToMailbox(mailbox.Id, "source-msg-1", payload: """{"status":"confirmed"}""");

        var receiver = await EnqueueReceiver(mailbox.Id, "born-runnable");
        await _client.WaitForWorkflowStatus(receiver, PersistentItemStatus.Completed);

        var received = Assert.Single(ReceivingCommand.Received("born-runnable"));
        Assert.Equal(0L, received.Seq);
        Assert.Equal("""{"status":"confirmed"}""", received.Payload);
        Assert.Null(received.DisposedReason);
    }

    [Fact]
    public async Task Receiver_ReleasedByAClose_IsHandedTheClosingSignalAndItsReason()
    {
        var mailbox = await MintMailbox();
        var receiver = await EnqueueReceiver(mailbox.Id, "closed");

        await _client.CloseMailbox(mailbox.Id);
        await _client.WaitForWorkflowStatus(receiver, PersistentItemStatus.Completed);

        var received = Assert.Single(ReceivingCommand.Received("closed"));
        Assert.Equal(mailbox.Id, received.MailboxId);
        Assert.Equal(0L, received.Seq);
        Assert.Null(received.Payload);
        Assert.Null(received.DeliveryKey);
        Assert.Equal(MailboxDisposedReason.Request, received.DisposedReason);
    }

    #endregion

    #region The same answer on every attempt

    [Fact]
    public async Task Receiver_ThatFailsAndRetries_ReadsTheSameMessageOnEveryAttempt()
    {
        var mailbox = await MintMailbox();
        var receiver = await EnqueueReceiver(mailbox.Id, "retried", succeedOnAttempt: 3);

        await _client.DeliverToMailbox(mailbox.Id, "source-msg-1", payload: """{"status":"confirmed"}""");
        await _client.WaitForWorkflowStatus(receiver, PersistentItemStatus.Completed, TimeSpan.FromSeconds(30));

        var attempts = ReceivingCommand.Received("retried");
        Assert.Equal(3, attempts.Count);
        Assert.All(attempts, a => Assert.Equal(attempts[0], a));
        Assert.Equal("""{"status":"confirmed"}""", attempts[0].Payload);
    }

    [Fact]
    public async Task Receiver_WhoseMailboxClosesBetweenAttempts_StillReadsItsMessage()
    {
        // The retry delay is deliberately long relative to the 50 ms poll below: at the default 100 ms the
        // close can land after the second attempt, and the test would pass without exercising its scenario.
        var mailbox = await MintMailbox();
        var receiver = await EnqueueReceiver(
            mailbox.Id,
            "closed-midway",
            succeedOnAttempt: 2,
            retryDelay: TimeSpan.FromSeconds(3)
        );

        await _client.DeliverToMailbox(mailbox.Id, "source-msg-1", payload: """{"status":"confirmed"}""");

        await WaitForAttempts("closed-midway", 1);
        await _client.CloseMailbox(mailbox.Id);

        await _client.WaitForWorkflowStatus(receiver, PersistentItemStatus.Completed, TimeSpan.FromSeconds(30));

        var attempts = ReceivingCommand.Received("closed-midway");
        Assert.Equal(2, attempts.Count);
        Assert.Equal(attempts[0], attempts[1]);
        Assert.Equal("""{"status":"confirmed"}""", attempts[1].Payload);
        Assert.Null(attempts[1].DisposedReason);
    }

    [Fact]
    public async Task Receiver_ThatFailedTerminallyAndIsResumed_ReadsTheSameMessageAfterTheResume()
    {
        var mailbox = await MintMailbox();
        var receiver = await EnqueueReceiver(mailbox.Id, "resumed", succeedOnAttempt: 2, failCritically: true);

        await _client.DeliverToMailbox(mailbox.Id, "source-msg-1", payload: """{"status":"confirmed"}""");
        await _client.WaitForWorkflowStatus(receiver, PersistentItemStatus.Failed, TimeSpan.FromSeconds(30));

        Assert.Single(ReceivingCommand.Received("resumed"));

        await _client.ResumeWorkflow(receiver);
        await _client.WaitForWorkflowStatus(receiver, PersistentItemStatus.Completed, TimeSpan.FromSeconds(30));

        var attempts = ReceivingCommand.Received("resumed");
        Assert.Equal(2, attempts.Count);
        Assert.Equal(attempts[0], attempts[1]);
        Assert.Equal("""{"status":"confirmed"}""", attempts[1].Payload);
    }

    [Fact]
    public async Task Receiver_ThatFailedOnTheClosingSignal_ReadsTheSameClosingSignalAfterAResume()
    {
        var mailbox = await MintMailbox();
        var receiver = await EnqueueReceiver(mailbox.Id, "closed-resumed", succeedOnAttempt: 2, failCritically: true);

        await _client.CloseMailbox(mailbox.Id);
        await _client.WaitForWorkflowStatus(receiver, PersistentItemStatus.Failed, TimeSpan.FromSeconds(30));

        using var refused = await _client.DeliverToMailboxRaw(
            mailbox.Id,
            new MailboxDeliveryRequest { IdempotencyKey = "source-msg-late", Payload = "too late" }
        );
        Assert.Equal(System.Net.HttpStatusCode.Conflict, refused.StatusCode);

        await _client.ResumeWorkflow(receiver);
        await _client.WaitForWorkflowStatus(receiver, PersistentItemStatus.Completed, TimeSpan.FromSeconds(30));

        var attempts = ReceivingCommand.Received("closed-resumed");
        Assert.Equal(2, attempts.Count);
        Assert.Equal(attempts[0], attempts[1]);
        Assert.Null(attempts[1].Payload);
        Assert.Equal(MailboxDisposedReason.Request, attempts[1].DisposedReason);
    }

    #endregion

    private static async Task WaitForAttempts(string recordingKey, int count)
    {
        var deadline = DateTimeOffset.UtcNow.AddSeconds(30);
        while (DateTimeOffset.UtcNow < deadline)
        {
            if (ReceivingCommand.Received(recordingKey).Count >= count)
                return;

            await Task.Delay(50, TestContext.Current.CancellationToken);
        }

        Assert.Fail($"The receiver did not reach {count} attempt(s) within the timeout.");
    }
}
