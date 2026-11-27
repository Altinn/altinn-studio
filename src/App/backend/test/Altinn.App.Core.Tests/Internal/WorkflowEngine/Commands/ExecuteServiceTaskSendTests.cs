using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

/// <summary>
/// An external stage's send, as <see cref="ExecuteServiceTask"/> runs it: the step on the stage's index that carries
/// no mailbox receipt. It is handed the reply address the <see cref="MintMailbox"/> step carried, and its result
/// decides whether the stage waits for replies or the task ends. The mint is <see cref="MintMailboxTests"/>'s
/// subject, the replies <see cref="ExecuteServiceTaskReplyTests"/>'.
/// </summary>
public class ExecuteServiceTaskSendTests
{
    private static readonly Guid _instanceGuid = new("2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde");
    private static readonly Guid _carriedMailboxId = new("018f4e00-0000-7000-8000-0000000000aa");
    private static readonly DateTimeOffset _carriedDeadline = new(2026, 8, 22, 10, 0, 0, TimeSpan.Zero);

    /// <summary>The item index of the external stage whose send is tested.</summary>
    private const int SendStageIndex = 0;

    private static readonly ProcessStepOptions _stageOptions = new() { MaxExecutionTime = TimeSpan.FromMinutes(5) };

    /// <summary>
    /// An external stage, with a stage after it unless <see cref="ThenRecord"/> says otherwise. The send's answer
    /// is scripted, and every method records that it ran.
    /// </summary>
    private sealed class ArchivingTask : IServiceTask
    {
        public string Type => "archiving";

        public Func<StageContext, ReplyAddress, Task<ServiceTaskResult>> Send { get; init; } =
            (_, _) => Task.FromResult(ServiceTaskResult.Completed());

        public bool ThenRecord { get; init; } = true;

        public List<string> Ran { get; } = [];

        public ReplyAddress? SentTo { get; private set; }

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline)
        {
            pipeline.ExternalStage(
                SendToArchive,
                HandleArchiveReply,
                timeout: TimeSpan.FromDays(3),
                options: _stageOptions
            );
            if (ThenRecord)
            {
                pipeline.Stage(RecordArchived);
            }
        }

        private Task<ServiceTaskResult> SendToArchive(StageContext context, ReplyAddress address)
        {
            Ran.Add(nameof(SendToArchive));
            SentTo = address;
            return Send(context, address);
        }

        private Task<ServiceTaskReplyResult> HandleArchiveReply(StageContext context, ServiceTaskReply reply)
        {
            Ran.Add(nameof(HandleArchiveReply));
            return Task.FromResult(ServiceTaskReplyResult.Completed());
        }

        private Task<ServiceTaskResult> RecordArchived(StageContext context)
        {
            Ran.Add(nameof(RecordArchived));
            return Task.FromResult(ServiceTaskResult.Completed());
        }
    }

    /// <summary>A stage, then the external stage: what precedes the mint.</summary>
    private sealed class PrepareThenArchiveTask : IServiceTask
    {
        public string Type => "archiving";

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>
            pipeline
                .Stage(_ => Task.FromResult(ServiceTaskResult.Completed()))
                .ExternalStage(
                    SendToArchive,
                    (_, _) => Task.FromResult(ServiceTaskReplyResult.Completed()),
                    options: _stageOptions
                );

        private static Task<ServiceTaskResult> SendToArchive(StageContext context, ReplyAddress address) =>
            Task.FromResult(ServiceTaskResult.Completed());
    }

#nullable disable
    /// <summary>A send written without nullable annotations, answering null.</summary>
    private static Task<ServiceTaskResult> SendAnsweringNull(StageContext context, ReplyAddress address) =>
        Task.FromResult<ServiceTaskResult>(null);

#nullable restore

    private static ExecuteServiceTask CreateCommand(IServiceTask serviceTask)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton(serviceTask);
        ServiceProvider sp = services.BuildServiceProvider();

        return new ExecuteServiceTask(
            sp.GetRequiredService<AppImplementationFactory>(),
            TestMailboxDeliveryEnvelope.Create()
        );
    }

    /// <summary>The carry as the mint step leaves it for the send.</summary>
    private static WorkflowCallbackStateCarry MintedCarry(int stageIndex = SendStageIndex)
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(stageIndex, _carriedMailboxId, _carriedDeadline);
        return carry;
    }

    private static WorkflowEngineCommandContext CreateContext(WorkflowCallbackStateCarry? carry = null)
    {
        var instance = new Instance
        {
            Id = $"1337/{_instanceGuid}",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);

        return new WorkflowEngineCommandContext
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, _instanceGuid),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = CancellationToken.None,
            StateCarry = carry ?? new WorkflowCallbackStateCarry(),
            Payload = new AppCallbackPayload
            {
                CommandKey = ExecuteServiceTask.Key,
                Actor = new Actor { UserId = 1337 },
                ExecutionReferenceTime = new DateTimeOffset(2026, 8, 19, 10, 0, 0, TimeSpan.Zero),
                State = "{}",
                WorkflowId = Guid.NewGuid(),
                StepId = Guid.NewGuid(),
            },
        };
    }

    private static ExecuteServiceTaskPayload Payload(int itemIndex = SendStageIndex) => new("archiving", itemIndex);

    /// <summary>The carry still holds the address the mint opened, as the mint left it.</summary>
    private static void AssertStillCarried(WorkflowCallbackStateCarry carry)
    {
        Assert.NotNull(carry.Mailboxes);
        KeyValuePair<string, CarriedMailbox> only = Assert.Single(carry.Mailboxes);
        Assert.Equal($"{SendStageIndex}", only.Key);
        Assert.Equal(_carriedMailboxId, only.Value.Id);
        Assert.Equal(_carriedDeadline, only.Value.Deadline);
    }

    [Fact]
    public async Task Send_IsHandedTheReplyAddressTheMintCarried()
    {
        var task = new ArchivingTask();

        WorkflowEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(MintedCarry()), Payload());

        Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        ReplyAddress address = Assert.IsType<ReplyAddress>(task.SentTo);
        Assert.Equal(_carriedMailboxId, address.Id);
        Assert.Equal(_carriedDeadline, address.Deadline);
        // No receipt, so the step is the send: the reply handler shares the index and does not run.
        Assert.Equal(["SendToArchive"], task.Ran);
    }

    /// <summary>
    /// The send may not go without an address, and it has no way to obtain one. Two causes reach here and the
    /// wording must name both: a redeploy that turned this index into an external stage, so the in-flight
    /// workflow's step list holds no mint step at all, and a mint step whose record did not survive into this
    /// step's state.
    /// </summary>
    [Fact]
    public async Task Send_WithoutACarriedMailbox_FailsPermanentlyAndNeverRuns()
    {
        var task = new ArchivingTask();

        WorkflowEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(), Payload());

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxIdMissingFromState", failed.ExceptionType);
        Assert.Contains($"The external stage at index {SendStageIndex}", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Contains(
            "enqueued before the item was an external stage",
            failed.ErrorMessage,
            StringComparison.Ordinal
        );
        Assert.Contains("did not survive into this step's state", failed.ErrorMessage, StringComparison.Ordinal);
        Assert.Empty(task.Ran);
    }

    /// <summary>
    /// A mailbox carried under another stage's index is not this stage's: the lookup is by index, never by "the
    /// one entry there happens to be".
    /// </summary>
    [Fact]
    public async Task Send_WithAMailboxCarriedForAnotherStage_FailsPermanentlyAndNeverRuns()
    {
        var task = new ArchivingTask();

        WorkflowEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(MintedCarry(stageIndex: 5)), Payload());

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxIdMissingFromState", failed.ExceptionType);
        Assert.Empty(task.Ran);
    }

    /// <summary>
    /// Sent, now wait for replies: the stage's first receive workflow, its one step the stage's reply step on the
    /// same index, parked on the address the send published and carrying the stage's own options and the reply
    /// step's name. The address keeps travelling, since the stage is not done with it.
    /// </summary>
    [Fact]
    public async Task Send_Completed_HandsOverToTheStagesFirstReceiveWorkflow()
    {
        var task = new ArchivingTask();
        WorkflowCallbackStateCarry carry = MintedCarry();

        WorkflowEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(carry), Payload());

        SuccessfulWorkflowEngineCommandResult success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.Null(success.ProcessNextContinuation);
        ServiceTaskContinuation.ContinueAfterStage continuing =
            Assert.IsType<ServiceTaskContinuation.ContinueAfterStage>(success.ServiceTaskContinuation);
        Assert.Equal("archiving", continuing.ServiceTaskType);
        Assert.Equal(SendStageIndex, continuing.Handover.AfterItemIndex);

        PlannedStep step = Assert.Single(continuing.Handover.Steps);
        Assert.Equal($"{ExecuteServiceTask.Key}: {SendStageIndex}", step.OperationId);
        Assert.Equal(new ExecuteServiceTaskPayload("archiving", SendStageIndex), step.Payload);
        Assert.Same(_stageOptions, step.DeclaredOptions);
        Assert.Equal("Handle archive reply", step.StepName);

        MailboxTarget target = Assert.IsType<MailboxTarget>(continuing.Handover.Target);
        Assert.Equal(_carriedMailboxId, target.MailboxId);
        Assert.Equal(SendStageIndex, target.StageIndex);

        AssertStillCarried(carry);
        Assert.Equal(["SendToArchive"], task.Ran);
    }

    /// <summary>
    /// A send is never the end of the task, even when its stage is the pipeline's last item: completing it waits
    /// for replies, and only a reply handler's completion ends the task.
    /// </summary>
    [Fact]
    public async Task Send_Completed_OnTheLastItem_StillWaitsForReplies()
    {
        var task = new ArchivingTask { ThenRecord = false };

        WorkflowEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(MintedCarry()), Payload());

        SuccessfulWorkflowEngineCommandResult success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.Null(success.ProcessNextContinuation);
        ServiceTaskContinuation.ContinueAfterStage continuing =
            Assert.IsType<ServiceTaskContinuation.ContinueAfterStage>(success.ServiceTaskContinuation);
        Assert.Equal(_carriedMailboxId, Assert.IsType<MailboxTarget>(continuing.Handover.Target).MailboxId);
    }

    /// <summary>
    /// Ending the task from the send closes the address without waiting for a reply: no receiver is enqueued, the
    /// items after the stage never run, and the address is dropped from the state the step publishes.
    /// </summary>
    [Theory]
    [InlineData("reject")]
    [InlineData(null)]
    public async Task Send_EndTask_ClosesTheReplyAddressWithoutWaiting_AndEndsTheTask(string? action)
    {
        var task = new ArchivingTask { Send = (_, _) => Task.FromResult(ServiceTaskResult.EndTask(action)) };
        WorkflowCallbackStateCarry carry = MintedCarry();

        WorkflowEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(carry), Payload());

        SuccessfulWorkflowEngineCommandResult success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.NotNull(success.ProcessNextContinuation);
        Assert.Equal(action, success.ProcessNextContinuation.Action);
        ServiceTaskContinuation.CloseAndEndTask conclude = Assert.IsType<ServiceTaskContinuation.CloseAndEndTask>(
            success.ServiceTaskContinuation
        );
        Assert.Equal(_carriedMailboxId, conclude.MailboxId);
        Assert.Null(carry.Mailboxes);
        Assert.Equal(["SendToArchive"], task.Ran);
    }

    public static TheoryData<string> NonFinalAnswers => new() { "defer", "retryable", "permanent" };

    private static ServiceTaskResult NonFinalAnswer(string answer) =>
        answer switch
        {
            "defer" => ServiceTaskResult.Defer(TimeSpan.FromMinutes(2), "archive is busy"),
            "retryable" => ServiceTaskResult.FailedRetryable("archive is down"),
            "permanent" => ServiceTaskResult.FailedPermanent("the recipient account does not exist"),
            _ => throw new ArgumentOutOfRangeException(nameof(answer), answer, null),
        };

    /// <summary>
    /// A deferred or failed send closes nothing: the address stays open and carried, so a retry or a resume runs
    /// the send against the same address, and replies that arrive meanwhile wait.
    /// </summary>
    [Theory]
    [MemberData(nameof(NonFinalAnswers))]
    public async Task Send_DeferOrFailure_ClosesNothing_AndLeavesTheCarryAsItWas(string answer)
    {
        var task = new ArchivingTask { Send = (_, _) => Task.FromResult(NonFinalAnswer(answer)) };
        WorkflowCallbackStateCarry carry = MintedCarry();

        WorkflowEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(carry), Payload());

        switch (answer)
        {
            case "defer":
                DeferredWorkflowEngineCommandResult deferred = Assert.IsType<DeferredWorkflowEngineCommandResult>(
                    result
                );
                Assert.Equal(TimeSpan.FromMinutes(2), deferred.Delay);
                Assert.Equal("archive is busy", deferred.Reason);
                break;
            default:
                FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
                Assert.Equal(answer == "permanent", failed.NonRetryable);
                Assert.Equal(ExecuteServiceTask.FailedReasonCode, failed.ExceptionType);
                Assert.StartsWith("Service task 'archiving' failed: ", failed.ErrorMessage, StringComparison.Ordinal);
                break;
        }

        AssertStillCarried(carry);
    }

    [Fact]
    public async Task Send_Throws_FailsRetryably_AndClosesNothing()
    {
        var task = new ArchivingTask { Send = (_, _) => throw new InvalidOperationException("archive exploded") };
        WorkflowCallbackStateCarry carry = MintedCarry();

        WorkflowEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(carry), Payload());

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Equal("archive exploded", failed.ErrorMessage);
        AssertStillCarried(carry);
    }

    /// <summary>
    /// The send's sibling of <c>ExecuteServiceTaskStageTests.RogueStageResult</c>: a type the mapper does not know
    /// fails permanently and names itself, closing nothing.
    /// </summary>
    /// <remarks>
    /// Self-cleaning: closing the copy-constructor route properly stops <c>base(original)</c> compiling, and this
    /// test disappears with the arm it pins.
    /// </remarks>
    private sealed record RogueSendResult : ServiceTaskResult
    {
        public RogueSendResult(ServiceTaskResult original)
            : base(original) { }
    }

    [Fact]
    public async Task Send_WithAnUnrecognisedResultType_FailsPermanentlyAndNamesIt()
    {
        var task = new ArchivingTask
        {
            Send = (_, _) => Task.FromResult<ServiceTaskResult>(new RogueSendResult(ServiceTaskResult.Completed())),
        };
        WorkflowCallbackStateCarry carry = MintedCarry();

        WorkflowEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(carry), Payload());

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskResultUnknown", failed.ExceptionType);
        Assert.Contains(nameof(RogueSendResult), failed.ErrorMessage, StringComparison.Ordinal);
        AssertStillCarried(carry);
    }

    [Fact]
    public async Task Send_ReturningNull_FailsPermanentlyWithoutThrowing()
    {
        var task = new ArchivingTask { Send = SendAnsweringNull };
        WorkflowCallbackStateCarry carry = MintedCarry();

        WorkflowEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(carry), Payload());

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskResultUnknown", failed.ExceptionType);
        Assert.Contains("returned null", failed.ErrorMessage, StringComparison.Ordinal);
        AssertStillCarried(carry);
    }

    /// <summary>
    /// Both of the send's answers that make a keyed call: the first receiver's enqueue, and the close that comes
    /// before the next transition. An empty step id is a constant every task in the application would share.
    /// </summary>
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Send_ThatWouldEnqueueOrClose_WithoutAStepId_IsRefusedAndLeavesTheCarry(bool endsTheTask)
    {
        var task = new ArchivingTask
        {
            Send = (_, _) =>
                Task.FromResult(endsTheTask ? ServiceTaskResult.EndTask("reject") : ServiceTaskResult.Completed()),
        };
        WorkflowCallbackStateCarry carry = MintedCarry();
        WorkflowEngineCommandContext context = CreateContext(carry);
        context = context with { Payload = context.Payload with { StepId = Guid.Empty } };

        WorkflowEngineCommandResult result = await CreateCommand(task).Execute(context, Payload());

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxStepIdMissing", failed.ExceptionType);
        AssertStillCarried(carry);
    }

    /// <summary>
    /// What precedes a send: completing the stage before an external stage hands over to that stage's workflow,
    /// the mint and then the send, with the stage's options on the send and none on the mint.
    /// </summary>
    [Fact]
    public async Task StageBeforeAnExternalStage_Completed_HandsOverToItsMintAndSend()
    {
        WorkflowEngineCommandResult result = await CreateCommand(new PrepareThenArchiveTask())
            .Execute(CreateContext(), Payload(itemIndex: 0));

        SuccessfulWorkflowEngineCommandResult success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.Null(success.ProcessNextContinuation);
        ServiceTaskContinuation.ContinueAfterStage continuing =
            Assert.IsType<ServiceTaskContinuation.ContinueAfterStage>(success.ServiceTaskContinuation);
        Assert.Equal(0, continuing.Handover.AfterItemIndex);
        Assert.Null(continuing.Handover.Target);

        Assert.Collection(
            continuing.Handover.Steps,
            mint =>
            {
                Assert.Equal($"{MintMailbox.Key}: 1", mint.OperationId);
                Assert.Equal(new MintMailboxPayload("archiving", 1), mint.Payload);
                Assert.Null(mint.DeclaredOptions);
            },
            send =>
            {
                Assert.Equal($"{ExecuteServiceTask.Key}: 1", send.OperationId);
                Assert.Equal(new ExecuteServiceTaskPayload("archiving", 1), send.Payload);
                Assert.Same(_stageOptions, send.DeclaredOptions);
                Assert.Equal("Send to archive", send.StepName);
            }
        );
    }
}
