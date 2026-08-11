using Altinn.Studio.Cli.Upgrade;

namespace Studioctl.Tests.Upgrade;

public sealed class UpgradeReportTests
{
    [Fact]
    public void Steps_AppearInBeginOrder_WithMessagesOnTheCurrentStep()
    {
        var report = new UpgradeReport();

        using (UpgradeResultWriter.Use(report, TextWriter.Null))
        {
            UpgradeResultWriter.BeginStep("First");
            UpgradeResultWriter.Ok("belongs to first");
            UpgradeResultWriter.BeginStep("Nothing to do");
            UpgradeResultWriter.BeginStep("Third");
            UpgradeResultWriter.Ok("belongs to third");
        }

        Assert.Equal(["First", "Nothing to do", "Third"], report.Steps.Select(step => step.Name));
        Assert.Equal(["belongs to first"], report.Steps[0].Messages.Select(message => message.Text));
        // A step with nothing to say still shows up: its bare name shows the step ran.
        Assert.Empty(report.Steps[1].Messages);
        Assert.Equal(["belongs to third"], report.Steps[2].Messages.Select(message => message.Text));
    }

    [Fact]
    public void Messages_KeepEmissionOrderAndStatus()
    {
        var report = new UpgradeReport();

        using (UpgradeResultWriter.Use(report, TextWriter.Null))
        {
            UpgradeResultWriter.BeginStep("Mixed");
            UpgradeResultWriter.Ok("ok");
            UpgradeResultWriter.Info("info");
            UpgradeResultWriter.Skip("skip");
            UpgradeResultWriter.Warning("warn");
            UpgradeResultWriter.Todo("todo");
            UpgradeResultWriter.Failed("failed");
        }

        var step = Assert.Single(report.Steps);
        Assert.Equal(
            [
                UpgradeMessageStatus.Ok,
                UpgradeMessageStatus.Info,
                UpgradeMessageStatus.Skip,
                UpgradeMessageStatus.Warning,
                UpgradeMessageStatus.Todo,
                UpgradeMessageStatus.Failed,
            ],
            step.Messages.Select(message => message.Status)
        );
        Assert.Equal(["ok", "info", "skip", "warn", "todo", "failed"], step.Messages.Select(message => message.Text));
    }
}
