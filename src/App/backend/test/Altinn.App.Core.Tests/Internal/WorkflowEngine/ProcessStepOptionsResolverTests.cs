using System.Reflection;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskAbandon;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class ProcessStepOptionsResolverTests
{
    private static ProcessStepOptionsResolver CreateResolver(Action<IServiceCollection> register)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        register(services);
        var sp = services.BuildServiceProvider();
        var appImplFactory = sp.GetRequiredService<AppImplementationFactory>();

        // ExecuteServiceTask is the only command declaring a tier-2 default (10 min) today.
        return new ProcessStepOptionsResolver([new ExecuteServiceTask(appImplFactory)], appImplFactory);
    }

    private static ProcessStepOptionsResolver CreateResolver(params IServiceTask[] serviceTasks) =>
        CreateResolver(services =>
        {
            foreach (var serviceTask in serviceTasks)
                services.AddSingleton(serviceTask);
        });

    /// <summary>
    /// A real fake rather than a Moq mock: resolving the conclusion's options composes the pipeline,
    /// and a mock bypasses the sealed <c>Define</c> default that produces it.
    /// </summary>
    private sealed class FakeServiceTask(string type, ProcessStepOptions? stepOptions) : IServiceTask
    {
        public string Type => type;

        public ProcessStepOptions? StepOptions => stepOptions;

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
    }

    private static IServiceTask ServiceTask(string type, ProcessStepOptions? stepOptions = null) =>
        new FakeServiceTask(type, stepOptions);

    private static Mock<IOnTaskStartingHandler> StartingHook(
        Func<string, bool> shouldRun,
        ProcessStepOptions? stepOptions
    )
    {
        var mock = new Mock<IOnTaskStartingHandler>();
        mock.Setup(h => h.ShouldRunForTask(It.IsAny<string>())).Returns<string>(t => shouldRun(t));
        if (stepOptions is not null)
            mock.Setup(h => h.StepOptions).Returns(stepOptions);
        return mock;
    }

    private static Mock<IOnTaskEndingHandler> EndingTaskHook(
        Func<string, bool> shouldRun,
        ProcessStepOptions? stepOptions
    )
    {
        var mock = new Mock<IOnTaskEndingHandler>();
        mock.Setup(h => h.ShouldRunForTask(It.IsAny<string>())).Returns<string>(t => shouldRun(t));
        if (stepOptions is not null)
            mock.Setup(h => h.StepOptions).Returns(stepOptions);
        return mock;
    }

    private static Mock<IOnTaskAbandonHandler> AbandonHook(
        Func<string, bool> shouldRun,
        ProcessStepOptions? stepOptions
    )
    {
        var mock = new Mock<IOnTaskAbandonHandler>();
        mock.Setup(h => h.ShouldRunForTask(It.IsAny<string>())).Returns<string>(t => shouldRun(t));
        if (stepOptions is not null)
            mock.Setup(h => h.StepOptions).Returns(stepOptions);
        return mock;
    }

    private static Mock<IOnProcessEndingHandler> EndingHook(ProcessStepOptions? stepOptions)
    {
        var mock = new Mock<IOnProcessEndingHandler>();
        if (stepOptions is not null)
            mock.Setup(h => h.StepOptions).Returns(stepOptions);
        return mock;
    }

    [Fact]
    public void Resolve_OrdinaryCommand_NoTierApplies_ReturnsNull()
    {
        var resolver = CreateResolver();

        var result = resolver.Resolve("StartTask", taskId: "Task_1", serviceTaskType: null);

        Assert.Null(result);
    }

    [Fact]
    public void Resolve_ServiceTask_NoImplementationOverride_UsesCommandDefault()
    {
        var resolver = CreateResolver(ServiceTask("signing"));

        var result = resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "signing");

        Assert.NotNull(result);
        Assert.Equal(ExecuteServiceTask.DefaultServiceTaskTimeout, result.MaxExecutionTime);
        Assert.Null(result.RetryStrategy);
    }

    [Fact]
    public void Resolve_ServiceTask_ImplementationTimeout_WinsOverCommandDefault()
    {
        var serviceTask = ServiceTask("signing", new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromHours(2) });
        var resolver = CreateResolver(serviceTask);

        var result = resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "signing");

        Assert.NotNull(result);
        Assert.Equal(TimeSpan.FromHours(2), result.MaxExecutionTime); // tier 3
        // The non-specified field falls through: ExecuteServiceTask has no tier-2 retry default, so null.
        Assert.Null(result.RetryStrategy);
    }

    [Fact]
    public void Resolve_ServiceTask_ImplementationBothFields_HonorsBothIndependently()
    {
        // An implementer may set BOTH fields; each resolves on its own (no all-or-nothing behavior).
        var serviceTask = ServiceTask(
            "signing",
            new ProcessStepOptions
            {
                MaxExecutionTime = TimeSpan.FromHours(2),
                RetryStrategy = ProcessStepRetryStrategy.Exponential(TimeSpan.FromSeconds(5), maxRetries: 3),
            }
        );
        var resolver = CreateResolver(serviceTask);

        var result = resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "signing");

        Assert.NotNull(result);
        Assert.Equal(TimeSpan.FromHours(2), result.MaxExecutionTime); // tier 3, overriding the 10 min tier-2 default
        Assert.NotNull(result.RetryStrategy); // tier 3
        Assert.Equal(TimeSpan.FromSeconds(5), result.RetryStrategy.BaseInterval);
        Assert.Equal(3, result.RetryStrategy.MaxRetries);
    }

    [Fact]
    public void Resolve_ServiceTask_ImplementationRetryOnly_FallsBackToCommandTimeout()
    {
        var serviceTask = ServiceTask(
            "signing",
            new ProcessStepOptions
            {
                RetryStrategy = ProcessStepRetryStrategy.Exponential(TimeSpan.FromSeconds(5), maxRetries: 3),
            }
        );
        var resolver = CreateResolver(serviceTask);

        var result = resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "signing");

        Assert.NotNull(result);
        Assert.Equal(ExecuteServiceTask.DefaultServiceTaskTimeout, result.MaxExecutionTime); // tier 2
        Assert.NotNull(result.RetryStrategy); // tier 3
        Assert.Equal(TimeSpan.FromSeconds(5), result.RetryStrategy.BaseInterval);
    }

    [Fact]
    public void Resolve_InvalidImplementationOptions_ThrowsAtResolve()
    {
        var serviceTask = ServiceTask(
            "signing",
            new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(-1) }
        );
        var resolver = CreateResolver(serviceTask);

        var ex = Assert.Throws<InvalidOperationException>(() =>
            resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "signing")
        );
        Assert.Contains(nameof(ProcessStepOptions.MaxExecutionTime), ex.Message);
    }

    [Fact]
    public void Resolve_ServiceTaskTypeDoesNotMatchAnyHandler_ReturnsCommandDefaultOnly()
    {
        // The command default (tier 2) still applies even when no service task matches the type.
        var resolver = CreateResolver(ServiceTask("signing"));

        var result = resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "payment");

        Assert.NotNull(result);
        Assert.Equal(ExecuteServiceTask.DefaultServiceTaskTimeout, result.MaxExecutionTime);
    }

    [Fact]
    public void Resolve_ProcessEndingHook_TaskIdNull_StillResolvesImplementationOptions()
    {
        // Regression guard: the process_EndEvent carries CurrentTask = null, so this step is always
        // resolved with taskId = null. Process-ending resolution must NOT be gated on taskId (unlike the
        // task hooks) or the handler's configured options would be silently dropped.
        var handler = EndingHook(new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(15) });
        var resolver = CreateResolver(services => services.AddSingleton<IOnProcessEndingHandler>(handler.Object));

        var result = resolver.Resolve(OnProcessEndingHook.Key, taskId: null, serviceTaskType: null);

        Assert.NotNull(result);
        Assert.Equal(TimeSpan.FromMinutes(15), result.MaxExecutionTime);
    }

    [Fact]
    public void Resolve_ProcessEndingHook_NoHandler_ReturnsNull()
    {
        var resolver = CreateResolver(_ => { });

        var result = resolver.Resolve(OnProcessEndingHook.Key, taskId: null, serviceTaskType: null);

        Assert.Null(result);
    }

    // The three task hooks (start/end/abandon) share identical resolution logic — matched by
    // ShouldRunForTask and gated on a non-null taskId — so they're exercised as theories over the key.
    public static TheoryData<string> TaskHookKeys =>
        new() { OnTaskStartingHook.Key, OnTaskEndingHook.Key, OnTaskAbandonHook.Key };

    private static Action<IServiceCollection> RegisterTaskHook(
        string operationId,
        Func<string, bool> shouldRun,
        ProcessStepOptions stepOptions
    ) =>
        operationId switch
        {
            _ when operationId == OnTaskStartingHook.Key => s =>
                s.AddSingleton<IOnTaskStartingHandler>(StartingHook(shouldRun, stepOptions).Object),
            _ when operationId == OnTaskEndingHook.Key => s =>
                s.AddSingleton<IOnTaskEndingHandler>(EndingTaskHook(shouldRun, stepOptions).Object),
            _ when operationId == OnTaskAbandonHook.Key => s =>
                s.AddSingleton<IOnTaskAbandonHandler>(AbandonHook(shouldRun, stepOptions).Object),
            _ => throw new ArgumentOutOfRangeException(nameof(operationId), operationId, "Not a task hook key"),
        };

    [Fact]
    public void Resolve_ServiceTask_WaitBudgetOnly_IsResolvedIndependently()
    {
        // A handler that only needs a longer wait allowance (an eFormidling poll, say) must not have to
        // restate the timeout or retry strategy: each field falls through its own tiers.
        var serviceTask = ServiceTask("eformidling", new ProcessStepOptions { WaitBudget = TimeSpan.FromDays(7) });
        var resolver = CreateResolver(serviceTask);

        var result = resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "eformidling");

        Assert.NotNull(result);
        Assert.Equal(TimeSpan.FromDays(7), result.WaitBudget);
        Assert.Equal(ExecuteServiceTask.DefaultServiceTaskTimeout, result.MaxExecutionTime); // tier 2
        Assert.Null(result.RetryStrategy);
    }

    [Fact]
    public void Resolve_ServiceTask_NonPositiveWaitBudget_ThrowsAtEnqueue()
    {
        var serviceTask = ServiceTask("signing", new ProcessStepOptions { WaitBudget = TimeSpan.Zero });
        var resolver = CreateResolver(serviceTask);

        var ex = Assert.Throws<InvalidOperationException>(() =>
            resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "signing")
        );

        Assert.Contains(nameof(ProcessStepOptions.WaitBudget), ex.Message, StringComparison.Ordinal);
    }

    [Theory]
    [MemberData(nameof(TaskHookKeys))]
    public void Resolve_TaskHook_MatchingTask_ResolvesImplementationOptions(string operationId)
    {
        var options = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(3) };
        var resolver = CreateResolver(RegisterTaskHook(operationId, t => t == "Task_1", options));

        var result = resolver.Resolve(operationId, taskId: "Task_1", serviceTaskType: null);

        Assert.NotNull(result);
        Assert.Equal(options.MaxExecutionTime, result.MaxExecutionTime);
    }

    [Theory]
    [MemberData(nameof(TaskHookKeys))]
    public void Resolve_TaskHook_NoHandlerMatchesTask_ReturnsNull(string operationId)
    {
        var options = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(3) };
        var resolver = CreateResolver(RegisterTaskHook(operationId, t => t == "Task_2", options));

        var result = resolver.Resolve(operationId, taskId: "Task_1", serviceTaskType: null);

        Assert.Null(result);
    }

    [Theory]
    [MemberData(nameof(TaskHookKeys))]
    public void Resolve_TaskHook_TaskIdNull_ReturnsNull(string operationId)
    {
        // Task hooks (unlike the process-ending hook) require a task to match against, so a null taskId
        // short-circuits to null even when a handler is registered.
        var options = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(3) };
        var resolver = CreateResolver(RegisterTaskHook(operationId, _ => true, options));

        var result = resolver.Resolve(operationId, taskId: null, serviceTaskType: null);

        Assert.Null(result);
    }

    // ── Pipeline service tasks: per-stage options (tier 3, two levels) ───────────────────────

    /// <summary>
    /// Task-level options (1 h timeout) with one stage overriding the timeout (2 h) and a second
    /// stage declaring only a wait budget.
    /// </summary>
    private sealed class PipelineTask : IPipelineServiceTask
    {
        public string Type => "pipeline";

        public ProcessStepOptions? StepOptions => new() { MaxExecutionTime = TimeSpan.FromHours(1) };

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(
                    "Entry",
                    _ => Task.FromResult(ServiceTaskStageResult.Completed()),
                    new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromHours(2) }
                )
                .Stage(
                    "Done",
                    _ => Task.FromResult(ServiceTaskStageResult.Completed()),
                    new ProcessStepOptions { WaitBudget = TimeSpan.FromHours(48) }
                )
                .Finally(
                    _ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()),
                    new ProcessStepOptions { WaitBudget = TimeSpan.FromHours(3) }
                );
    }

    private static ProcessStepOptionsResolver CreateResolverWithPipelineTask() =>
        CreateResolver(services => services.AddSingleton<IPipelineServiceTask, PipelineTask>());

    [Fact]
    public void Resolve_Stage_StageFieldWinsOverTaskField()
    {
        var resolver = CreateResolverWithPipelineTask();

        var result = resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "pipeline", "Entry");

        Assert.NotNull(result);
        Assert.Equal(TimeSpan.FromHours(2), result.MaxExecutionTime);
        Assert.Null(result.WaitBudget);
    }

    [Fact]
    public void Resolve_Stage_UnsetStageFieldFallsBackToTaskField()
    {
        var resolver = CreateResolverWithPipelineTask();

        var result = resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "pipeline", "Done");

        Assert.NotNull(result);
        Assert.Equal(TimeSpan.FromHours(1), result.MaxExecutionTime); // task level
        Assert.Equal(TimeSpan.FromHours(48), result.WaitBudget); // stage level
    }

    [Fact]
    public void Resolve_Stage_UnknownStageName_FallsBackToTaskOptions()
    {
        var resolver = CreateResolverWithPipelineTask();

        var result = resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "pipeline", "Nope");

        Assert.NotNull(result);
        Assert.Equal(TimeSpan.FromHours(1), result.MaxExecutionTime);
        Assert.Null(result.WaitBudget);
    }

    [Fact]
    public void Resolve_Conclusion_OwnOptionsWin_AndDoNotReachTheStages()
    {
        // The concluding engine step carries no stage name; its options come from Finally, with the
        // task's own as the fallback for whatever Finally leaves unset.
        var resolver = CreateResolverWithPipelineTask();

        var conclusion = resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "pipeline");

        Assert.NotNull(conclusion);
        Assert.Equal(TimeSpan.FromHours(3), conclusion.WaitBudget); // Finally's own
        Assert.Equal(TimeSpan.FromHours(1), conclusion.MaxExecutionTime); // falls back to the task's

        // The reason for declaring a wait budget on Finally rather than on the task: a stage that
        // never waits is not handed a budget it could never use.
        var entryStage = resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "pipeline", "Entry");

        Assert.NotNull(entryStage);
        Assert.Null(entryStage.WaitBudget);
    }

    /// <summary>
    /// Both merges in this resolver enumerate <see cref="ProcessStepOptions"/>' fields by hand — the
    /// step-over-task merge, and <c>Resolve</c>'s own merge with the command default. A field added to
    /// that record and forgotten in either place would be silently dropped for every service task.
    /// Record equality is what keeps this honest: the assertions never name a field, so they start
    /// failing on their own once one goes missing.
    /// </summary>
    [Fact]
    public void Resolve_ServiceTask_CarriesEveryStepOptionsField()
    {
        ProcessStepOptions everyField = new()
        {
            MaxExecutionTime = TimeSpan.FromMinutes(7),
            RetryStrategy = ProcessStepRetryStrategy.Constant(TimeSpan.FromSeconds(2), maxRetries: 4),
            WaitBudget = TimeSpan.FromHours(9),
        };

        // Tripwire for the fixture itself: a new field left unset here would be null on both sides of
        // every comparison below, which would pass while proving nothing.
        foreach (PropertyInfo property in typeof(ProcessStepOptions).GetProperties())
        {
            Assert.NotNull(property.GetValue(everyField));
        }

        // Declared on the conclusion, nothing at task level. The resolver builds a copy rather than
        // passing the instance through, so every field has to survive that copy.
        var declaredPerStep = CreateResolver(services =>
            services.AddSingleton<IPipelineServiceTask>(new PerStepOptionsTask(everyField))
        );
        Assert.Equal(everyField, declaredPerStep.Resolve(ExecuteServiceTask.Key, taskId: null, "per-step-options"));

        // Declared on a stage, which merges over the task's own.
        Assert.Equal(
            everyField,
            declaredPerStep.Resolve(ExecuteServiceTask.Key, taskId: null, "per-step-options", "Stage")
        );

        // Declared at task level, reaching the conclusion as its fallback.
        var declaredOnTask = CreateResolver(ServiceTask("task-options", everyField));
        Assert.Equal(everyField, declaredOnTask.Resolve(ExecuteServiceTask.Key, taskId: null, "task-options"));
    }

    private sealed class PerStepOptionsTask(ProcessStepOptions options) : IPipelineServiceTask
    {
        public string Type => "per-step-options";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage("Stage", _ => Task.FromResult(ServiceTaskStageResult.Completed()), options)
                .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()), options);
    }
}
