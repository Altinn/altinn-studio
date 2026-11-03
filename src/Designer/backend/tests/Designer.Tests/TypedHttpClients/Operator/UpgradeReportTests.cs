#nullable enable
using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using Altinn.Studio.Designer.TypedHttpClients.Operator.Models;
using Xunit;

namespace Designer.Tests.TypedHttpClients.Operator;

public class UpgradeReportTests
{
    // src/core/job-host/examples/upgrade-v9-report.json, the report of an upgrade of the v8 template.
    private static readonly string s_examplePath = Path.Combine(
        AppContext.BaseDirectory,
        "TypedHttpClients",
        "Operator",
        "upgrade-v9-report.json"
    );

    private static readonly string[] s_statuses =
    [
        UpgradeMessageStatus.Ok,
        UpgradeMessageStatus.Info,
        UpgradeMessageStatus.Skip,
        UpgradeMessageStatus.Warn,
        UpgradeMessageStatus.Todo,
        UpgradeMessageStatus.Fail,
    ];

    [Fact]
    public void ReadReport_ReadsTheReportOfARealUpgrade()
    {
        using var example = JsonDocument.Parse(File.ReadAllText(s_examplePath));
        var result = new RunResult(0, false, "", "", example.RootElement.Clone(), null);

        var report = result.ReadReport<UpgradeReport>();

        Assert.NotNull(report);
        Assert.Equal(UpgradeOutcome.Upgraded, report.Outcome);
        Assert.Equal("upgrade completed", report.Message);
        Assert.NotNull(report.Steps);
        Assert.Contains(report.Steps, step => step.Name == "Project file");
        var messages = report.Steps.SelectMany(step => step.Messages).ToList();
        Assert.All(messages, message => Assert.Contains(message.Status, s_statuses));
        Assert.Contains(messages, message => message.Status == UpgradeMessageStatus.Warn);
    }

    [Theory]
    [InlineData(0, nameof(UpgradeOutcome.Upgraded))]
    [InlineData(3, nameof(UpgradeOutcome.UpgradedWithManualSteps))]
    [InlineData(2, nameof(UpgradeOutcome.UnsupportedVersion))]
    [InlineData(1, nameof(UpgradeOutcome.Failed))]
    [InlineData(-1, nameof(UpgradeOutcome.Failed))]
    public void Outcome_SaysWhatTheExitCodeMeans(int exitCode, string expected)
    {
        Assert.Equal(Enum.Parse<UpgradeOutcome>(expected), new UpgradeReport(exitCode, null, null, []).Outcome);
    }

    [Fact]
    public void ReadReport_KeepsAStatusThatANewerStudioctlAdds()
    {
        using var json = JsonDocument.Parse(
            """{"exitCode":0,"steps":[{"name":"New step","messages":[{"text":"Hi","status":"NOTE"}]}]}"""
        );
        var result = new RunResult(0, false, "", "", json.RootElement.Clone(), null);

        var report = result.ReadReport<UpgradeReport>();

        Assert.Equal("NOTE", report!.Steps![0].Messages[0].Status);
    }

    [Fact]
    public void ReadReport_ReadsAReportWithoutSteps()
    {
        using var json = JsonDocument.Parse("""{"exitCode":1,"error":"The app has no project file.","steps":null}""");
        var result = new RunResult(1, false, "", "", json.RootElement.Clone(), null);

        var report = result.ReadReport<UpgradeReport>();

        Assert.Equal(UpgradeOutcome.Failed, report!.Outcome);
        Assert.Equal("The app has no project file.", report.Error);
        Assert.Null(report.Steps);
    }
}
