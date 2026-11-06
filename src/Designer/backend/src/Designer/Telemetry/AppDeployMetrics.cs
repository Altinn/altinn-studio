using System;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;

namespace Altinn.Studio.Designer.Telemetry;

/// <summary>
/// Times app deploys and undeploys from the request to Designer. Each deploy's trace holds the same, but dashboards
/// count from metrics (https://github.com/Altinn/altinn-studio/issues/21073). The histograms' counts are the number
/// of pipelines and deploys. A failure carries error.type.
/// </summary>
public sealed class AppDeployMetrics
{
    public const string PipelineDurationMetricName = "altinn.designer.app_deploy.pipeline.duration";
    public const string DurationMetricName = "altinn.designer.app_deploy.duration";

    // A deploy's pipeline takes from a few minutes to a quarter of an hour, and Flux adds up to a few minutes.
    private static readonly double[] s_bucketBoundaries = [30, 60, 120, 180, 240, 300, 420, 600, 900, 1200, 1800, 3600];

    private readonly Histogram<double> _pipelineDuration;
    private readonly Histogram<double> _duration;

    public AppDeployMetrics(IMeterFactory meterFactory)
    {
        Meter meter = meterFactory.Create(ServiceTelemetry.MeterName);
        _pipelineDuration = meter.CreateHistogram(
            PipelineDurationMetricName,
            unit: "s",
            description: "Time from a deploy or undeploy request until Designer saw its Azure DevOps pipeline finish.",
            tags: null,
            advice: new InstrumentAdvice<double> { HistogramBucketBoundaries = s_bucketBoundaries }
        );
        _duration = meter.CreateHistogram(
            DurationMetricName,
            unit: "s",
            description: "Time from a deploy or undeploy request until its result: Flux's install, upgrade or "
                + "uninstall result, or a pipeline that did not succeed.",
            tags: null,
            advice: new InstrumentAdvice<double> { HistogramBucketBoundaries = s_bucketBoundaries }
        );
    }

    public void RecordPipeline(PipelineType type, string environment, BuildResult result, TimeSpan duration)
    {
        TagList tags = Tags(type, environment);
        tags.Add(ServiceTelemetry.Attributes.AppDeploy.PipelineResult, ServiceTelemetry.EnumValue(result));
        if (result != BuildResult.Succeeded)
        {
            tags.Add(ServiceTelemetry.Attributes.ErrorType, ServiceTelemetry.EnumValue(result));
        }
        _pipelineDuration.Record(Seconds(duration), tags);
    }

    /// <param name="type">Whether it was a deploy or an undeploy.</param>
    /// <param name="environment">The environment deployed to.</param>
    /// <param name="result">PipelineFailed, or one of Flux's install, upgrade and uninstall results.</param>
    /// <param name="duration">The time since the request.</param>
    public void RecordResult(PipelineType type, string environment, DeployEventType result, TimeSpan duration)
    {
        TagList tags = Tags(type, environment);
        tags.Add(ServiceTelemetry.Attributes.AppDeploy.Result, ServiceTelemetry.EnumValue(result));
        if (IsFailure(result))
        {
            tags.Add(ServiceTelemetry.Attributes.ErrorType, ServiceTelemetry.EnumValue(result));
        }
        _duration.Record(Seconds(duration), tags);
    }

    public static bool IsFailure(DeployEventType result) =>
        result
            is DeployEventType.PipelineFailed
                or DeployEventType.InstallFailed
                or DeployEventType.UpgradeFailed
                or DeployEventType.UninstallFailed;

    private static TagList Tags(PipelineType type, string environment) =>
        new()
        {
            { ServiceTelemetry.Attributes.AppDeploy.PipelineType, ServiceTelemetry.EnumValue(type) },
            { ServiceTelemetry.Attributes.Environment, ServiceTelemetry.RuntimeEnvironmentName(environment) },
        };

    private static double Seconds(TimeSpan duration) => Math.Max(duration.TotalSeconds, 0);
}
