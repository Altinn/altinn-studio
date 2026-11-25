using System.Diagnostics;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

/// <summary>
/// <see cref="ExecuteServiceTask"/> running an action pipeline: the release ending, and who a conclusion moves the
/// process as. The same compositions as a service task's, told apart only by the step's pipeline id.
/// </summary>
public class ExecuteServiceTaskActionPipelineTests
{
    private static readonly Guid _instanceGuid = new("2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde");
    private static readonly Guid _mailboxId = new("018f4e00-0000-7000-8000-0000000000aa");
    private static readonly MailboxDeliveryEnvelope _envelope = TestMailboxDeliveryEnvelope.Create();
    private static readonly Actor _workflowActor = new() { UserId = 1337, Language = "nn" };
    private static readonly Actor _sender = new() { UserId = 2001, Language = "en" };

    private const int OpeningIndex = 0;
    private const int ReplyIndex = 1;
    private const int FinallyIndex = 0;

    private static ServiceTaskPipeline Exchange(
        PipelineBuilder pipeline,
        ServiceTaskOpeningStageResult opening,
        ServiceTaskExchangeResult onMessage,
        ServiceTaskResult onClosed
    ) =>
        pipeline
            .Stage(
                (_, _) => Task.FromResult(opening),
                new MailboxOptions { Timeout = TimeSpan.FromDays(1) },
                out MailboxHandle attempt
            )
            .ConcludeOnReplies(
                attempt,
                onMessage: (_, _) => Task.FromResult(onMessage),
                onClosed: (_, _) => Task.FromResult(onClosed)
            );

    private static TestActionPipelineTask ActionPipelineTask(
        ServiceTaskOpeningStageResult? opening = null,
        ServiceTaskExchangeResult? onMessage = null,
        ServiceTaskResult? onClosed = null
    ) =>
        new(pipeline =>
            Exchange(
                pipeline,
                opening ?? ServiceTaskOpeningStageResult.Completed(),
                onMessage ?? ServiceTaskResult.Success("confirm"),
                onClosed ?? ServiceTaskResult.Success("confirm")
            )
        );

    /// <summary>A service task with the same composition, so only the pipeline id differs.</summary>
    private sealed class ServiceTaskWithTheSameComposition(
        ServiceTaskOpeningStageResult opening,
        ServiceTaskExchangeResult onMessage,
        ServiceTaskResult onClosed
    ) : IServiceTask
    {
        public string Type => TestActionPipelineTask.TaskType;

        public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
            Exchange(pipeline, opening, onMessage, onClosed);
    }

    private sealed class FinallyOnlyServiceTask(ServiceTaskResult result) : IServiceTask
    {
        public string Type => TestActionPipelineTask.TaskType;

        public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
            pipeline.Finally(_ => Task.FromResult(result));
    }

    private static ExecuteServiceTask CreateCommand(IProcessTask task, Telemetry? telemetry = null)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        if (task is IServiceTask serviceTask)
        {
            services.AddSingleton(serviceTask);
        }
        else
        {
            services.AddSingleton(task);
        }

        return new ExecuteServiceTask(
            services.BuildServiceProvider().GetRequiredService<AppImplementationFactory>(),
            _envelope,
            telemetry
        );
    }

    private static WorkflowEngineCommandContext CreateContext(
        AppCallbackMailbox? mailbox = null,
        WorkflowCallbackStateCarry? carry = null
    )
    {
        var instance = new Instance
        {
            Id = $"1337/{_instanceGuid}",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_Attempt" } },
        };
        var mutator = new Mock<IInstanceDataMutator>();
        mutator.Setup(x => x.Instance).Returns(instance);

        return new WorkflowEngineCommandContext
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, _instanceGuid),
            InstanceDataMutator = mutator.Object,
            CancellationToken = CancellationToken.None,
            StateCarry = carry ?? CarryingTheMailbox(),
            Payload = new AppCallbackPayload
            {
                CommandKey = ExecuteServiceTask.Key,
                Actor = _workflowActor,
                ExecutionReferenceTime = new DateTimeOffset(2026, 11, 25, 10, 0, 0, TimeSpan.Zero),
                State = "{}",
                WorkflowId = Guid.NewGuid(),
                StepId = Guid.NewGuid(),
                Mailbox = mailbox,
            },
        };
    }

    private static WorkflowCallbackStateCarry CarryingTheMailbox()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordMailbox(OpeningIndex, _mailboxId, new DateTimeOffset(2026, 11, 26, 10, 0, 0, TimeSpan.Zero));
        return carry;
    }

    private static AppCallbackMailbox Delivered(PipelineId pipeline, Actor? sender) =>
        new()
        {
            Id = _mailboxId,
            Seq = 0,
            Delivery = new AppCallbackMailboxDelivery
            {
                IdempotencyKey = "message-1",
                Payload = _envelope.Wrap("{}", _mailboxId, pipeline, "message-1", sender),
                AcceptedAt = new DateTimeOffset(2026, 11, 25, 10, 5, 0, TimeSpan.Zero),
            },
        };

    private static AppCallbackMailbox Closed() =>
        new()
        {
            Id = _mailboxId,
            Seq = 0,
            DisposedReason = MailboxDisposedReason.Deadline,
        };

    private static ExecuteServiceTaskPayload Step(PipelineId pipeline, int itemIndex) =>
        new(pipeline.TaskType, itemIndex, pipeline.Action);

    public static TheoryData<string> Endings => new() { "openingStage", "onMessage", "onClosed" };

    private static (IProcessTask Task, AppCallbackMailbox? Mailbox, int ItemIndex) Ending(
        string ending,
        PipelineId pipeline,
        ServiceTaskResult result
    )
    {
        bool actionPipeline = pipeline.IsActionPipeline;
        return ending switch
        {
            "openingStage" => (
                actionPipeline
                    ? ActionPipelineTask(opening: ServiceTaskOpeningStageResult.Conclude(result))
                    : new ServiceTaskWithTheSameComposition(
                        ServiceTaskOpeningStageResult.Conclude(result),
                        ServiceTaskResult.Success(),
                        ServiceTaskResult.Success()
                    ),
                null,
                OpeningIndex
            ),
            "onMessage" => (
                actionPipeline
                    ? ActionPipelineTask(onMessage: result)
                    : new ServiceTaskWithTheSameComposition(
                        ServiceTaskOpeningStageResult.Completed(),
                        result,
                        ServiceTaskResult.Success()
                    ),
                Delivered(pipeline, sender: null),
                ReplyIndex
            ),
            "onClosed" => (
                actionPipeline
                    ? ActionPipelineTask(onClosed: result)
                    : new ServiceTaskWithTheSameComposition(
                        ServiceTaskOpeningStageResult.Completed(),
                        ServiceTaskResult.Success(),
                        result
                    ),
                Closed(),
                ReplyIndex
            ),
            _ => throw new ArgumentOutOfRangeException(nameof(ending)),
        };
    }

    [Theory]
    [MemberData(nameof(Endings))]
    public async Task Release_ClosesTheAttemptsMailboxAndReleases(string ending)
    {
        PipelineId pipeline = TestActionPipelineTask.Pipeline;
        (IProcessTask task, AppCallbackMailbox? mailbox, int itemIndex) = Ending(
            ending,
            pipeline,
            ActionPipelineResult.Release()
        );
        WorkflowCallbackStateCarry carry = CarryingTheMailbox();

        WorkflowEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(mailbox, carry), Step(pipeline, itemIndex));

        var success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.True(success.Release);
        Assert.Null(success.ProcessNextContinuation);
        var conclude = Assert.IsType<MailboxContinuation.Conclude>(success.MailboxContinuation);
        Assert.Equal([_mailboxId], conclude.MailboxIds);
        Assert.Null(carry.FindMailbox(OpeningIndex));
    }

    [Fact]
    public async Task Release_FromFinally_ReleasesWithoutAMailbox()
    {
        var task = new TestActionPipelineTask(pipeline =>
            pipeline.Finally(_ => Task.FromResult(ActionPipelineResult.Release()))
        );

        WorkflowEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(), Step(TestActionPipelineTask.Pipeline, FinallyIndex));

        var success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.True(success.Release);
        Assert.Null(success.MailboxContinuation);
        Assert.Null(success.ProcessNextContinuation);
    }

    [Theory]
    [MemberData(nameof(Endings))]
    public async Task Release_InAServiceTask_FailsPermanentlyWithNothingClosed(string ending)
    {
        PipelineId pipeline = PipelineId.ServiceTask(TestActionPipelineTask.TaskType);
        (IProcessTask task, AppCallbackMailbox? mailbox, int itemIndex) = Ending(
            ending,
            pipeline,
            ActionPipelineResult.Release()
        );

        WorkflowEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(mailbox), Step(pipeline, itemIndex));

        var failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ReleaseOutsideActionPipeline", failed.ExceptionType);
        Assert.Null(failed.MailboxContinuation);
    }

    [Fact]
    public async Task Release_FromAServiceTasksFinally_FailsPermanently()
    {
        var task = new FinallyOnlyServiceTask(ActionPipelineResult.Release());

        WorkflowEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(), Step(PipelineId.ServiceTask(TestActionPipelineTask.TaskType), FinallyIndex));

        var failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ReleaseOutsideActionPipeline", failed.ExceptionType);
    }

    [Fact]
    public async Task Success_FromAMessageWithASender_MovesTheProcessAsTheSender()
    {
        PipelineId pipeline = TestActionPipelineTask.Pipeline;

        WorkflowEngineCommandResult result = await CreateCommand(ActionPipelineTask())
            .Execute(CreateContext(Delivered(pipeline, _sender)), Step(pipeline, ReplyIndex));

        var success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.Equal(new ProcessNextContinuation("confirm", _sender), success.ProcessNextContinuation);
    }

    [Fact]
    public async Task Success_FromAMessageWithoutASender_MovesTheProcessAsTheServiceOwnerInTheWorkflowActorsLanguage()
    {
        PipelineId pipeline = TestActionPipelineTask.Pipeline;

        WorkflowEngineCommandResult result = await CreateCommand(ActionPipelineTask())
            .Execute(CreateContext(Delivered(pipeline, sender: null)), Step(pipeline, ReplyIndex));

        var success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.Equal(
            new ProcessNextContinuation("confirm", new Actor { OrgId = "ttd", Language = "nn" }),
            success.ProcessNextContinuation
        );
    }

    [Fact]
    public async Task Success_FromOnClosed_MovesTheProcessAsTheServiceOwnerInTheWorkflowActorsLanguage()
    {
        WorkflowEngineCommandResult result = await CreateCommand(ActionPipelineTask())
            .Execute(CreateContext(Closed()), Step(TestActionPipelineTask.Pipeline, ReplyIndex));

        var success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.Equal(
            new ProcessNextContinuation("confirm", new Actor { OrgId = "ttd", Language = "nn" }),
            success.ProcessNextContinuation
        );
    }

    [Fact]
    public async Task Success_FromTheOpeningStage_MovesTheProcessAsTheWorkflowActor()
    {
        var task = ActionPipelineTask(
            opening: ServiceTaskOpeningStageResult.Conclude(ServiceTaskResult.Success("confirm"))
        );

        WorkflowEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(), Step(TestActionPipelineTask.Pipeline, OpeningIndex));

        var success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.Equal(new ProcessNextContinuation("confirm", Actor: null), success.ProcessNextContinuation);
    }

    [Fact]
    public async Task Success_FromAServiceTaskMessageWithASender_MovesTheProcessAsTheWorkflowActor()
    {
        PipelineId pipeline = PipelineId.ServiceTask(TestActionPipelineTask.TaskType);
        var task = new ServiceTaskWithTheSameComposition(
            ServiceTaskOpeningStageResult.Completed(),
            ServiceTaskResult.Success("confirm"),
            ServiceTaskResult.Success()
        );

        WorkflowEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(Delivered(pipeline, _sender)), Step(pipeline, ReplyIndex));

        var success = Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        Assert.Equal(new ProcessNextContinuation("confirm", Actor: null), success.ProcessNextContinuation);
    }

    [Fact]
    public async Task Execute_StepNamingAnActionThatDoesNotStartThePipeline_FindsNoPipeline()
    {
        var task = new TestActionPipelineTask(pipeline =>
            pipeline.Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()))
        );

        WorkflowEngineCommandResult result = await CreateCommand(task)
            .Execute(
                CreateContext(),
                Step(PipelineId.ActionPipeline(TestActionPipelineTask.TaskType, "confirm"), FinallyIndex)
            );

        var failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.Contains("is not registered", failed.ErrorMessage, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Execute_TagsTheActionPipelinesActionOnTheActivity()
    {
        using var telemetry = new TelemetrySink();
        var task = new TestActionPipelineTask(pipeline =>
            pipeline.Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()))
        );

        await CreateCommand(task, telemetry.Object)
            .Execute(CreateContext(), Step(TestActionPipelineTask.Pipeline, FinallyIndex));

        Activity activity = Assert.Single(telemetry.CapturedActivities);
        Assert.Equal(TestActionPipelineTask.TaskType, activity.GetTagItem("process.service.task.type"));
        Assert.Equal(TestActionPipelineTask.Action, activity.GetTagItem("process.action"));
    }
}
