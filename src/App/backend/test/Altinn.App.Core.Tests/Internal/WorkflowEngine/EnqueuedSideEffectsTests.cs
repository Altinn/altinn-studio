using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

/// <summary>
/// Enqueuing side effects from app code (<see cref="SideEffectQueue"/>): what a step enqueues is resolved to the
/// registered side effect and waits in the workflow state until the controller starts it.
/// </summary>
public class EnqueuedSideEffectsTests
{
    private sealed record ArchiveRequest(string CaseId);

    private sealed class ArchiveSideEffect : ISideEffect
    {
        public string Name => "archive";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline.Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));
    }

    private sealed class UnregisteredSideEffect : ISideEffect
    {
        public string Name => "unregistered";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline.Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));
    }

    private static AppImplementationFactory Factory(Action<IServiceCollection>? register = null)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddTransient<ISideEffect, ArchiveSideEffect>();
        register?.Invoke(services);
        return services.BuildServiceProvider().GetRequiredService<AppImplementationFactory>();
    }

    [Fact]
    public void Record_ResolvesTheRegisteredNameAndSerializesTheInput()
    {
        var queue = new SideEffectQueue();
        queue.Enqueue<ArchiveSideEffect>(new ArchiveRequest("case-42"));
        var carry = new WorkflowCallbackStateCarry();

        FailedProcessEngineCommandResult? refused = EnqueuedSideEffects.Record(queue, Factory(), carry, "Task_1");

        Assert.Null(refused);
        PendingSideEffect pending = Assert.Single(carry.PendingSideEffects!);
        Assert.Equal("archive", pending.Name);
        Assert.Equal("Task_1", pending.EnqueuedFrom);
        Assert.Equal("""{"caseId":"case-42"}""", pending.Input);
    }

    [Fact]
    public void Record_WithNothingEnqueued_RecordsNothing()
    {
        var carry = new WorkflowCallbackStateCarry();

        Assert.Null(EnqueuedSideEffects.Record(new SideEffectQueue(), Factory(), carry, "Task_1"));
        Assert.Null(carry.PendingSideEffects);
    }

    [Fact]
    public void Record_AnUnregisteredSideEffect_FailsPermanentlyAndRecordsNothing()
    {
        var queue = new SideEffectQueue();
        queue.Enqueue<ArchiveSideEffect>();
        queue.Enqueue<UnregisteredSideEffect>();
        var carry = new WorkflowCallbackStateCarry();

        FailedProcessEngineCommandResult? refused = EnqueuedSideEffects.Record(queue, Factory(), carry, "Task_1");

        Assert.NotNull(refused);
        Assert.True(refused.NonRetryable);
        Assert.Equal("SideEffectNotRegistered", refused.ExceptionType);
        Assert.Contains(nameof(UnregisteredSideEffect), refused.ErrorMessage, StringComparison.Ordinal);
        Assert.Null(carry.PendingSideEffects);
    }

    [Fact]
    public void Drain_TakesEveryPendingSideEffectOnce()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordPendingSideEffects([new PendingSideEffect { Name = "archive" }]);

        Assert.Single(carry.DrainPendingSideEffects());
        Assert.Empty(carry.DrainPendingSideEffects());
        Assert.Null(carry.PendingSideEffects);
    }

    /// <summary>
    /// A hook that runs before the commit enqueues its side effects into the carry, not straight into the engine:
    /// they wait for the transition to be saved.
    /// </summary>
    [Fact]
    public async Task OnTaskEndingHook_RecordsWhatTheHookEnqueued()
    {
        AppImplementationFactory factory = Factory(services =>
            services.AddSingleton<IOnTaskEndingHandler>(new EnqueuingEndingHandler())
        );
        var services = new ServiceCollection();
        services.AddSingleton(factory);
        var command = new OnTaskEndingHook(services.BuildServiceProvider());
        var carry = new WorkflowCallbackStateCarry();

        ProcessEngineCommandResult result = await command.Execute(CreateContext(carry));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        PendingSideEffect pending = Assert.Single(carry.PendingSideEffects!);
        Assert.Equal("archive", pending.Name);
        Assert.Equal("Task_1", pending.EnqueuedFrom);
        Assert.False(((IWorkflowEngineCommand)command).EnqueuesPendingSideEffects);
    }

    private sealed class EnqueuingEndingHandler : IOnTaskEndingHandler
    {
        public bool ShouldRunForTask(string taskId) => true;

        public Task<HookResult> Execute(OnTaskEndingContext context)
        {
            context.SideEffects.Enqueue<ArchiveSideEffect>(new ArchiveRequest("case-7"));
            return Task.FromResult<HookResult>(HookResult.Success());
        }
    }

    [Fact]
    public async Task ServiceTaskStage_ThatEnqueuesAndDefers_FailsPermanently()
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton<IPipelineServiceTask>(new EnqueueAndDeferTask());
        var command = new ExecuteServiceTask(
            services.BuildServiceProvider().GetRequiredService<AppImplementationFactory>(),
            TestMailboxDeliveryEnvelope.Create()
        );
        var carry = new WorkflowCallbackStateCarry();

        ProcessEngineCommandResult result = await command.Execute(
            CreateContext(carry),
            new ExecuteServiceTaskPayload("deferring", ItemIndex: 0)
        );

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("SideEffectsEnqueuedOnDeferral", failed.ExceptionType);
        Assert.Null(carry.PendingSideEffects);
    }

    private sealed class EnqueueAndDeferTask : IPipelineServiceTask
    {
        public string Type => "deferring";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline.Finally(context =>
            {
                context.SideEffects.Enqueue<ArchiveSideEffect>();
                return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Defer(TimeSpan.FromMinutes(1)));
            });
    }

    private static ProcessEngineCommandContext CreateContext(WorkflowCallbackStateCarry carry)
    {
        var instance = new Instance
        {
            Id = "1337/2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };
        var mutator = new Mock<IInstanceDataMutator>();
        mutator.Setup(x => x.Instance).Returns(instance);
        return new ProcessEngineCommandContext
        {
            StateCarry = carry,
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutator.Object,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = "test",
                Actor = new Actor { UserId = 1337 },
                ExecutionReferenceTime = new DateTimeOffset(2026, 8, 19, 10, 0, 0, TimeSpan.Zero),
                State = "{}",
                WorkflowId = Guid.NewGuid(),
                StepId = Guid.NewGuid(),
            },
        };
    }
}
