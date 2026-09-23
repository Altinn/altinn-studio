using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class SharedProcessPipelineTests
{
    [Fact]
    public void LifecycleAndServiceCommandStages_ShareModelNamesAndOptions()
    {
        var reference = new WorkflowCommandRef("Notify", "original input");
        var options = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(3) };
        ProcessPipeline lifecycle = new ProcessPipelineBuilder().Stage(reference, options, "Notify signees").Build();
        ServiceTaskPipeline service = new ServiceTaskPipelineBuilder()
            .Stage(reference, options, "Notify signees")
            .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));

        Assert.IsType<ProcessPipelineStage.Command>(Assert.Single(lifecycle.Stages));
        Assert.IsType<ProcessPipelineStage.Command>(service.Items[0]);
        StepRequest lifecycleStep = Assert.Single(
            PipelineStagePlanner.PlanLifecycle(lifecycle, "signing", "Task_Sign", "start")
        );
        StepRequest serviceStep = WorkflowCommandSet.PlanSegment("archive", service).Steps[0];
        Assert.Equal("Notify signees", lifecycleStep.OperationId);
        Assert.Equal(lifecycleStep.OperationId, serviceStep.OperationId);
        Assert.Same(options, lifecycleStep.StageOptions);
        Assert.Same(options, serviceStep.StageOptions);
        Assert.Equal("Notify", lifecycleStep.CommandKey);
        Assert.Equal("Notify", serviceStep.StageCommandKey);
        Assert.Equal(reference, ServicePayload(serviceStep).StageCommand);
        Assert.Equal("original input", Wire(lifecycleStep).Payload);
    }

    [Fact]
    public void Build_SnapshotsStages_AndAddsNoConclusion()
    {
        var builder = new ProcessPipelineBuilder();
        ProcessPipeline empty = builder.Build();
        ProcessPipeline first = builder.Stage(new WorkflowCommandRef("First")).Build();
        builder.Stage(new WorkflowCommandRef("Second"));
        Assert.Empty(empty.Stages);
        Assert.Single(first.Stages);
        Assert.Equal(2, builder.Build().Stages.Count);
    }

    [Fact]
    public void RepeatedCommands_AreSeparateSteps_WithTheirOwnPayloadAndOptions()
    {
        var pipeline = new ProcessPipelineBuilder()
            .Stage(new WorkflowCommandRef("Notify", "A"), new() { MaxExecutionTime = TimeSpan.FromSeconds(10) })
            .Stage(new WorkflowCommandRef("Notify", "B"), new() { MaxExecutionTime = TimeSpan.FromSeconds(20) })
            .Build();
        IReadOnlyList<StepRequest> steps = PipelineStagePlanner.PlanLifecycle(
            pipeline,
            "signing",
            "Task_Sign",
            "start"
        );
        Assert.Equal(["A", "B"], steps.Select(step => Wire(step).Payload));
        Assert.Equal(
            [TimeSpan.FromSeconds(10), TimeSpan.FromSeconds(20)],
            steps.Select(step => step.StageOptions!.MaxExecutionTime)
        );
    }

    [Fact]
    public void NamedLifecycleHandlers_MustHaveUniqueNamesWithinTheirPhase()
    {
        var builder = new ProcessPipelineBuilder().Stage(
            "Prepare",
            _ => Task.FromResult(ProcessEngineCommandResult.Completed())
        );
        Assert.Throws<ArgumentException>(() =>
            builder.Stage("Prepare", _ => Task.FromResult(ProcessEngineCommandResult.Completed()))
        );
    }

    [Fact]
    public async Task LifecycleHandler_UsesExplicitTaskId_AndLeavesProcessingOwnershipAlone()
    {
        var task = new LifecycleTask();
        var services = new ServiceCollection().AddSingleton<IProcessTask>(task);
        using ServiceProvider provider = services.BuildServiceProvider();
        var factory = new AppImplementationFactory(provider);
        var command = new ExecuteProcessStage(new ProcessTaskResolver(provider), factory);
        ProcessEngineCommandContext context = Context();

        ProcessEngineCommandResult result = await command.Execute(
            context,
            new("custom", "Task_Target", "start", "Prepare")
        );

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Equal("Task_Target", task.ObservedTaskId);
        Assert.Equal(ProcessStatus.Processing, context.InstanceDataMutator.Instance.Process.Status);
        Assert.Equal("Task_Source", context.InstanceDataMutator.Instance.Process.CurrentTask.ElementId);
    }

    [Fact]
    public async Task LifecycleHandler_RemovedAfterEnqueue_FailsPermanently()
    {
        var task = new LifecycleTask { IncludeHandler = false };
        using ServiceProvider provider = new ServiceCollection()
            .AddSingleton<IProcessTask>(task)
            .BuildServiceProvider();
        var command = new ExecuteProcessStage(
            new ProcessTaskResolver(provider),
            new AppImplementationFactory(provider)
        );
        FailedProcessEngineCommandResult result = Assert.IsType<FailedProcessEngineCommandResult>(
            await command.Execute(Context(), new("custom", "Task_Target", "start", "Prepare"))
        );
        Assert.True(result.NonRetryable);
        Assert.Equal("PipelineStageNotFound", result.ExceptionType);
    }

    [Fact]
    public async Task OrdinaryStage_CannotAcquireServiceConclusionSemantics()
    {
        ProcessPipeline pipeline = new ProcessPipelineBuilder()
            .Stage(
                "Invalid",
                _ =>
                    Task.FromResult<ProcessEngineCommandResult>(
                        new SuccessfulProcessEngineCommandResult { AutoAdvanceProcess = true }
                    )
            )
            .Build();
        using ServiceProvider provider = new ServiceCollection().BuildServiceProvider();
        FailedProcessEngineCommandResult result = Assert.IsType<FailedProcessEngineCommandResult>(
            await PipelineStageExecutor.Execute(pipeline.Stages[0], new AppImplementationFactory(provider), Context())
        );
        Assert.True(result.NonRetryable);
        Assert.Equal("InvalidStageResult", result.ExceptionType);
    }

    [Fact]
    public async Task ServiceCommandStage_ExecutesPersistedInput_WithoutConcludingTask()
    {
        var command = new RecordingCommand();
        var task = new CommandServiceTask { Input = "before redeploy" };
        StepRequest step = WorkflowCommandSet.PlanSegment(task.Type, task.ResolvePipeline()).Steps[0];
        task.Input = "after redeploy";
        using ServiceProvider provider = new ServiceCollection()
            .AddSingleton<IWorkflowEngineCommand>(command)
            .AddSingleton<IPipelineServiceTask>(task)
            .BuildServiceProvider();
        var execute = new ExecuteServiceTask(
            new AppImplementationFactory(provider),
            TestMailboxDeliveryEnvelope.Create()
        );
        ProcessEngineCommandContext context = Context();

        SuccessfulProcessEngineCommandResult result = Assert.IsType<SuccessfulProcessEngineCommandResult>(
            await execute.Execute(context, ServicePayload(step))
        );

        Assert.Equal("before redeploy", command.Input);
        Assert.Equal(context.Payload.StepId, command.StepId);
        Assert.False(result.AutoAdvanceProcess);
        Assert.Null(result.MailboxContinuation);
        Assert.Equal(ProcessStatus.Processing, context.InstanceDataMutator.Instance.Process.Status);
    }

    [Fact]
    public async Task ServiceCommandReplacedByConclusion_FailsInsteadOfAdvancing()
    {
        var task = new CommandServiceTask();
        StepRequest step = WorkflowCommandSet.PlanSegment(task.Type, task.ResolvePipeline()).Steps[0];
        task.IncludeCommand = false;
        using ServiceProvider provider = new ServiceCollection()
            .AddSingleton<IPipelineServiceTask>(task)
            .BuildServiceProvider();
        var execute = new ExecuteServiceTask(
            new AppImplementationFactory(provider),
            TestMailboxDeliveryEnvelope.Create()
        );
        ProcessEngineCommandContext context = Context();
        FailedProcessEngineCommandResult result = Assert.IsType<FailedProcessEngineCommandResult>(
            await execute.Execute(context, ServicePayload(step))
        );
        Assert.True(result.NonRetryable);
        Assert.Equal("PipelineStageChanged", result.ExceptionType);
        Assert.Equal(ProcessStatus.Processing, context.InstanceDataMutator.Instance.Process.Status);
    }

    [Fact]
    public async Task CommandBeforeReplyHandler_HandsOverToMailboxReceiver()
    {
        var command = new RecordingCommand();
        var task = new CommandServiceTask { WithMailbox = true };
        using ServiceProvider provider = new ServiceCollection()
            .AddSingleton<IWorkflowEngineCommand>(command)
            .AddSingleton<IPipelineServiceTask>(task)
            .BuildServiceProvider();
        var execute = new ExecuteServiceTask(
            new AppImplementationFactory(provider),
            TestMailboxDeliveryEnvelope.Create()
        );
        ProcessEngineCommandContext context = Context();
        Guid mailbox = Guid.NewGuid();
        context.StateCarry.RecordMailbox(0, mailbox, DateTimeOffset.UtcNow.AddHours(1));
        // The opening stage ends the first segment; the command ends the next one, before the reply handler.
        StepRequest step = Assert.Single(
            WorkflowCommandSet.PlanSegment(task.Type, task.ResolvePipeline(), afterItemIndex: 0).Steps
        );
        SuccessfulProcessEngineCommandResult result = Assert.IsType<SuccessfulProcessEngineCommandResult>(
            await execute.Execute(context, ServicePayload(step))
        );
        Assert.IsType<MailboxContinuation.ContinueAfterStage>(result.MailboxContinuation);
        Assert.False(result.AutoAdvanceProcess);
        Assert.Equal(ProcessStatus.Processing, context.InstanceDataMutator.Instance.Process.Status);
    }

    [Fact]
    public void Options_StageOverridesTask_WhichOverridesBusinessCommandDefaults()
    {
        var command = new RecordingCommand();
        var task = new CommandServiceTask();
        using ServiceProvider provider = new ServiceCollection()
            .AddSingleton<IWorkflowEngineCommand>(command)
            .AddSingleton<IPipelineServiceTask>(task)
            .BuildServiceProvider();
        var resolver = new ProcessStepOptionsResolver(provider);
        StepRequest service = WorkflowCommandSet
            .PlanSegment(task.Type, task.ResolvePipeline())
            .Steps[0]
            .ApplyStepOptions(resolver, "Task_Service", task.Type);
        Assert.Equal(TimeSpan.FromSeconds(30), service.Command.MaxExecutionTime);
        Assert.Equal(TimeSpan.FromMinutes(5), service.Command.WaitBudget);
        Assert.Equal(4, service.RetryStrategy!.MaxRetries);

        ProcessPipeline pipeline = new ProcessPipelineBuilder()
            .Stage(
                new WorkflowCommandRef("Record"),
                new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromSeconds(20) }
            )
            .Build();
        StepRequest lifecycle = Assert
            .Single(PipelineStagePlanner.PlanLifecycle(pipeline, "custom", "Task_Target", "start"))
            .ApplyStepOptions(resolver, "Task_Target", null);
        Assert.Equal(TimeSpan.FromSeconds(20), lifecycle.Command.MaxExecutionTime);
        Assert.Null(lifecycle.Command.WaitBudget);
        Assert.Equal(4, lifecycle.RetryStrategy!.MaxRetries);
    }

    [Fact]
    public void LifecycleStages_KeepDashboardTaskAndPhaseLabels()
    {
        ProcessPipeline pipeline = new ProcessPipelineBuilder()
            .Stage(new WorkflowCommandRef("Record"), name: "Record outcome")
            .Build();
        WorkflowCommandSet set = WorkflowCommandSet.GetTaskStartSteps(
            new TaskStartContext
            {
                TaskId = "Task_Target",
                ServiceTask = null,
                IsInitialTaskStart = false,
                RegisterEvents = false,
                StartSteps = PipelineStagePlanner.PlanLifecycle(pipeline, "custom", "Task_Target", "start"),
            }
        );
        StepRequest step = set.Commands[^1];
        Assert.Equal("Record outcome", step.OperationId);
        Assert.Equal("Record", step.CommandKey);
        Assert.Equal("Task_Target", step.Labels!["processTask"]);
        Assert.Equal("start", step.Labels["processTaskPhase"]);
        Assert.False(set.ServiceTaskFollowsCommit);
    }

    [Fact]
    public void SharedContext_PreservesSigningKeysAcrossAdaptersAndRetries()
    {
        ProcessEngineCommandContext context = Context() with
        {
            WorkflowId = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            StepId = Guid.Parse("22222222-2222-2222-2222-222222222222"),
        };
        const string recipient = "33333333-3333-3333-3333-333333333333";
        Guid original = WorkflowStepIdempotencyKey.Create(context, "call-to-action", recipient);
        ServiceTaskContext service = PipelineStageExecutor.ServiceContext(context);
        Assert.Equal(Guid.Parse("92569167-39aa-8625-9e98-3535885f5810"), original);
        Assert.Equal(context.ExecutionReferenceTime, service.ExecutionReferenceTime);
        Assert.Equal(original, WorkflowStepIdempotencyKey.Create(service, "call-to-action", recipient));
        Assert.Equal(
            original,
            WorkflowStepIdempotencyKey.Create(
                context with
                {
                    Payload = context.Payload with { RetryCount = 7 },
                    CancellationToken = new CancellationToken(true),
                },
                "call-to-action",
                recipient
            )
        );
        Assert.NotEqual(original, WorkflowStepIdempotencyKey.Create(context, "other-operation", recipient));
        Assert.NotEqual(
            original,
            WorkflowStepIdempotencyKey.Create(context with { StepId = Guid.NewGuid() }, "call-to-action", recipient)
        );
    }

    [Theory]
    [InlineData("stage", false)]
    [InlineData("stage", true)]
    [InlineData("opening", false)]
    [InlineData("opening", true)]
    [InlineData("conclusion", false)]
    [InlineData("conclusion", true)]
    public async Task ServiceFailures_PreserveApplicationCodesAndRetrySemantics(string location, bool permanent)
    {
        var task = new FailureTask(location, permanent);
        using ServiceProvider provider = new ServiceCollection()
            .AddSingleton<IPipelineServiceTask>(task)
            .BuildServiceProvider();
        var execute = new ExecuteServiceTask(
            new AppImplementationFactory(provider),
            TestMailboxDeliveryEnvelope.Create()
        );
        ProcessEngineCommandContext context = Context();
        context.StateCarry.RecordMailbox(0, Guid.NewGuid(), DateTimeOffset.UtcNow.AddDays(1));
        FailedProcessEngineCommandResult result = Assert.IsType<FailedProcessEngineCommandResult>(
            await execute.Execute(context, new ExecuteServiceTaskPayload(task.Type, ItemIndex: 0))
        );
        Assert.Equal("RecipientUnavailable", result.ExceptionType);
        Assert.Equal(permanent, result.NonRetryable);
        Assert.Equal(ProcessStatus.Processing, context.InstanceDataMutator.Instance.Process.Status);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void MailboxFailures_PreserveCodesWithoutChangingConclusionSemantics(bool permanent)
    {
        ServiceTaskResult failure = permanent
            ? ServiceTaskResult.FailedPermanent("Unavailable", "RecipientUnavailable")
            : ServiceTaskResult.FailedRetryable("Unavailable", "RecipientUnavailable");
        ServiceTaskStageResult stageFailure = permanent
            ? ServiceTaskStageResult.FailedPermanent("Unavailable", "RecipientUnavailable")
            : ServiceTaskStageResult.FailedRetryable("Unavailable", "RecipientUnavailable");
        ProcessEngineCommandContext context = Context();
        var mailbox = new AppCallbackMailbox { Id = Guid.NewGuid(), Seq = 1 };
        context.StateCarry.RecordMailbox(0, mailbox.Id, DateTimeOffset.UtcNow.AddDays(1));
        ServiceTaskPipeline pipeline = new ServiceTaskPipelineBuilder().Finally(_ =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success())
        );
        ProcessEngineCommandResult[] results =
        [
            MailboxRelay.DecideOpeningStageConclusion(failure, "archive", context.StepId, context.StateCarry),
            MailboxRelay.Decide(failure, "archive", context.StepId, mailbox, context.StateCarry, 1, 0),
            MailboxRelay.DecideSegment(
                stageFailure,
                "archive",
                context.StepId,
                mailbox,
                context.StateCarry,
                1,
                0,
                pipeline
            ),
        ];
        foreach (ProcessEngineCommandResult result in results)
        {
            var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
            Assert.Equal("RecipientUnavailable", failed.ExceptionType);
            Assert.Equal(permanent, failed.NonRetryable);
            if (permanent)
                Assert.IsType<MailboxContinuation.Conclude>(failed.MailboxContinuation);
            else
                Assert.Null(failed.MailboxContinuation);
        }
    }

    private sealed class FailureTask(string location, bool permanent) : IPipelineServiceTask
    {
        public string Type => "failing";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline)
        {
            if (location == "stage")
                pipeline.Stage(_ =>
                    Task.FromResult(
                        permanent
                            ? ServiceTaskStageResult.FailedPermanent("Unavailable", "RecipientUnavailable")
                            : ServiceTaskStageResult.FailedRetryable("Unavailable", "RecipientUnavailable")
                    )
                );
            if (location == "opening")
                return pipeline
                    .Stage(
                        (_, _) =>
                            Task.FromResult(
                                permanent
                                    ? ServiceTaskOpeningStageResult.FailedPermanent(
                                        "Unavailable",
                                        "RecipientUnavailable"
                                    )
                                    : ServiceTaskOpeningStageResult.FailedRetryable(
                                        "Unavailable",
                                        "RecipientUnavailable"
                                    )
                            ),
                        new MailboxOptions { Timeout = TimeSpan.FromDays(1) },
                        out MailboxHandle handle
                    )
                    .ConcludeOnReplies(
                        handle,
                        (_, _) => Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success()),
                        (_, _) => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success())
                    );
            return pipeline.Finally(_ =>
                Task.FromResult<ServiceTaskResult>(
                    permanent
                        ? ServiceTaskResult.FailedPermanent("Unavailable", "RecipientUnavailable")
                        : ServiceTaskResult.FailedRetryable("Unavailable", "RecipientUnavailable")
                )
            );
        }
    }

    private static AppCommandData Wire(StepRequest step) =>
        JsonSerializer.Deserialize<AppCommandData>(step.Command.Data!.Value)!;

    private static ExecuteServiceTaskPayload ServicePayload(StepRequest step) =>
        CommandPayloadSerializer.Deserialize<ExecuteServiceTaskPayload>(Wire(step).Payload)!;

    private static ProcessEngineCommandContext Context()
    {
        var instance = new Instance
        {
            Id = "1337/2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde",
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState
            {
                Status = ProcessStatus.Processing,
                CurrentTask = new ProcessElementInfo { ElementId = "Task_Source" },
            },
        };
        var mutator = new Mock<IInstanceDataMutator>();
        mutator.SetupGet(x => x.Instance).Returns(instance);
        Guid workflowId = Guid.NewGuid();
        Guid stepId = Guid.NewGuid();
        return new ProcessEngineCommandContext
        {
            InstanceDataMutator = mutator.Object,
            WorkflowId = workflowId,
            StepId = stepId,
            StateCarry = new(),
            Payload = new AppCallbackPayload
            {
                ExecutionReferenceTime = DateTimeOffset.UtcNow,
                CommandKey = ExecuteServiceTask.Key,
                Actor = new Actor { UserId = 1337 },
                State = "{}",
                WorkflowId = workflowId,
                StepId = stepId,
            },
        };
    }

    private sealed class LifecycleTask : IPipelineProcessTask
    {
        public string Type => "custom";
        public bool IncludeHandler { get; init; } = true;
        public string? ObservedTaskId { get; private set; }

        public ProcessPipeline DefineStartPipeline(string taskId, ProcessPipelineBuilder pipeline)
        {
            if (IncludeHandler)
                pipeline.Stage(
                    "Prepare",
                    context =>
                    {
                        ObservedTaskId = context.TaskId;
                        return Task.FromResult(ProcessEngineCommandResult.Completed());
                    }
                );
            return pipeline.Build();
        }
    }

    private sealed class RecordingCommand : IWorkflowEngineCommand
    {
        public string? Input { get; private set; }
        public Guid StepId { get; private set; }

        public string GetKey() => "Record";

        public ProcessStepOptions DefaultStepOptions =>
            new()
            {
                MaxExecutionTime = TimeSpan.FromSeconds(10),
                RetryStrategy = ProcessStepRetryStrategy.Exponential(TimeSpan.FromSeconds(1), maxRetries: 4),
            };

        public Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context)
        {
            Input = context.CommandPayload;
            StepId = context.StepId;
            return Task.FromResult(ProcessEngineCommandResult.Completed());
        }
    }

    private sealed class CommandServiceTask : IPipelineServiceTask
    {
        public string Type => "archive";
        public string Input { get; set; } = "input";
        public bool WithMailbox { get; init; }
        public bool IncludeCommand { get; set; } = true;
        public ProcessStepOptions StepOptions =>
            new() { MaxExecutionTime = TimeSpan.FromSeconds(15), WaitBudget = TimeSpan.FromMinutes(5) };

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline)
        {
            MailboxHandle? handle = null;
            if (WithMailbox)
                pipeline.Stage(
                    (_, _) => Task.FromResult(ServiceTaskOpeningStageResult.Completed()),
                    new MailboxOptions { Timeout = TimeSpan.FromHours(1) },
                    out handle
                );
            if (IncludeCommand)
                pipeline.Stage(
                    new WorkflowCommandRef("Record", Input),
                    new() { MaxExecutionTime = TimeSpan.FromSeconds(30) }
                );
            return handle is null
                ? pipeline.Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()))
                : pipeline.ConcludeOnReplies(
                    handle,
                    (_, _) => Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success()),
                    (_, _) => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.FailedPermanent("closed"))
                );
        }
    }
}
