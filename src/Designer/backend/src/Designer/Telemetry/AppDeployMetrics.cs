using System;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;

namespace Altinn.Studio.Designer.Telemetry;

/// <summary>
/// Counts and times app deploys and undeploys. Each deploy's trace holds the same, but dashboards count from metrics
/// (https://github.com/Altinn/altinn-studio/issues/21073). A deploy has three phases, each with its own histogram: the
/// pipeline, from the request until Designer sees the pipeline finish; Flux, from there until Flux's result; and the
/// whole, from the request until its first result. They carry the service owner, so that dashboards can filter deploys
/// by it: there are a few hundred combinations of service owner, environment and result, well within the SDK's 2000
/// per metric. A failure carries error.type.
/// </summary>
public sealed class AppDeployMetrics
{
    public const string QueuedMetricName = "altinn.designer.app_deploy.queued";
    public const string PipelineDurationMetricName = "altinn.designer.app_deploy.pipeline.duration";
    public const string FluxDurationMetricName = "altinn.designer.app_deploy.flux.duration";
    public const string DurationMetricName = "altinn.designer.app_deploy.duration";

    /// <summary>
    /// The semantic conventions' duration of a pipeline run, in each of its states.
    /// </summary>
    public const string PipelineRunDurationMetricName = "cicd.pipeline.run.duration";

    /// <summary>
    /// The result and error.type of a deploy whose pipeline failed, and the error.type of the failed pipeline.
    /// </summary>
    public const string PipelineFailed = "pipeline_failed";

    /// <summary>
    /// The result of a deploy whose pipeline someone canceled. It is not an error.
    /// </summary>
    public const string PipelineCanceled = "pipeline_canceled";

    // A deploy's pipeline takes from a few minutes to a quarter of an hour, and Flux adds up to a few minutes.
    private static readonly double[] s_deployBuckets = [30, 60, 120, 180, 240, 300, 420, 600, 900, 1200, 1800, 3600];

    // Flux installs or upgrades an app in seconds to minutes, and a run can wait seconds or minutes for an agent.
    private static readonly double[] s_shortBuckets = [5, 10, 20, 30, 60, 90, 120, 180, 300, 600, 900, 1800];

    private readonly Counter<long> _queued;
    private readonly Histogram<double> _pipelineDuration;
    private readonly Histogram<double> _fluxDuration;
    private readonly Histogram<double> _duration;
    private readonly Histogram<double> _pipelineRunDuration;

    public AppDeployMetrics(IMeterFactory meterFactory)
    {
        Meter meter = meterFactory.Create(ServiceTelemetry.MeterName);
        _queued = meter.CreateCounter<long>(
            QueuedMetricName,
            unit: "{pipeline}",
            description: "Deploy and undeploy pipelines Designer queued in Azure DevOps."
        );
        _pipelineDuration = meter.CreateHistogram(
            PipelineDurationMetricName,
            unit: "s",
            description: "Time from a deploy or undeploy request until Designer saw its Azure DevOps pipeline finish.",
            tags: null,
            advice: new InstrumentAdvice<double> { HistogramBucketBoundaries = s_deployBuckets }
        );
        _fluxDuration = meter.CreateHistogram(
            FluxDurationMetricName,
            unit: "s",
            description: "Time from Designer seeing a deploy's or undeploy's pipeline succeed, when it asks the runtime "
                + "to reconcile, until Flux's install, upgrade or uninstall result.",
            tags: null,
            advice: new InstrumentAdvice<double> { HistogramBucketBoundaries = s_shortBuckets }
        );
        _duration = meter.CreateHistogram(
            DurationMetricName,
            unit: "s",
            description: "Time from a deploy or undeploy request until its result: Flux's install, upgrade or "
                + "uninstall result, or a pipeline that did not succeed.",
            tags: null,
            advice: new InstrumentAdvice<double> { HistogramBucketBoundaries = s_deployBuckets }
        );
        _pipelineRunDuration = meter.CreateHistogram(
            PipelineRunDurationMetricName,
            unit: "s",
            description: "Duration of a pipeline run grouped by pipeline, state and result.",
            tags: null,
            advice: new InstrumentAdvice<double> { HistogramBucketBoundaries = s_shortBuckets }
        );
    }

    public void RecordQueued(string serviceOwner, PipelineType type, string environment, AppDeployTrigger trigger)
    {
        TagList tags = Tags(serviceOwner, type, environment);
        tags.Add(ServiceTelemetry.Attributes.AppDeploy.Trigger, ServiceTelemetry.EnumValue(trigger));
        _queued.Add(1, tags);
    }

    public void RecordPipeline(
        string serviceOwner,
        PipelineType type,
        string environment,
        BuildResult result,
        TimeSpan duration
    )
    {
        TagList tags = Tags(serviceOwner, type, environment);
        tags.Add(ServiceTelemetry.Attributes.CicdPipelineResult, PipelineResult(result));
        if (IsPipelineFailure(result))
        {
            tags.Add(ServiceTelemetry.Attributes.ErrorType, PipelineFailed);
        }
        _pipelineDuration.Record(Seconds(duration), tags);
    }

    /// <summary>
    /// Records the time an Azure DevOps run waited in the queue and the time it ran, from Azure DevOps' own times.
    /// A run canceled before it started only waited.
    /// </summary>
    public void RecordPipelineRun(PipelineType type, string environment, BuildEntity build)
    {
        if (build.Queued is not { } queued || build.Finished is not { } finished)
        {
            return;
        }

        RecordPipelineRunState(type, environment, build, "pending", (build.Started ?? finished) - queued);
        if (build.Started is { } started)
        {
            RecordPipelineRunState(type, environment, build, "executing", finished - started);
        }
    }

    /// <summary>
    /// Records the time from Designer seeing the pipeline succeed until Flux's result.
    /// </summary>
    public void RecordFlux(
        string serviceOwner,
        PipelineType type,
        string environment,
        string result,
        string? errorType,
        TimeSpan duration
    ) => _fluxDuration.Record(Seconds(duration), ResultTags(serviceOwner, type, environment, result, errorType));

    /// <param name="serviceOwner">The app's service owner.</param>
    /// <param name="type">Whether it was a deploy or an undeploy.</param>
    /// <param name="environment">The environment deployed to.</param>
    /// <param name="result">One of Flux's install, upgrade and uninstall results in snake_case, or a pipeline's.</param>
    /// <param name="errorType">Why the deploy failed, or null when it did not.</param>
    /// <param name="duration">The time since the request.</param>
    public void RecordResult(
        string serviceOwner,
        PipelineType type,
        string environment,
        string result,
        string? errorType,
        TimeSpan duration
    ) => _duration.Record(Seconds(duration), ResultTags(serviceOwner, type, environment, result, errorType));

    /// <summary>
    /// The semantic conventions' cicd.pipeline.result for an Azure DevOps run's result. A partly succeeded run
    /// is a failure, since Designer goes on with a deploy only after a run that succeeded.
    /// </summary>
    public static string PipelineResult(BuildResult result) =>
        result switch
        {
            BuildResult.Succeeded => "success",
            BuildResult.Failed or BuildResult.PartiallySucceeded => "failure",
            BuildResult.Canceled => "cancellation",
            _ => "error",
        };

    /// <summary>
    /// Whether a completed run failed, as opposed to succeeding or being canceled.
    /// </summary>
    public static bool IsPipelineFailure(BuildResult result) =>
        result is not (BuildResult.Succeeded or BuildResult.Canceled);

    public static bool IsFluxFailure(DeployEventType result) =>
        result is DeployEventType.InstallFailed or DeployEventType.UpgradeFailed or DeployEventType.UninstallFailed;

    private void RecordPipelineRunState(
        PipelineType type,
        string environment,
        BuildEntity build,
        string state,
        TimeSpan duration
    )
    {
        // The service owner is left out: every app's runs share the pipeline and its agents.
        TagList tags = new()
        {
            { ServiceTelemetry.Attributes.AppDeploy.PipelineType, ServiceTelemetry.EnumValue(type) },
            { ServiceTelemetry.Attributes.Environment, ServiceTelemetry.RuntimeEnvironmentName(environment) },
            { ServiceTelemetry.Attributes.CicdPipelineRunState, state },
            { ServiceTelemetry.Attributes.CicdPipelineResult, PipelineResult(build.Result) },
        };
        if (build.PipelineName is { Length: > 0 } pipelineName)
        {
            tags.Add(ServiceTelemetry.Attributes.CicdPipelineName, pipelineName);
        }
        if (IsPipelineFailure(build.Result))
        {
            tags.Add(ServiceTelemetry.Attributes.ErrorType, PipelineFailed);
        }
        _pipelineRunDuration.Record(Seconds(duration), tags);
    }

    private static TagList ResultTags(
        string serviceOwner,
        PipelineType type,
        string environment,
        string result,
        string? errorType
    )
    {
        TagList tags = Tags(serviceOwner, type, environment);
        tags.Add(ServiceTelemetry.Attributes.AppDeploy.Result, result);
        if (errorType is not null)
        {
            tags.Add(ServiceTelemetry.Attributes.ErrorType, errorType);
        }
        return tags;
    }

    private static TagList Tags(string serviceOwner, PipelineType type, string environment) =>
        new()
        {
            { ServiceTelemetry.Attributes.ServiceOwner, serviceOwner.ToLowerInvariant() },
            { ServiceTelemetry.Attributes.AppDeploy.PipelineType, ServiceTelemetry.EnumValue(type) },
            { ServiceTelemetry.Attributes.Environment, ServiceTelemetry.RuntimeEnvironmentName(environment) },
        };

    private static double Seconds(TimeSpan duration) => Math.Max(duration.TotalSeconds, 0);
}

/// <summary>
/// What made Designer queue a deploy or undeploy pipeline.
/// </summary>
public enum AppDeployTrigger
{
    /// <summary>
    /// Someone asked for the deploy or undeploy.
    /// </summary>
    Manual,

    /// <summary>
    /// The nightly undeploy of an app nobody has used.
    /// </summary>
    Inactivity,
}
