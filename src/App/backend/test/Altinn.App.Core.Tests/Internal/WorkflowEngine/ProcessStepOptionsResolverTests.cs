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
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
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
        return new ProcessStepOptionsResolver(
            [
                // Only its DefaultStepOptions are read here; nothing executes.
                new ExecuteServiceTask(appImplFactory, TestMailboxDeliveryEnvelope.Create()),
            ],
            appImplFactory
        );
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

        public Task<ServiceTaskResult> Execute(StageContext context) =>
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

    // The three task hooks (start/end/abandon) share identical resolution logic — matched by
    // ShouldRunForTask and gated on a non-null taskId — so they're exercised as theories over the key.
    public static TheoryData<string> TaskHookKeys =>
        new() { OnTaskStartingHook.Key, OnTaskEndingHook.Key, OnTaskAbandonHook.Key };

    private static Action<IServiceCollection> RegisterTaskHook(
        string commandKey,
        Func<string, bool> shouldRun,
        ProcessStepOptions stepOptions
    ) =>
        commandKey switch
        {
            _ when commandKey == OnTaskStartingHook.Key => s =>
                s.AddSingleton<IOnTaskStartingHandler>(StartingHook(shouldRun, stepOptions).Object),
            _ when commandKey == OnTaskEndingHook.Key => s =>
                s.AddSingleton<IOnTaskEndingHandler>(EndingTaskHook(shouldRun, stepOptions).Object),
            _ when commandKey == OnTaskAbandonHook.Key => s =>
                s.AddSingleton<IOnTaskAbandonHandler>(AbandonHook(shouldRun, stepOptions).Object),
            _ => throw new ArgumentOutOfRangeException(nameof(commandKey), commandKey, "Not a task hook key"),
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
    public void Resolve_TaskHook_MatchingTask_ResolvesImplementationOptions(string commandKey)
    {
        var options = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(3) };
        var resolver = CreateResolver(RegisterTaskHook(commandKey, t => t == "Task_1", options));

        var result = resolver.Resolve(commandKey, taskId: "Task_1", serviceTaskType: null);

        Assert.NotNull(result);
        Assert.Equal(options.MaxExecutionTime, result.MaxExecutionTime);
    }

    [Theory]
    [MemberData(nameof(TaskHookKeys))]
    public void Resolve_TaskHook_NoHandlerMatchesTask_ReturnsNull(string commandKey)
    {
        var options = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(3) };
        var resolver = CreateResolver(RegisterTaskHook(commandKey, t => t == "Task_2", options));

        var result = resolver.Resolve(commandKey, taskId: "Task_1", serviceTaskType: null);

        Assert.Null(result);
    }

    [Theory]
    [MemberData(nameof(TaskHookKeys))]
    public void Resolve_TaskHook_TaskIdNull_ReturnsNull(string commandKey)
    {
        // Task hooks (unlike the process-ending hook) require a task to match against, so a null taskId
        // short-circuits to null even when a handler is registered.
        var options = new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(3) };
        var resolver = CreateResolver(RegisterTaskHook(commandKey, _ => true, options));

        var result = resolver.Resolve(commandKey, taskId: null, serviceTaskType: null);

        Assert.Null(result);
    }

    // ── Service task items: the item's own options over the task's (tier 3, two levels) ──────

    /// <summary>A task with task-level options (a 1 h timeout). What an item declares rides its step.</summary>
    private static ProcessStepOptionsResolver CreateResolverWithPipelineTask() =>
        CreateResolver(ServiceTask("pipeline", new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromHours(1) }));

    [Fact]
    public void Resolve_Stage_StageFieldWinsOverTaskField()
    {
        var resolver = CreateResolverWithPipelineTask();

        var result = resolver.Resolve(
            ExecuteServiceTask.Key,
            taskId: null,
            serviceTaskType: "pipeline",
            stageOptions: new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromHours(2) }
        );

        Assert.NotNull(result);
        Assert.Equal(TimeSpan.FromHours(2), result.MaxExecutionTime);
        Assert.Null(result.WaitBudget);
    }

    [Fact]
    public void Resolve_Stage_UnsetStageFieldFallsBackToTaskField()
    {
        var resolver = CreateResolverWithPipelineTask();

        var result = resolver.Resolve(
            ExecuteServiceTask.Key,
            taskId: null,
            serviceTaskType: "pipeline",
            stageOptions: new ProcessStepOptions { WaitBudget = TimeSpan.FromHours(48) }
        );

        Assert.NotNull(result);
        Assert.Equal(TimeSpan.FromHours(1), result.MaxExecutionTime); // task level
        Assert.Equal(TimeSpan.FromHours(48), result.WaitBudget); // stage level
    }

    [Fact]
    public void Resolve_ServiceTaskStep_WithoutItemOptions_UsesTheTasksOptions()
    {
        var resolver = CreateResolverWithPipelineTask();

        var result = resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "pipeline");

        Assert.NotNull(result);
        Assert.Equal(TimeSpan.FromHours(1), result.MaxExecutionTime);
        Assert.Null(result.WaitBudget);
    }

    [Fact]
    public void Resolve_Conclusion_OwnOptionsWin_AndDoNotReachTheStages()
    {
        var resolver = CreateResolverWithPipelineTask();

        var conclusion = resolver.Resolve(
            ExecuteServiceTask.Key,
            taskId: null,
            serviceTaskType: "pipeline",
            stageOptions: new ProcessStepOptions { WaitBudget = TimeSpan.FromHours(3) }
        );

        Assert.NotNull(conclusion);
        Assert.Equal(TimeSpan.FromHours(3), conclusion.WaitBudget); // Finally's own
        Assert.Equal(TimeSpan.FromHours(1), conclusion.MaxExecutionTime); // falls back to the task's

        // The reason for declaring a wait budget on Finally rather than on the task: a stage that
        // never waits is not handed a budget it could never use.
        var entryStage = resolver.Resolve(
            ExecuteServiceTask.Key,
            taskId: null,
            serviceTaskType: "pipeline",
            stageOptions: new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromHours(2) }
        );

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

        // Declared on an item, with nothing at task level. The resolver builds a copy rather than passing the
        // instance through, so every field has to survive that copy.
        var declaredPerStep = CreateResolver(ServiceTask("per-step-options"));
        Assert.Equal(
            everyField,
            declaredPerStep.Resolve(ExecuteServiceTask.Key, taskId: null, "per-step-options", everyField)
        );
        // Declared at task level, reaching a step that declares nothing of its own, as the fallback.
        var declaredOnTask = CreateResolver(ServiceTask("task-options", everyField));
        Assert.Equal(everyField, declaredOnTask.Resolve(ExecuteServiceTask.Key, taskId: null, "task-options"));
    }

    /// <summary>
    /// The handler's own options ride the step, so every hop that enqueues a receiver resolves them the same way
    /// by construction: the planner's receive workflows and the relay's successor receivers build the step alike.
    /// </summary>
    [Fact]
    public void ApplyStepOptions_ReceiveStep_ResolvesTheAnsweringHandlersOptions()
    {
        ProcessStepOptionsResolver resolver = CreateResolverWithPipelineTask();

        StepRequest resolved = WorkflowCommandSet
            .CreateItemStep(
                "pipeline",
                itemIndex: 1,
                new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromHours(2) }
            )
            .ApplyStepOptions(resolver, taskId: null, serviceTaskType: "pipeline");

        Assert.Equal(TimeSpan.FromHours(2), resolved.Command.MaxExecutionTime); // the handler's own
        Assert.Null(resolved.Command.WaitBudget); // the task's, never another item's
    }

    // ── The key resolution keys off ─────────────────────────────────────────────────────────────

    /// <summary>
    /// A step whose OperationId is a display identity (a pipeline stage or the mailbox mint, both of which
    /// append the item index) must still resolve its command's own tier-2 default. Keying off the OperationId
    /// instead would miss <c>_commandDefaults</c> silently: the miss looks exactly like "this command
    /// declares no default", so a command that does declare one would have it dropped without a sound.
    /// </summary>
    [Theory]
    [InlineData(0)]
    [InlineData(null)]
    public void ApplyStepOptions_StepWithADisplayOperationId_StillFindsTheCommandsOwnDefault(int? serviceTaskItemIndex)
    {
        ProcessStepOptionsResolver resolver = CreateResolver(_ => { });

        StepRequest resolved = new StepRequest
        {
            OperationId = $"{ExecuteServiceTask.Key}: {serviceTaskItemIndex?.ToString() ?? "Anything"}",
            Command = CommandDefinition.Create(
                "app",
                new AppCommandData { CommandKey = ExecuteServiceTask.Key, Payload = null }
            ),
            CommandKey = ExecuteServiceTask.Key,
        }.ApplyStepOptions(resolver, taskId: null, serviceTaskType: null);

        Assert.Equal(ExecuteServiceTask.DefaultServiceTaskTimeout, resolved.Command.MaxExecutionTime);
    }

    /// <summary>
    /// The four steps the factory inserts carry no <see cref="StepRequest.CommandKey"/>, so the fallback to
    /// OperationId — which is their command key — has to keep resolving them.
    /// </summary>
    [Fact]
    public void ApplyStepOptions_StepWithoutACommandKey_FallsBackToTheOperationId()
    {
        ProcessStepOptionsResolver resolver = CreateResolver(_ => { });

        StepRequest resolved = new StepRequest
        {
            OperationId = ExecuteServiceTask.Key,
            Command = CommandDefinition.Create(
                "app",
                new AppCommandData { CommandKey = ExecuteServiceTask.Key, Payload = null }
            ),
        }.ApplyStepOptions(resolver, taskId: null, serviceTaskType: null);

        Assert.Equal(ExecuteServiceTask.DefaultServiceTaskTimeout, resolved.Command.MaxExecutionTime);
    }
}
