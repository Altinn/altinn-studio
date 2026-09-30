using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Shared;

namespace Altinn.App.Integration.Tests.Scenarios.WorkflowEngineFailure;

public sealed class FailingServiceTask : IServiceTask
{
    public string Type => "failing-service";

    public Task<ServiceTaskResult> Execute(ServiceTaskContext context)
    {
        if (WorkflowEngineFailureState.FailServiceTask)
        {
            return Task.FromResult<ServiceTaskResult>(
                ServiceTaskResult.FailedPermanent("Scenario service task failed permanently.")
            );
        }

        return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
    }
}

public sealed class WorkflowEngineFailureEndpoints : IEndpointConfigurator
{
    public void ConfigureEndpoints(WebApplication app)
    {
        app.MapPost(
            "/test/workflow-engine-failure/reset",
            () =>
            {
                WorkflowEngineFailureState.Reset();
                return Results.Ok();
            }
        );

        app.MapPost(
            "/test/workflow-engine-failure/allow-service-task",
            () =>
            {
                WorkflowEngineFailureState.SetFailServiceTask(false);
                return Results.Ok();
            }
        );
    }
}

internal static class WorkflowEngineFailureState
{
    private static readonly object _lock = new();
    private static bool _failServiceTask = true;

    public static bool FailServiceTask
    {
        get
        {
            lock (_lock)
            {
                return _failServiceTask;
            }
        }
    }

    public static void SetFailServiceTask(bool fail)
    {
        lock (_lock)
        {
            _failServiceTask = fail;
        }
    }

    public static void Reset() => SetFailServiceTask(true);
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddTransient<IServiceTask, FailingServiceTask>();
        services.AddSingleton<IEndpointConfigurator, WorkflowEngineFailureEndpoints>();
    }
}
