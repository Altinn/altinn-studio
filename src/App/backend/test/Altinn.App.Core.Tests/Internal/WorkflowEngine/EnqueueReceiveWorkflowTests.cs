using System.Text.Json;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

/// <summary>
/// The Main workflow's last step for a service task that opens a mailbox: what it enqueues, what it
/// keys the enqueue on, and — the property the whole ordering convention rests on — that Main cannot
/// complete without it having succeeded.
/// </summary>
public class EnqueueReceiveWorkflowTests
{
    private const string SignedTestState = "signed-state-blob-carrying-the-mailbox-id";

    private static readonly Guid _mailboxId = new("018f4e00-0000-7000-8000-000000000001");
    private static readonly Guid _mainWorkflowId = Guid.NewGuid();
    private static readonly Guid _stepId = new("2f6a1d5e-8b1c-4c7e-9f0a-0c8a4b6d1e33");
    private static readonly InstanceIdentifier _instanceId = new(501337, Guid.NewGuid());

    /// <summary>Mints a distinguishable token per call, so "fresh" is observable.</summary>
    private sealed class CountingTokenGenerator : IWorkflowCallbackTokenGenerator
    {
        public int Calls { get; private set; }

        public string GenerateToken(Guid instanceGuid) => $"token-{++Calls}-for-{instanceGuid}";
    }

    private static WorkflowEnqueueRequest CreateEmbeddedRequest() =>
        new()
        {
            Labels = new Dictionary<string, string>(StringComparer.Ordinal) { ["processNextTargetId"] = "Task_1:1" },
            Workflows =
            [
                new WorkflowRequest
                {
                    OperationId = "Mailbox receive: Start event -> Task_1",
                    Steps =
                    [
                        new StepRequest
                        {
                            OperationId = ExecuteServiceTask.Key,
                            Command = CommandDefinition.Create(
                                "app",
                                new AppCommandData { CommandKey = ExecuteServiceTask.Key, Payload = null }
                            ),
                        },
                    ],
                    IsHead = true,
                    DependsOnHeads = false,
                },
            ],
        };

    private static ProcessEngineCommandContext CreateContext(Guid? mailboxId = null, Guid? stepId = null) =>
        new()
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = _instanceId,
            InstanceDataMutator = null!,
            CancellationToken = CancellationToken.None,
            StateCarry = CreateCarry(mailboxId),
            Payload = new AppCallbackPayload
            {
                CommandKey = EnqueueReceiveWorkflow.Key,
                Actor = new Actor { UserId = 1337, Language = "nb" },
                LockToken = "lock-token",
                ExecutionReferenceTime = new DateTimeOffset(2026, 8, 19, 10, 0, 0, TimeSpan.Zero),
                WorkflowId = _mainWorkflowId,
                StepId = stepId ?? _stepId,
                State = SignedTestState,
            },
        };

    /// <summary>
    /// A carry as the callback controller would have restored it: the mailbox id the declaring stage
    /// recorded when it minted, having ridden the state blob through every step in between.
    /// </summary>
    private static WorkflowCallbackStateCarry CreateCarry(Guid? mailboxId)
    {
        var carry = new WorkflowCallbackStateCarry();
        if (mailboxId is { } id)
        {
            carry.RecordMailbox(id);
        }
        return carry;
    }

    private static (Mock<IWorkflowEngineClient> Client, Captured Captured) CreateClient()
    {
        var captured = new Captured();
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c =>
                c.EnqueueWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback(
                (string ns, string key, string? collectionKey, WorkflowEnqueueRequest request, CancellationToken _) =>
                {
                    captured.Namespace = ns;
                    captured.IdempotencyKey = key;
                    captured.CollectionKey = collectionKey;
                    captured.Request = request;
                }
            )
            .ReturnsAsync(
                new WorkflowEnqueueResponse.Accepted
                {
                    Workflows = [new WorkflowResult { DatabaseId = Guid.NewGuid(), Namespace = "ttd/test-app" }],
                }
            );
        return (client, captured);
    }

    private sealed class Captured
    {
        public string? Namespace { get; set; }
        public string? IdempotencyKey { get; set; }
        public string? CollectionKey { get; set; }
        public WorkflowEnqueueRequest? Request { get; set; }
    }

    [Fact]
    public async Task Execute_EnqueuesReceiverOneAgainstTheCarriedMailbox()
    {
        (Mock<IWorkflowEngineClient> client, Captured captured) = CreateClient();
        var tokens = new CountingTokenGenerator();
        var command = new EnqueueReceiveWorkflow(client.Object, tokens);

        ProcessEngineCommandResult result = await command.Execute(
            CreateContext(_mailboxId),
            new EnqueueReceiveWorkflowPayload(CreateEmbeddedRequest())
        );

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Equal("ttd/test-app", captured.Namespace);
        // Every engine call made from inside a callback is keyed off the executing step, so a crashed
        // attempt's replay deduplicates instead of parking a second receiver at a second position.
        Assert.Equal($"{_stepId}:mailbox-receive", captured.IdempotencyKey);
        // The instance's collection — the same one the transition's workflows live in, which is what
        // puts the receiver in the frontier everything else reads.
        Assert.Equal(_instanceId.InstanceGuid.ToString(), captured.CollectionKey);

        Assert.NotNull(captured.Request);
        WorkflowRequest receiver = Assert.Single(captured.Request.Workflows);
        Assert.Equal(_mailboxId, receiver.Mailbox?.Id);
        Assert.True(receiver.IsHead);
        Assert.False(receiver.DependsOnHeads);
        // The receiver starts on this step's own state blob — which already carries the mailbox id, so
        // the handler that runs on the receiver can address the mailbox it is answering on.
        Assert.Equal(SignedTestState, receiver.State);
        // A receiver is Held until its message arrives, so it must carry no schedule of its own.
        Assert.Null(receiver.StartAt);
    }

    [Fact]
    public async Task Execute_MintsTheReceiversCallbackTokenAtItsOwnEnqueue()
    {
        // The receiver's context is built here, with a token minted here, rather than the Main
        // workflow's being reused. What that buys is per-hop freshness for the relay — each hop is
        // enqueued from inside the previous hop's callback and draws from whatever app code is current
        // then. It does *not* extend receiver 1's life: GenerateToken sets Expires to the signing
        // code's own expiry, so a mint seconds after the transition's enqueue picks the same code, and
        // the state blob the receiver starts on is signed by that code too. Both die together, which
        // bounds receiver 1 at the signing code's expiry rather than at the mailbox's deadline.
        (Mock<IWorkflowEngineClient> client, Captured captured) = CreateClient();
        var tokens = new CountingTokenGenerator();
        var command = new EnqueueReceiveWorkflow(client.Object, tokens);

        await command.Execute(CreateContext(_mailboxId), new EnqueueReceiveWorkflowPayload(CreateEmbeddedRequest()));

        Assert.Equal(1, tokens.Calls);
        Assert.NotNull(captured.Request?.Context);
        var receiveContext = captured.Request.Context.Value.Deserialize<AppWorkflowContext>()!;
        Assert.Equal($"token-1-for-{_instanceId.InstanceGuid}", receiveContext.CallbackToken);
        Assert.Equal("ttd", receiveContext.Org);
        Assert.Equal("test-app", receiveContext.App);
        Assert.Equal(_instanceId.InstanceOwnerPartyId, receiveContext.InstanceOwnerPartyId);
        Assert.Equal(_instanceId.InstanceGuid, receiveContext.InstanceGuid);
        Assert.Equal("lock-token", receiveContext.LockToken);
        Assert.Equal(1337, receiveContext.Actor.UserId);
    }

    [Fact]
    public async Task Execute_WhenTheEnqueueFails_FailsTheStepRetryably()
    {
        // The frontier property, at the only place it can be enforced: Main must not complete having
        // published a reply address with nothing listening on it. The step stays unfinished — and Main
        // therefore unsettled — until the receiver exists.
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c =>
                c.EnqueueWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new HttpRequestException("engine unreachable"));
        var command = new EnqueueReceiveWorkflow(client.Object, new CountingTokenGenerator());

        ProcessEngineCommandResult result = await command.Execute(
            CreateContext(_mailboxId),
            new EnqueueReceiveWorkflowPayload(CreateEmbeddedRequest())
        );

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
    }

    [Fact]
    public async Task Execute_WithoutACarriedMailbox_FailsPermanently()
    {
        // The mint's key is the declaring stage's step id, which nothing here can re-derive, so a blob
        // that arrives without the id cannot be repaired by retrying.
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        var command = new EnqueueReceiveWorkflow(client.Object, new CountingTokenGenerator());

        ProcessEngineCommandResult result = await command.Execute(
            CreateContext(mailboxId: null),
            new EnqueueReceiveWorkflowPayload(CreateEmbeddedRequest())
        );

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxIdMissingFromState", failed.ExceptionType);
        client.Verify(
            c =>
                c.EnqueueWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Execute_WithoutAStepId_FailsPermanently()
    {
        // An empty key is a constant: every mailbox exchange in the namespace would collapse onto one
        // enqueue, so the first receiver ever enqueued would be the only one.
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        var command = new EnqueueReceiveWorkflow(client.Object, new CountingTokenGenerator());

        ProcessEngineCommandResult result = await command.Execute(
            CreateContext(_mailboxId, stepId: Guid.Empty),
            new EnqueueReceiveWorkflowPayload(CreateEmbeddedRequest())
        );

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxStepIdMissing", failed.ExceptionType);
    }

    [Fact]
    public async Task Execute_WithAnEmptyPreAssembledRequest_FailsPermanently()
    {
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        var command = new EnqueueReceiveWorkflow(client.Object, new CountingTokenGenerator());

        ProcessEngineCommandResult result = await command.Execute(
            CreateContext(_mailboxId),
            new EnqueueReceiveWorkflowPayload(CreateEmbeddedRequest() with { Workflows = [] })
        );

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("InvalidPayloadException", failed.ExceptionType);
    }
}
