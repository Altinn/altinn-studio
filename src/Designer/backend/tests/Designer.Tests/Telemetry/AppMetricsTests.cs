#nullable enable
using System;
using System.Collections.Generic;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Telemetry;
using Xunit;

namespace Designer.Tests.Telemetry;

public sealed class AppMetricsTests : IDisposable
{
    private readonly MetricsRecorder<AppMetrics> _recorder = new(meterFactory => new AppMetrics(meterFactory));

    private AppMetrics Metrics => _recorder.Metrics;

    [Fact]
    public void RecordDeployment_Production_UsesTheRuntimeName()
    {
        Metrics.RecordDeployment(
            "TTD",
            "production",
            DeploymentType.Deploy,
            DeployEventType.InstallSucceeded,
            first: true
        );

        RecordedMeasurement deployment = Assert.Single(_recorder.Measurements(AppMetrics.DeploymentsMetricName));
        Assert.Equal(
            new Dictionary<string, object?>
            {
                ["altinn.service_owner"] = "ttd",
                ["altinn.environment"] = "prod",
                ["altinn.designer.app.deployment.type"] = "deploy",
                ["altinn.designer.app.deployment.first"] = true,
            },
            deployment.Tags
        );
    }

    [Theory]
    [InlineData(DeployEventType.UninstallFailed, "uninstall_failed")]
    [InlineData(DeployEventType.PipelineFailed, "pipeline_failed")]
    public void RecordDeployment_Failure_SetsTheEventAsErrorType(DeployEventType outcome, string errorType)
    {
        Metrics.RecordDeployment("ttd", "tt02", DeploymentType.Decommission, outcome, first: null);

        RecordedMeasurement deployment = Assert.Single(_recorder.Measurements(AppMetrics.DeploymentsMetricName));
        Assert.Equal("decommission", deployment.Tags["altinn.designer.app.deployment.type"]);
        Assert.Equal(errorType, deployment.Tags["error.type"]);
        Assert.False(deployment.Tags.ContainsKey("altinn.designer.app.deployment.first"));
    }

    [Fact]
    public void AppCount_ReportsTheLatestCounts()
    {
        Metrics.SetAppCounts(new Dictionary<string, int> { ["ttd"] = 3, ["skd"] = 0 });
        Metrics.SetAppCounts(new Dictionary<string, int> { ["ttd"] = 4 });

        RecordedMeasurement count = Assert.Single(_recorder.Observe(AppMetrics.AppCountMetricName));
        Assert.Equal(4, count.Value);
        Assert.Equal("ttd", count.Tags["altinn.service_owner"]);
    }

    [Fact]
    public void DeployedAppCount_ReportsEachEnvironment()
    {
        Metrics.SetDeployedAppCounts([new("ttd", "production", 2), new("ttd", "tt02", 5)]);

        IReadOnlyList<RecordedMeasurement> counts = _recorder.Observe(AppMetrics.DeployedAppCountMetricName);
        Assert.Collection(
            counts,
            prod =>
            {
                Assert.Equal(2, prod.Value);
                Assert.Equal("prod", prod.Tags["altinn.environment"]);
            },
            tt02 =>
            {
                Assert.Equal(5, tt02.Value);
                Assert.Equal("tt02", tt02.Tags["altinn.environment"]);
            }
        );
    }

    [Fact]
    public void Counts_StopReportingWhenCountingFails()
    {
        Metrics.SetAppCounts(new Dictionary<string, int> { ["ttd"] = 3 });
        Metrics.SetDeployedAppCounts([new("ttd", "tt02", 5)]);

        Metrics.SetAppCounts(null);
        Metrics.SetDeployedAppCounts(null);

        Assert.Empty(_recorder.Observe(AppMetrics.AppCountMetricName));
        Assert.Empty(_recorder.Observe(AppMetrics.DeployedAppCountMetricName));
    }

    public void Dispose() => _recorder.Dispose();
}
