using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Shared;

namespace Altinn.App.Integration.Tests.Scenarios.WorkflowEnginePipeline;

/// <summary>
/// A three-part pipeline whose middle part misbehaves on purpose, so the test can prove the
/// composition property no unit test spans: a completed stage never re-runs while a later part
/// retries and defers — re-entry lands on the failed/deferred part, and only there.
///
/// Part 1 (stage "ReserveResources") completes on its first run. Part 2 (stage "DispatchOrder")
/// fails retryably on run 1, defers on run 2, and completes on run 3 — exercising BOTH re-entry
/// paths on the same stage. Part 3 (the Finally, "ConfirmOrder") succeeds. Every run of every
/// part logs its own run number via <see cref="SnapshotLogger"/>; the test asserts the exact
/// sequence and, crucially, the absence of a second run of parts 1 and 3.
/// </summary>
public sealed class ThreePartPipelineTask : IPipelineServiceTask
{
    public string Type => "pipeline";

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder task) =>
        task.Stage("ReserveResources", ReserveResources)
            .Stage(
                "DispatchOrder",
                DispatchOrder,
                // Tight constant backoff so run 1's retryable failure re-runs quickly; capped so a
                // regression fails the test fast instead of eating the whole retry budget.
                new ProcessStepOptions
                {
                    RetryStrategy = ProcessStepRetryStrategy.Constant(TimeSpan.FromSeconds(1), maxRetries: 3),
                }
            )
            .Finally(ConfirmOrder);

    private Task<ServiceTaskStageResult> ReserveResources(ServiceTaskContext context)
    {
        int run = PipelineRunCounter.NextRun("ReserveResources");
        SnapshotLogger.LogInfo($"Pipeline.ReserveResources.Run{run}.Completed");
        return Task.FromResult(ServiceTaskStageResult.Completed());
    }

    private Task<ServiceTaskStageResult> DispatchOrder(ServiceTaskContext context)
    {
        int run = PipelineRunCounter.NextRun("DispatchOrder");
        switch (run)
        {
            case 1:
                SnapshotLogger.LogInfo($"Pipeline.DispatchOrder.Run{run}.FailedRetryable");
                return Task.FromResult(ServiceTaskStageResult.FailedRetryable("Scenario dispatch failed transiently."));
            case 2:
                SnapshotLogger.LogInfo($"Pipeline.DispatchOrder.Run{run}.Defer");
                return Task.FromResult(
                    ServiceTaskStageResult.Defer(TimeSpan.FromSeconds(1), "scenario dispatch awaiting a queue slot")
                );
            default:
                SnapshotLogger.LogInfo($"Pipeline.DispatchOrder.Run{run}.Completed");
                return Task.FromResult(ServiceTaskStageResult.Completed());
        }
    }

    private Task<ServiceTaskResult> ConfirmOrder(ServiceTaskContext context)
    {
        int run = PipelineRunCounter.NextRun("ConfirmOrder");
        SnapshotLogger.LogInfo($"Pipeline.ConfirmOrder.Run{run}.Success");
        return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
    }
}

/// <summary>
/// Run counters keyed by part name, surviving across callbacks (each callback resolves a fresh
/// transient task instance). Reset between tests via the scenario endpoint.
/// </summary>
internal static class PipelineRunCounter
{
    private static readonly object _lock = new();
    private static readonly Dictionary<string, int> _runs = new(StringComparer.Ordinal);

    public static int NextRun(string part)
    {
        lock (_lock)
        {
            int run = _runs.GetValueOrDefault(part) + 1;
            _runs[part] = run;
            return run;
        }
    }

    public static void Reset()
    {
        lock (_lock)
        {
            _runs.Clear();
        }
    }
}

public sealed class WorkflowEnginePipelineEndpoints : IEndpointConfigurator
{
    public void ConfigureEndpoints(WebApplication app)
    {
        app.MapPost(
            "/test/workflow-engine-pipeline/reset",
            () =>
            {
                PipelineRunCounter.Reset();
                return Results.Ok();
            }
        );
    }
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddTransient<IPipelineServiceTask, ThreePartPipelineTask>();
        services.AddSingleton<IEndpointConfigurator, WorkflowEnginePipelineEndpoints>();
    }
}
