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
/// The Main workflow's last step for a service task that opens a mailbox: what it enqueues, what it keys the
/// enqueue on, and — the property the whole ordering convention rests on — that Main cannot complete without it
/// having succeeded.
/// </summary>
public class EnqueueReceiveWorkflowTests
{
    private const string SignedTestState = "signed-state-blob-carrying-the-mailbox-id";

    /// <summary>The item index of the stage that opens the exchange.</summary>
    private const int OpeningStageIndex = 0;

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

    private static ProcessEngineCommandContext CreateContext(
        Guid? mailboxId = null,
        Guid? stepId = null,
        WorkflowCallbackStateCarry? carry = null
    ) =>
        new()
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = _instanceId,
            InstanceDataMutator = null!,
            CancellationToken = CancellationToken.None,
            StateCarry = carry ?? CreateCarry(mailboxId),
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

    private static WorkflowCallbackStateCarry CreateCarry(Guid? mailboxId)
    {
        var carry = new WorkflowCallbackStateCarry();
        if (mailboxId is { } id)
        {
            carry.RecordMailbox(OpeningStageIndex, id, new DateTimeOffset(2026, 8, 30, 12, 0, 0, TimeSpan.Zero));
        }
        return carry;
    }

    /// <summary>
    /// The payload as the expansion assembles it: the pre-built receive workflow plus the stage that opens
    /// the exchange it answers, fixed at Main-enqueue time.
    /// </summary>
    private static EnqueueReceiveWorkflowPayload CreatePayload(
        WorkflowEnqueueRequest? request = null,
        int openingStageIndex = OpeningStageIndex
    ) => new(request ?? CreateEmbeddedRequest(), openingStageIndex);

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

        ProcessEngineCommandResult result = await command.Execute(CreateContext(_mailboxId), CreatePayload());

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Equal("ttd/test-app", captured.Namespace);
        Assert.Equal($"{_stepId}:mailbox-receive", captured.IdempotencyKey);
        Assert.Equal(_instanceId.InstanceGuid.ToString(), captured.CollectionKey);

        Assert.NotNull(captured.Request);
        WorkflowRequest receiver = Assert.Single(captured.Request.Workflows);
        Assert.Equal(_mailboxId, receiver.Mailbox?.Id);
        Assert.True(receiver.IsHead);
        Assert.False(receiver.DependsOnHeads);
        Assert.Equal(SignedTestState, receiver.State);
        Assert.Null(receiver.StartAt);
    }

    [Fact]
    public async Task Execute_MintsTheReceiversCallbackTokenAtItsOwnEnqueue()
    {
        // The token is minted here for the relay's sake; it does not extend receiver 1's life — the state blob
        // is signed by the previous step's code and both die together at that code's expiry.
        (Mock<IWorkflowEngineClient> client, Captured captured) = CreateClient();
        var tokens = new CountingTokenGenerator();
        var command = new EnqueueReceiveWorkflow(client.Object, tokens);

        await command.Execute(CreateContext(_mailboxId), CreatePayload());

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

        ProcessEngineCommandResult result = await command.Execute(CreateContext(_mailboxId), CreatePayload());

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
    }

    [Fact]
    public async Task Execute_WithoutACarriedMailbox_FailsPermanently()
    {
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        var command = new EnqueueReceiveWorkflow(client.Object, new CountingTokenGenerator());

        ProcessEngineCommandResult result = await command.Execute(CreateContext(mailboxId: null), CreatePayload());

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

    /// <summary>
    /// The index on the payload is what resolves the exchange, so a second carried mailbox is no obstacle: the
    /// receiver is enqueued against the one its own stage opened, never against "the one entry there is".
    /// </summary>
    [Fact]
    public async Task Execute_WithMailboxesFromTwoStages_EnqueuesAgainstTheIndexedOne()
    {
        (Mock<IWorkflowEngineClient> client, Captured captured) = CreateClient();
        var command = new EnqueueReceiveWorkflow(client.Object, new CountingTokenGenerator());
        var carry = new WorkflowCallbackStateCarry();
        var deadline = new DateTimeOffset(2026, 8, 30, 12, 0, 0, TimeSpan.Zero);
        carry.RecordMailbox(OpeningStageIndex, _mailboxId, deadline);
        carry.RecordMailbox(1, Guid.NewGuid(), deadline);

        ProcessEngineCommandResult result = await command.Execute(CreateContext(carry: carry), CreatePayload());

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        WorkflowRequest receiver = Assert.Single(captured.Request!.Workflows);
        Assert.Equal(_mailboxId, receiver.Mailbox?.Id);
    }

    /// <summary>
    /// A broken carry: the mint step for this exchange's stage recorded nothing that reached here. Naming the
    /// index is what makes the failure diagnosable.
    /// </summary>
    [Fact]
    public async Task Execute_WithAMailboxCarriedOnlyForAnotherIndex_FailsPermanentlyNamingTheIndex()
    {
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        var command = new EnqueueReceiveWorkflow(client.Object, new CountingTokenGenerator());

        ProcessEngineCommandResult result = await command.Execute(
            CreateContext(_mailboxId),
            CreatePayload(openingStageIndex: 1)
        );

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxIdMissingFromState", failed.ExceptionType);
        Assert.Contains("index 1", failed.ErrorMessage, StringComparison.Ordinal);
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
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        var command = new EnqueueReceiveWorkflow(client.Object, new CountingTokenGenerator());

        ProcessEngineCommandResult result = await command.Execute(
            CreateContext(_mailboxId, stepId: Guid.Empty),
            CreatePayload()
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
            CreatePayload(CreateEmbeddedRequest() with { Workflows = [] })
        );

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("InvalidPayloadException", failed.ExceptionType);
    }
}
