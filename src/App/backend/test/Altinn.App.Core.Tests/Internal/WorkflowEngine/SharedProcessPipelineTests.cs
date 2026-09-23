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
    public void LifecycleAndServiceCommandStages_ShareModelAndOptions()
    {
        var reference = new WorkflowCommandRef("Notify", "original input");
        var options = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(3) };
        ProcessPipeline lifecycle = new ProcessPipelineBuilder().Stage(reference, options).Build();
        ServiceTaskPipeline service = new ServiceTaskPipelineBuilder()
            .Stage(reference, options)
            .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));

        Assert.IsType<ProcessPipelineStage.Command>(Assert.Single(lifecycle.Stages));
        Assert.IsType<ProcessPipelineStage.Command>(service.Items[0]);
        StepRequest lifecycleStep = Assert.Single(PipelineStagePlanner.PlanLifecycle(lifecycle));
        StepRequest serviceStep = WorkflowCommandSet.PlanSegment("archive", service).Steps[0];
        Assert.Equal("Notify", lifecycleStep.OperationId);
        Assert.Equal("ExecuteServiceTask: 0", serviceStep.OperationId);
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
        IReadOnlyList<StepRequest> steps = PipelineStagePlanner.PlanLifecycle(pipeline);
        Assert.Equal(["A", "B"], steps.Select(step => Wire(step).Payload));
        Assert.Equal(
            [TimeSpan.FromSeconds(10), TimeSpan.FromSeconds(20)],
            steps.Select(step => step.StageOptions!.MaxExecutionTime)
        );
    }

    [Fact]
    public async Task OrdinaryStage_CannotAcquireServiceConclusionSemantics()
    {
        ProcessPipeline pipeline = new ProcessPipelineBuilder().Stage(new WorkflowCommandRef("Invalid")).Build();
        var invalid = new Mock<IWorkflowEngineCommand>();
        invalid.Setup(x => x.GetKey()).Returns("Invalid");
        invalid
            .Setup(x => x.Execute(It.IsAny<ProcessEngineCommandContext>()))
            .ReturnsAsync(new SuccessfulProcessEngineCommandResult { ProcessNextContinuation = new(null) });
        using ServiceProvider provider = new ServiceCollection().AddSingleton(invalid.Object).BuildServiceProvider();
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
        Assert.Equal("Task_Source", command.TaskId);
        Assert.Null(result.ProcessNextContinuation);
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
        Assert.Null(result.ProcessNextContinuation);
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
            .Single(PipelineStagePlanner.PlanLifecycle(pipeline))
            .ApplyStepOptions(resolver, "Task_Target", null);
        Assert.Equal(TimeSpan.FromSeconds(20), lifecycle.Command.MaxExecutionTime);
        Assert.Null(lifecycle.Command.WaitBudget);
        Assert.Equal(4, lifecycle.RetryStrategy!.MaxRetries);
    }

    [Fact]
    public void LifecycleStages_KeepDashboardTaskAndPhaseLabels()
    {
        ProcessPipeline pipeline = new ProcessPipelineBuilder().Stage(new WorkflowCommandRef("Record")).Build();
        WorkflowCommandSet set = WorkflowCommandSet.GetTaskStartSteps(
            new TaskStartContext
            {
                TaskId = "Task_Target",
                ServiceTask = null,
                IsInitialTaskStart = false,
                RegisterEvents = false,
                StartSteps = PipelineStagePlanner.PlanLifecycle(pipeline),
            }
        );
        StepRequest step = set.Commands[^1];
        Assert.Equal("Record", step.OperationId);
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

    [Theory]
    [InlineData(null, 600)]
    [InlineData(45, 45)]
    public void CommandStage_UsesServiceTimeoutUnlessCommandOverridesIt(int? commandSeconds, int expectedSeconds)
    {
        var command = new Mock<IWorkflowEngineCommand>();
        command.Setup(x => x.GetKey()).Returns("Record");
        command
            .SetupGet(x => x.DefaultStepOptions)
            .Returns(
                commandSeconds is { } seconds
                    ? new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromSeconds(seconds) }
                    : null
            );
        var task = new BareCommandTask();
        using ServiceProvider provider = new ServiceCollection()
            .AddSingleton(command.Object)
            .AddSingleton<IPipelineServiceTask>(task)
            .BuildServiceProvider();
        StepRequest step = WorkflowCommandSet
            .PlanSegment(task.Type, task.ResolvePipeline())
            .Steps[0]
            .ApplyStepOptions(new ProcessStepOptionsResolver(provider), "Task_Service", task.Type);
        Assert.Equal(TimeSpan.FromSeconds(expectedSeconds), step.Command.MaxExecutionTime);
    }

    [Theory]
    [InlineData("missing", "PipelineCommandNotFound", true)]
    [InlineData("retryable", "DependencyUnavailable", false)]
    [InlineData("permanent", "InvalidRecipient", true)]
    [InlineData("throws", "InvalidOperationException", false)]
    public async Task CommandStage_PreservesFailureSemantics(string scenario, string code, bool permanent)
    {
        var task = new BareCommandTask();
        var services = new ServiceCollection().AddSingleton<IPipelineServiceTask>(task);
        var command = new Mock<IWorkflowEngineCommand>();
        command.Setup(x => x.GetKey()).Returns("Record");
        if (scenario == "throws")
            command
                .Setup(x => x.Execute(It.IsAny<ProcessEngineCommandContext>()))
                .ThrowsAsync(new InvalidOperationException("Unavailable"));
        else
            command
                .Setup(x => x.Execute(It.IsAny<ProcessEngineCommandContext>()))
                .ReturnsAsync(
                    permanent
                        ? ProcessEngineCommandResult.FailedPermanent("Unavailable", code)
                        : ProcessEngineCommandResult.FailedRetryable("Unavailable", code)
                );
        if (scenario != "missing")
            services.AddSingleton(command.Object);
        using ServiceProvider provider = services.BuildServiceProvider();
        var execute = new ExecuteServiceTask(
            new AppImplementationFactory(provider),
            TestMailboxDeliveryEnvelope.Create()
        );
        ProcessEngineCommandContext context = Context();
        var result = Assert.IsType<FailedProcessEngineCommandResult>(
            await execute.Execute(
                context,
                ServicePayload(WorkflowCommandSet.PlanSegment(task.Type, task.ResolvePipeline()).Steps[0])
            )
        );
        Assert.Equal(code, result.ExceptionType);
        Assert.Equal(permanent, result.NonRetryable);
        Assert.Equal(ProcessStatus.Processing, context.InstanceDataMutator.Instance.Process.Status);
    }

    private sealed class BareCommandTask : IPipelineServiceTask
    {
        public string Type => "command";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(new WorkflowCommandRef("Record"))
                .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));
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

    private sealed class RecordingCommand : IWorkflowEngineCommand
    {
        public string? Input { get; private set; }
        public Guid StepId { get; private set; }
        public string? TaskId { get; private set; }

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
            TaskId = context.TaskId;
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
