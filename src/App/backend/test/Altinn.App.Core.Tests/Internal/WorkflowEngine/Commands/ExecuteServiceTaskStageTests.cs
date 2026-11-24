using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

/// <summary>
/// The pipeline dispatch of <see cref="ExecuteServiceTask"/> for a multi-stage <see cref="IServiceTask"/>:
/// resolution by item index, stage-result mapping — carrying on, and ending the task from any stage — the plain
/// index-not-found verdict, and the refusal of a payload naming no item at all. The dispatch of a one-stage pipeline
/// is covered by <see cref="ExecuteServiceTaskTests"/>.
/// </summary>
public class ExecuteServiceTaskStageTests
{
    /// <summary>
    /// A send→poll pipeline whose behavior each test scripts via delegates: the stage at item
    /// index 0 dispatches, and the stage at item index 1 awaits the receipt.
    /// </summary>
    private sealed class ShippingTask : IServiceTask
    {
        public string Type => "shipping";

        public Func<StageContext, Task<ServiceTaskResult>> OnSend { get; init; } =
            _ => Task.FromResult(ServiceTaskResult.Completed());

        public Func<StageContext, Task<ServiceTaskResult>> OnAwait { get; init; } =
            _ => Task.FromResult(ServiceTaskResult.Completed());

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>
            pipeline.Stage(ctx => OnSend(ctx)).Stage(ctx => OnAwait(ctx));
    }

    private static ExecuteServiceTask CreateCommand(IServiceTask serviceTask)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton(serviceTask);
        var sp = services.BuildServiceProvider();

        return new ExecuteServiceTask(
            sp.GetRequiredService<AppImplementationFactory>(),
            // Never consulted: these pipelines declare no mailbox, so the delivery envelope is never
            // reached.
            TestMailboxDeliveryEnvelope.Create()
        );
    }

    private static WorkflowEngineCommandContext CreateContext()
    {
        var instance = new Instance
        {
            Id = "1337/2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);

        return new WorkflowEngineCommandContext
        {
            StateCarry = new(),
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = ExecuteServiceTask.Key,
                Actor = new Actor { UserId = 1337 },
                ExecutionReferenceTime = new DateTimeOffset(2025, 3, 14, 9, 26, 53, TimeSpan.Zero),
                State = "{}",
                WorkflowId = Guid.NewGuid(),
                StepId = Guid.NewGuid(),
            },
        };
    }

    private static ExecuteServiceTaskPayload Payload(int? itemIndex) => new("shipping", itemIndex);

    /// <summary>The item index of <see cref="ShippingTask"/>'s last stage.</summary>
    private const int LastIndex = 1;

    /// <summary>
    /// The mid-pipeline counterpart of
    /// <c>ExecuteServiceTaskTests.Execute_WhenServiceTaskReturnsAnUnrecognisedResultType_…</c>: a type the
    /// mapper does not know must fail permanently and name itself, never be taken for a completed stage and
    /// never ride the outer catch's retry ladder.
    /// </summary>
    /// <remarks>
    /// Self-cleaning: closing the copy-constructor route properly stops <c>base(original)</c> compiling, and
    /// this test disappears with the arm it pins.
    /// </remarks>
    private sealed record RogueStageResult : ServiceTaskResult
    {
        public RogueStageResult(ServiceTaskResult original)
            : base(original) { }
    }

    [Fact]
    public async Task Stage_WhenItReturnsAnUnrecognisedResultType_FailsPermanentlyAndNamesIt()
    {
        var task = new ShippingTask
        {
            OnSend = _ => Task.FromResult<ServiceTaskResult>(new RogueStageResult(ServiceTaskResult.Completed())),
        };

        WorkflowEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(), Payload(0));

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskResultUnknown", failed.ExceptionType);
        Assert.Contains(nameof(RogueStageResult), failed.ErrorMessage, StringComparison.Ordinal);
    }

#nullable disable
    /// <summary>A stage written without nullable annotations, answering null.</summary>
    private static Task<ServiceTaskResult> AnswerNull() => Task.FromResult<ServiceTaskResult>(null);

#nullable restore

    [Fact]
    public async Task Stage_WhenItReturnsNull_FailsPermanentlyWithoutThrowing()
    {
        var task = new ShippingTask { OnSend = _ => AnswerNull() };

        WorkflowEngineCommandResult result = await CreateCommand(task).Execute(CreateContext(), Payload(0));

        FailedWorkflowEngineCommandResult failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskResultUnknown", failed.ExceptionType);
        Assert.Contains("returned null", failed.ErrorMessage, StringComparison.Ordinal);
    }

    /// <summary>
    /// A stage is its workflow's last step, so completing it starts the next item's workflow and does not end the
    /// task.
    /// </summary>
    [Fact]
    public async Task Stage_Completed_StartsTheNextItemsWorkflow_AndDoesNotEndTheTask()
    {
        var command = CreateCommand(new ShippingTask());

        var result = await command.Execute(CreateContext(), Payload(0));

        var success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.Null(success.ProcessNextContinuation);
        var continuing = Assert.IsType<MailboxContinuation.ContinueAfterStage>(success.MailboxContinuation);
        Assert.Equal(0, continuing.Handover.AfterItemIndex);
        Assert.Equal(
            [$"{ExecuteServiceTask.Key}: {LastIndex}"],
            continuing.Handover.Steps.Select(step => step.OperationId)
        );
        Assert.Null(continuing.Handover.Target);
    }

    /// <summary>Three plain items in a row: each stage hands over to the next one's workflow.</summary>
    private sealed class TwoStageTask : IServiceTask
    {
        public string Type => "shipping";

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>
            pipeline
                .Stage(_ => Task.FromResult(ServiceTaskResult.Completed()))
                .Stage(_ => Task.FromResult(ServiceTaskResult.Completed()))
                .Stage(_ => Task.FromResult(ServiceTaskResult.Completed()));
    }

    [Fact]
    public async Task Stage_FollowedByAPlainStage_Completed_HandsOverToThatStage()
    {
        var command = CreateCommand(new TwoStageTask());

        var result = await command.Execute(CreateContext(), Payload(0));

        var success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.Null(success.ProcessNextContinuation);
        var continuing = Assert.IsType<MailboxContinuation.ContinueAfterStage>(success.MailboxContinuation);
        Assert.Equal("shipping", continuing.ServiceTaskType);
        Assert.Equal(0, continuing.Handover.AfterItemIndex);
        Assert.Equal([$"{ExecuteServiceTask.Key}: 1"], continuing.Handover.Steps.Select(step => step.OperationId));
        Assert.Null(continuing.Handover.Target);
    }

    [Fact]
    public async Task Stage_Completed_WithoutAStepId_FailsPermanently()
    {
        var command = CreateCommand(new ShippingTask());
        WorkflowEngineCommandContext context = CreateContext();
        context = context with { Payload = context.Payload with { StepId = Guid.Empty } };

        var result = await command.Execute(context, Payload(0));

        var failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MailboxStepIdMissing", failed.ExceptionType);
    }

    [Fact]
    public async Task Stage_Defer_ReturnsDeferredResult()
    {
        // Any stage may await an async dependency — deferral is not reserved for the last stage.
        var task = new ShippingTask
        {
            OnSend = _ => Task.FromResult(ServiceTaskResult.Defer(TimeSpan.FromSeconds(30), "queue is saturated")),
        };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(), Payload(0));

        var deferred = Assert.IsType<DeferredWorkflowEngineCommandResult>(result);
        Assert.Equal(TimeSpan.FromSeconds(30), deferred.Delay);
        Assert.Equal("queue is saturated", deferred.Reason);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Stage_Failure_MapsKind(bool permanent)
    {
        var task = new ShippingTask
        {
            OnSend = _ =>
                Task.FromResult(
                    permanent
                        ? ServiceTaskResult.FailedPermanent("shipment rejected")
                        : ServiceTaskResult.FailedRetryable("shipment service timed out")
                ),
        };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(), Payload(0));

        var failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.Equal(permanent, failed.NonRetryable);
        Assert.Contains("Service task 'shipping' failed", failed.ErrorMessage);
    }

    /// <summary>
    /// The last item has nothing after it, so completing it ends the task with the default flow.
    /// </summary>
    [Fact]
    public async Task LastStage_Completed_EndsTheTaskWithNoAction()
    {
        var command = CreateCommand(new ShippingTask());

        var result = await command.Execute(CreateContext(), Payload(LastIndex));

        var success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.NotNull(success.ProcessNextContinuation);
        Assert.Null(success.ProcessNextContinuation.Action);
        Assert.Null(success.MailboxContinuation);
    }

    /// <summary>
    /// However the task ends, a mailbox still carried is closed before the next transition starts. A well-formed
    /// pipeline closes each external stage's mailbox before the next item runs, so only a reshaped one gets here.
    /// </summary>
    [Fact]
    public async Task LastStage_Completed_WithAMailboxStillCarried_ClosesItBeforeTheNextTransition()
    {
        var mailboxId = Guid.NewGuid();
        WorkflowEngineCommandContext context = CreateContext();
        context.StateCarry.RecordMailbox(0, mailboxId, DateTimeOffset.UtcNow.AddDays(1));

        var result = await CreateCommand(new ShippingTask()).Execute(context, Payload(LastIndex));

        var success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.Null(success.ProcessNextContinuation?.Action);
        Assert.NotNull(success.ProcessNextContinuation);
        Assert.Equal(mailboxId, Assert.IsType<MailboxContinuation.Conclude>(success.MailboxContinuation).MailboxId);
        Assert.Null(context.StateCarry.OpenMailbox);
    }

    [Fact]
    public async Task LastStage_EndTaskWithAction_CarriesTheAction()
    {
        var task = new ShippingTask { OnAwait = _ => Task.FromResult(ServiceTaskResult.EndTask("reject")) };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(), Payload(LastIndex));

        var success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.NotNull(success.ProcessNextContinuation);
        Assert.Equal("reject", success.ProcessNextContinuation.Action);
    }

    /// <summary>
    /// Any stage can end the task: the next transition gets the stage's action, and nothing is handed over, so the
    /// items composed after it never run.
    /// </summary>
    [Fact]
    public async Task Stage_EndTaskMidPipeline_EndsTheTaskWithTheAction_AndStartsNoLaterItem()
    {
        bool awaitRan = false;
        var task = new ShippingTask
        {
            OnSend = _ => Task.FromResult(ServiceTaskResult.EndTask("reject")),
            OnAwait = _ =>
            {
                awaitRan = true;
                return Task.FromResult(ServiceTaskResult.Completed());
            },
        };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(), Payload(0));

        var success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.Equal("reject", success.ProcessNextContinuation?.Action);
        Assert.Null(success.MailboxContinuation);
        Assert.False(awaitRan);
    }

    [Fact]
    public async Task LastStage_Defer_ReturnsDeferredResult()
    {
        // The last stage is where a send-then-poll pipeline waits.
        var task = new ShippingTask
        {
            OnAwait = _ => Task.FromResult(ServiceTaskResult.Defer(TimeSpan.FromMinutes(5), "awaiting receipt")),
        };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(), Payload(LastIndex));

        var deferred = Assert.IsType<DeferredWorkflowEngineCommandResult>(result);
        Assert.Equal(TimeSpan.FromMinutes(5), deferred.Delay);
        Assert.Equal("awaiting receipt", deferred.Reason);
    }

    [Fact]
    public async Task StageThrows_ReturnsRetryableFailure()
    {
        var task = new ShippingTask { OnSend = _ => throw new InvalidOperationException("shipping exploded") };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(), Payload(0));

        var failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Equal("shipping exploded", failed.ErrorMessage);
    }

    [Fact]
    public async Task UnknownItemIndex_FailsPermanently_WithThePlainIndexVerdict()
    {
        var command = CreateCommand(new ShippingTask());

        var result = await command.Execute(CreateContext(), Payload(2));

        var failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("PipelineItemNotFound", failed.ExceptionType);
        Assert.Contains("no pipeline item at index 2", failed.ErrorMessage, StringComparison.Ordinal);
    }

    [Fact]
    public async Task IndexLessPayload_FailsPermanently_AsAnInvalidPayload()
    {
        var command = CreateCommand(new ShippingTask());

        var result = await command.Execute(CreateContext(), Payload(itemIndex: null));

        var failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("InvalidPayloadException", failed.ExceptionType);
        Assert.Contains("names no pipeline item", failed.ErrorMessage, StringComparison.Ordinal);
    }

    private sealed class SimpleTask : IServiceTask
    {
        public bool Executed { get; private set; }

        public string Type => "shipping";

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) => pipeline.Stage(Execute);

        public Task<ServiceTaskResult> Execute(StageContext context)
        {
            Executed = true;
            return Task.FromResult(ServiceTaskResult.Completed());
        }
    }

    [Fact]
    public async Task IndexPastASimpleTasksOnlyStage_FailsPermanently_AsItemNotFound()
    {
        // Version skew: a workflow enqueued when the task composed two stages — so its last sat at item index 1 —
        // calling back into an app version where the task has one stage, at index 0.
        var simple = new SimpleTask();
        var command = CreateCommand(simple);

        var result = await command.Execute(CreateContext(), Payload(LastIndex));

        var failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("PipelineItemNotFound", failed.ExceptionType);
        Assert.False(simple.Executed);
    }

    [Fact]
    public async Task MockedTaskThatComposesNothing_FailsRetryably_WithALegibleMessage()
    {
        // An unstubbed mock composes no step. The dispatch must fail legibly rather than run nothing — the same
        // guard covers a broken real implementation, which app startup refuses first.
        var mock = new Mock<IServiceTask>();
        mock.Setup(x => x.Type).Returns("shipping");
        var command = CreateCommand(mock.Object);

        var result = await command.Execute(CreateContext(), Payload(0));

        var failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Contains("DefineExecute composes no step", failed.ErrorMessage);
    }

    [Fact]
    public async Task StageContext_CarriesTheEngineIdentityAndClocks()
    {
        StageContext? observed = null;
        var task = new ShippingTask
        {
            OnSend = ctx =>
            {
                observed = ctx;
                return Task.FromResult(ServiceTaskResult.Completed());
            },
        };
        var command = CreateCommand(task);
        var context = CreateContext();

        await command.Execute(context, Payload(0));

        Assert.NotNull(observed);
        Assert.Equal(context.Payload.WorkflowId, observed.WorkflowId);
        Assert.Equal(context.Payload.StepId, observed.StepId);
        Assert.Same(context.InstanceDataMutator, observed.InstanceDataMutator);
    }
}
