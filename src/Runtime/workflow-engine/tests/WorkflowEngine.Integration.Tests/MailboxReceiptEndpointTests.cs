using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;
using WorkflowEngine.TestApp;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Covers what a receive workflow's first step is actually handed by a live engine, and — the point of the step
/// — that it is handed the same thing on every attempt. The three ways a receiver becomes runnable each get an
/// end-to-end test, and then the same receivers are made to fail and run again, retryably and terminally. In
/// between, the mailbox is closed underneath a receiver that already has its message.
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
        // A released receiver used to run its steps with nothing to say for the message that released it; now the
        // message is what its first step is called with.
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
        // The early-reply case, common whenever the external system is fast: the message is already in the log
        // when the app enqueues the receiver for it. The receiver never parks and still gets its message.
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
        // The exchange ending without a reply. The handler is called — that is the whole design: the app
        // concludes in its own words rather than the engine writing a status.
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
        // Three executions of one step, driven by the engine's own retry ladder. The message is not carried
        // between them — each attempt re-reads the log.
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
        // The sharp case: between the failing attempt and the successful one the mailbox is closed, which a naive
        // implementation would read as "no message will come" while the message is already at this receiver's
        // position. The retry delay is deliberately long relative to the 50 ms poll below — at the default
        // 100 ms the close can land after the second attempt, and the test would pass without exercising it.
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
        // A resume is the long way round: the workflow settled Failed and the step runs again from a cold start
        // with nothing in memory, re-deriving the callback from the log.
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
        // The mirror, and it needs no external event: a closed mailbox refuses every further delivery, so the
        // receiver that concluded "nothing is coming" cannot be contradicted while it is failed.
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
