using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Shared;

namespace Altinn.App.Integration.Tests.Scenarios.InstanceLock;

public sealed class WaitForReleaseProcessTaskEnd : IProcessTask
{
    private static TaskCompletionSource _signal = new();
    public string Type => AltinnTaskTypes.Data;

    public IReadOnlyList<WorkflowCommandRef> GetEndCommands(string taskId) =>
        [new WorkflowCommandRef(WaitForReleaseCommand.Key)];

    public static void Release()
    {
        _signal.TrySetResult();
    }

    public static void Reset()
    {
        _signal.TrySetResult();
        _signal = new TaskCompletionSource();
    }

    public sealed class WaitForReleaseCommand : IWorkflowEngineCommand
    {
        public static string Key => "WaitForRelease";

        public string GetKey() => Key;

        public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context)
        {
            await _signal.Task;
            return ProcessEngineCommandResult.Completed();
        }
    }
}

public sealed class WaitForReleaseProcessTaskEndEndpoints : IEndpointConfigurator
{
    public void ConfigureEndpoints(WebApplication app)
    {
        app.MapPost(
            "/test/instance-lock/release-wait",
            () =>
            {
                WaitForReleaseProcessTaskEnd.Release();
                return Results.Ok();
            }
        );

        app.MapPost(
            "/test/instance-lock/reset",
            () =>
            {
                WaitForReleaseProcessTaskEnd.Reset();
                return Results.Ok();
            }
        );
    }
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddTransient<IProcessTask, WaitForReleaseProcessTaskEnd>();
        services.AddTransient<IWorkflowEngineCommand, WaitForReleaseProcessTaskEnd.WaitForReleaseCommand>();
        services.AddSingleton<IEndpointConfigurator, WaitForReleaseProcessTaskEndEndpoints>();
    }
}
