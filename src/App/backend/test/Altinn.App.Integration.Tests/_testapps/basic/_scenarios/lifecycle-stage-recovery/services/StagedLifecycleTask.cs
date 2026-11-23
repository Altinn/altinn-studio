using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Shared;

namespace Altinn.App.Integration.Tests.Scenarios.LifecycleStageRecovery;

/// <summary>
/// A task type whose start pipeline has two stages: "RecordStageA" saves a data element and completes;
/// "GateStageB" fails permanently while the scenario blocks it, then defers once and completes. The test
/// proves that recovery re-enters at stage B only, and that stage A's data survives. Every run logs its run number
/// via <see cref="SnapshotLogger"/>.
/// </summary>
public sealed class StagedLifecycleTask : IProcessTask
{
    public const string AttachmentDataType = "attachment";
    public const string AttachmentFilename = "stage-a.txt";

    public string Type => "staged-lifecycle";

    public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) =>
        pipeline.Stage(RecordStageA).Stage(GateStageB).Build();

    private static Task<StageResult> RecordStageA(StageContext context)
    {
        int run = LifecycleStageRecoveryState.NextRun("A");
        context.InstanceDataMutator.AddBinaryDataElement(
            AttachmentDataType,
            "text/plain",
            AttachmentFilename,
            Encoding.UTF8.GetBytes($"stage A run {run}")
        );
        SnapshotLogger.LogInfo($"Lifecycle.StageA.Run{run}.Completed");
        return Task.FromResult(StageResult.Completed());
    }

    private static Task<StageResult> GateStageB(StageContext context)
    {
        int run = LifecycleStageRecoveryState.NextRun("B");
        if (LifecycleStageRecoveryState.BlockStageB)
        {
            SnapshotLogger.LogInfo($"Lifecycle.StageB.Run{run}.FailedPermanent");
            return Task.FromResult(StageResult.FailedPermanent("Scenario stage B is blocked."));
        }

        if (LifecycleStageRecoveryState.DeferOnce())
        {
            SnapshotLogger.LogInfo($"Lifecycle.StageB.Run{run}.Defer");
            return Task.FromResult(StageResult.Defer(TimeSpan.FromMilliseconds(500), "scenario defers once"));
        }

        SnapshotLogger.LogInfo($"Lifecycle.StageB.Run{run}.Completed");
        return Task.FromResult(StageResult.Completed());
    }
}

public sealed class LifecycleStageRecoveryEndpoints : IEndpointConfigurator
{
    public void ConfigureEndpoints(WebApplication app)
    {
        app.MapPost(
            "/test/lifecycle-stage-recovery/reset",
            () =>
            {
                LifecycleStageRecoveryState.Reset();
                return Results.Ok();
            }
        );

        app.MapPost(
            "/test/lifecycle-stage-recovery/allow-stage-b",
            () =>
            {
                LifecycleStageRecoveryState.SetBlockStageB(false);
                return Results.Ok();
            }
        );
    }
}

internal static class LifecycleStageRecoveryState
{
    private static readonly object _lock = new();
    private static readonly Dictionary<string, int> _runs = new();
    private static bool _blockStageB = true;
    private static bool _deferred;

    public static bool BlockStageB
    {
        get
        {
            lock (_lock)
            {
                return _blockStageB;
            }
        }
    }

    public static void SetBlockStageB(bool block)
    {
        lock (_lock)
        {
            _blockStageB = block;
        }
    }

    /// <summary>The run number of this call of the stage, counted from one.</summary>
    public static int NextRun(string stage)
    {
        lock (_lock)
        {
            _runs[stage] = _runs.GetValueOrDefault(stage) + 1;
            return _runs[stage];
        }
    }

    /// <summary>True on the first call after the stage was allowed, so it defers exactly once.</summary>
    public static bool DeferOnce()
    {
        lock (_lock)
        {
            if (_deferred)
                return false;
            _deferred = true;
            return true;
        }
    }

    public static void Reset()
    {
        lock (_lock)
        {
            _runs.Clear();
            _blockStageB = true;
            _deferred = false;
        }
    }
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddTransient<IProcessTask, StagedLifecycleTask>();
        services.AddSingleton<IEndpointConfigurator, LifecycleStageRecoveryEndpoints>();
    }
}
