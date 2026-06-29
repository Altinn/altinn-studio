using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Shared;

namespace Altinn.App.Integration.Tests.Scenarios.WorkflowEngineHooks;

public sealed class Task1StartingHook : IOnTaskStartingHandler
{
    public bool ShouldRunForTask(string taskId) => taskId == "Task_1";

    public Task<HookResult> Execute(OnTaskStartingContext context)
    {
        SnapshotLogger.LogInfo("WorkflowEngineHooks.OnTaskStarting.Task_1");
        return Task.FromResult<HookResult>(HookResult.Success());
    }
}

public sealed class ServiceTaskStartingHook : IOnTaskStartingHandler
{
    public bool ShouldRunForTask(string taskId) => taskId == "Task_Service";

    public Task<HookResult> Execute(OnTaskStartingContext context)
    {
        SnapshotLogger.LogInfo("WorkflowEngineHooks.OnTaskStarting.Task_Service");
        return Task.FromResult<HookResult>(HookResult.Success());
    }
}

public sealed class Task1EndingHook : IOnTaskEndingHandler
{
    public bool ShouldRunForTask(string taskId) => taskId == "Task_1";

    public Task<HookResult> Execute(OnTaskEndingContext context)
    {
        if (WorkflowEngineHooksState.FailTask1Ending)
        {
            SnapshotLogger.LogInfo("WorkflowEngineHooks.OnTaskEnding.Task_1.Failed");
            return Task.FromResult<HookResult>(HookResult.FailedPermanent("Scenario task ending failed permanently."));
        }

        SnapshotLogger.LogInfo("WorkflowEngineHooks.OnTaskEnding.Task_1.Success");
        return Task.FromResult<HookResult>(HookResult.Success());
    }
}

public sealed class ServiceTaskEndingHook : IOnTaskEndingHandler
{
    public bool ShouldRunForTask(string taskId) => taskId == "Task_Service";

    public Task<HookResult> Execute(OnTaskEndingContext context)
    {
        SnapshotLogger.LogInfo("WorkflowEngineHooks.OnTaskEnding.Task_Service");
        return Task.FromResult<HookResult>(HookResult.Success());
    }
}

public sealed class Task1AbandonHook : IOnTaskAbandonHandler
{
    public bool ShouldRunForTask(string taskId) => taskId == "Task_1";

    public Task<HookResult> Execute(OnTaskAbandonContext context)
    {
        SnapshotLogger.LogInfo("WorkflowEngineHooks.OnTaskAbandon.Task_1");
        return Task.FromResult<HookResult>(HookResult.Success());
    }
}

public sealed class ProcessEndingHook : IOnProcessEndingHandler
{
    public Task<HookResult> Execute(OnProcessEndingContext context)
    {
        SnapshotLogger.LogInfo("WorkflowEngineHooks.OnProcessEnding");
        return Task.FromResult<HookResult>(HookResult.Success());
    }
}

public sealed class WorkflowHookServiceTask : IServiceTask
{
    public string Type => "write";

    public Task<ServiceTaskResult> Execute(ServiceTaskContext context)
    {
        SnapshotLogger.LogInfo("WorkflowEngineHooks.IServiceTask.Execute.Success");
        return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
    }
}

public sealed class WorkflowEngineHookEndpoints : IEndpointConfigurator
{
    public void ConfigureEndpoints(WebApplication app)
    {
        app.MapPost(
            "/test/workflow-engine-hooks/reset",
            () =>
            {
                WorkflowEngineHooksState.Reset();
                return Results.Ok();
            }
        );

        app.MapPost(
            "/test/workflow-engine-hooks/fail-task-ending",
            () =>
            {
                WorkflowEngineHooksState.SetFailTask1Ending(true);
                return Results.Ok();
            }
        );

        app.MapPost(
            "/test/workflow-engine-hooks/allow-task-ending",
            () =>
            {
                WorkflowEngineHooksState.SetFailTask1Ending(false);
                return Results.Ok();
            }
        );
    }
}

internal static class WorkflowEngineHooksState
{
    private static readonly object _lock = new();
    private static bool _failTask1Ending;

    public static bool FailTask1Ending
    {
        get
        {
            lock (_lock)
            {
                return _failTask1Ending;
            }
        }
    }

    public static void SetFailTask1Ending(bool fail)
    {
        lock (_lock)
        {
            _failTask1Ending = fail;
        }
    }

    public static void Reset() => SetFailTask1Ending(false);
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddTransient<IOnTaskStartingHandler, Task1StartingHook>();
        services.AddTransient<IOnTaskStartingHandler, ServiceTaskStartingHook>();
        services.AddTransient<IOnTaskEndingHandler, Task1EndingHook>();
        services.AddTransient<IOnTaskEndingHandler, ServiceTaskEndingHook>();
        services.AddTransient<IOnTaskAbandonHandler, Task1AbandonHook>();
        services.AddTransient<IOnProcessEndingHandler, ProcessEndingHook>();
        services.AddTransient<IServiceTask, WorkflowHookServiceTask>();
        services.AddSingleton<IEndpointConfigurator, WorkflowEngineHookEndpoints>();
    }
}
