using System;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Shared;

#nullable enable

namespace Altinn.App.Integration.Tests.Scenarios.WorkflowEngineStepRerun;

/// <summary>
/// A task type whose start pipeline has two stages. "StoreFiles" saves two files and completes. "ReplaceAndRemove"
/// reads both, replaces one and removes the other. The scenario loses the answer to that stage's first run after the
/// app has saved, so the engine runs the stage again with the state its first run got, where Storage no longer has
/// either file as that state lists it.
/// </summary>
public sealed class RerunAfterSaveTask : IProcessTask
{
    public const string AttachmentDataType = "attachment";
    public const string ReplacedFilename = "replaced.txt";
    public const string RemovedFilename = "removed.txt";

    public string Type => "rerun-after-save";

    public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) =>
        pipeline
            .Stage(StoreFiles)
            .Stage(
                ReplaceAndRemove,
                // A short constant backoff, capped so that a regression fails the test fast.
                new ProcessStepOptions
                {
                    RetryStrategy = ProcessStepRetryStrategy.Constant(TimeSpan.FromSeconds(1), maxRetries: 3),
                }
            )
            .Build();

    private static Task<StageResult> StoreFiles(StageContext context)
    {
        IInstanceDataMutator data = context.InstanceDataMutator;
        data.AddBinaryDataElement(AttachmentDataType, "text/plain", ReplacedFilename, "replaced-v1"u8.ToArray());
        data.AddBinaryDataElement(AttachmentDataType, "text/plain", RemovedFilename, "removed-v1"u8.ToArray());
        SnapshotLogger.LogInfo($"StepRerun.StoreFiles.Run{StepRerunState.NextStoreFilesRun()}.Completed");
        return Task.FromResult(StageResult.Completed());
    }

    private static async Task<StageResult> ReplaceAndRemove(StageContext context)
    {
        int run = StepRerunState.NextReplaceAndRemoveRun();
        IInstanceDataMutator data = context.InstanceDataMutator;
        DataElement replaced = data.Instance.Data.Single(element => element.Filename == ReplacedFilename);
        DataElement removed = data.Instance.Data.Single(element => element.Filename == RemovedFilename);
        string replacedContent = Encoding.UTF8.GetString((await data.GetBinaryData(replaced)).ToArray());
        string removedContent = Encoding.UTF8.GetString((await data.GetBinaryData(removed)).ToArray());

        data.UpdateBinaryDataElement(replaced, "text/plain", "replaced-v2"u8.ToArray());
        data.RemoveDataElement(removed);

        if (run == 1)
        {
            AnswerLoss.LoseThisAnswer();
        }

        SnapshotLogger.LogInfo($"StepRerun.ReplaceAndRemove.Run{run}.Read:{replacedContent}+{removedContent}");
        return StageResult.Completed();
    }
}

/// <summary>
/// Answers the workflow engine with a 500 for a callback that asked for it, after the callback has saved to Storage
/// and built its answer. That is what the engine sees when the answer is lost on the way.
/// </summary>
public sealed class LoseAnswerFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        AnswerLoss.Marker marker = AnswerLoss.Begin();
        ActionExecutedContext executed = await next();
        if (marker.Lose && executed.Result is OkObjectResult)
        {
            SnapshotLogger.LogInfo("StepRerun.AnswerLost");
            executed.Result = new StatusCodeResult(StatusCodes.Status500InternalServerError);
        }
    }
}

internal static class AnswerLoss
{
    private static readonly AsyncLocal<Marker?> _current = new();

    public static Marker Begin()
    {
        var marker = new Marker();
        _current.Value = marker;
        return marker;
    }

    public static void LoseThisAnswer()
    {
        if (_current.Value is { } marker)
        {
            marker.Lose = true;
        }
    }

    internal sealed class Marker
    {
        public bool Lose { get; set; }
    }
}

internal static class StepRerunState
{
    private static int _storeFilesRuns;
    private static int _replaceAndRemoveRuns;

    /// <summary>The run number of this call of the stage, counted from one.</summary>
    public static int NextStoreFilesRun() => Interlocked.Increment(ref _storeFilesRuns);

    /// <summary>The run number of this call of the stage, counted from one.</summary>
    public static int NextReplaceAndRemoveRun() => Interlocked.Increment(ref _replaceAndRemoveRuns);

    public static void Reset()
    {
        Interlocked.Exchange(ref _storeFilesRuns, 0);
        Interlocked.Exchange(ref _replaceAndRemoveRuns, 0);
    }
}

public sealed class StepRerunEndpoints : IEndpointConfigurator
{
    public void ConfigureEndpoints(WebApplication app)
    {
        app.MapPost(
            "/test/workflow-engine-step-rerun/reset",
            () =>
            {
                StepRerunState.Reset();
                return Results.Ok();
            }
        );
    }
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddTransient<IProcessTask, RerunAfterSaveTask>();
        services.AddSingleton<IEndpointConfigurator, StepRerunEndpoints>();
        services.Configure<MvcOptions>(options => options.Filters.Add(new LoseAnswerFilter()));
    }
}
