using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
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

    private static Mock<IServiceTask> ServiceTask(string type, ProcessStepOptions? stepOptions = null)
    {
        var mock = new Mock<IServiceTask>();
        mock.Setup(t => t.Type).Returns(type);
        if (stepOptions is not null)
            mock.Setup(t => t.StepOptions).Returns(stepOptions);
        return mock;
    }

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
        var resolver = CreateResolver(ServiceTask("signing").Object);

        var result = resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "signing");

        Assert.NotNull(result);
        Assert.Equal(ExecuteServiceTask.DefaultServiceTaskTimeout, result.MaxExecutionTime);
        Assert.Null(result.RetryStrategy);
    }

    [Fact]
    public void Resolve_ServiceTask_ImplementationTimeout_WinsOverCommandDefault()
    {
        var serviceTask = ServiceTask("signing", new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromHours(2) });
        var resolver = CreateResolver(serviceTask.Object);

        var result = resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "signing");

        Assert.NotNull(result);
        Assert.Equal(TimeSpan.FromHours(2), result.MaxExecutionTime); // tier 3
        // The non-specified field falls through: ExecuteServiceTask has no tier-2 retry default, so null.
        Assert.Null(result.RetryStrategy);
    }

    [Fact]
    public void Resolve_ServiceTask_ImplementationBothFields_HonorsBothIndependently()
    {
        // An implementer may set BOTH fields; each resolves on its own (no all-or-nothing behaviour).
        var serviceTask = ServiceTask(
            "signing",
            new ProcessStepOptions
            {
                MaxExecutionTime = TimeSpan.FromHours(2),
                RetryStrategy = ProcessStepRetryStrategy.Exponential(TimeSpan.FromSeconds(5), maxRetries: 3),
            }
        );
        var resolver = CreateResolver(serviceTask.Object);

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
        var resolver = CreateResolver(serviceTask.Object);

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
        var resolver = CreateResolver(serviceTask.Object);

        var ex = Assert.Throws<InvalidOperationException>(() =>
            resolver.Resolve(ExecuteServiceTask.Key, taskId: null, serviceTaskType: "signing")
        );
        Assert.Contains(nameof(ProcessStepOptions.MaxExecutionTime), ex.Message);
    }

    [Fact]
    public void Resolve_ServiceTaskTypeDoesNotMatchAnyHandler_ReturnsCommandDefaultOnly()
    {
        // The command default (tier 2) still applies even when no service task matches the type.
        var resolver = CreateResolver(ServiceTask("signing").Object);

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
}
