using System.Globalization;
using Altinn.Studio.Cli.Upgrade;

namespace Studioctl.Tests.Upgrade;

/// <summary>
/// Covers both destinations <see cref="UpgradeResultWriter"/> serves: a report for v9, and free text for
/// the upgrade kinds that do not report typed messages.
/// </summary>
public sealed class UpgradeResultWriterTests
{
    [Fact]
    public void Report_CollectsStepsAndMessagesInEmissionOrder()
    {
        var report = new UpgradeReport();

        using (UpgradeResultWriter.Use(report, TextWriter.Null))
        {
            UpgradeResultWriter.BeginStep("First");
            UpgradeResultWriter.Ok("ok");
            UpgradeResultWriter.Skip("skip");
            UpgradeResultWriter.BeginStep("Second");
            UpgradeResultWriter.Todo("todo");
            // A call site with no status of its own still lands on the current step, as neutral information.
            UpgradeResultWriter.WriteLine("Warning: something a leaf migrator wrote");
        }

        Assert.Equal(["First", "Second"], report.Steps.Select(step => step.Name));
        Assert.Equal(
            [(UpgradeMessageStatus.Ok, "ok"), (UpgradeMessageStatus.Skip, "skip")],
            report.Steps[0].Messages.Select(message => (message.Status, message.Text))
        );
        Assert.Equal(
            [
                (UpgradeMessageStatus.Todo, "todo"),
                (UpgradeMessageStatus.Info, "Warning: something a leaf migrator wrote"),
            ],
            report.Steps[1].Messages.Select(message => (message.Status, message.Text))
        );
    }

    [Fact]
    public void FreeText_WritesPlainText()
    {
        var output = new StringWriter(CultureInfo.InvariantCulture);
        var error = new StringWriter(CultureInfo.InvariantCulture);

        using (UpgradeResultWriter.Use(output, error))
        {
            // There are no steps to collect into, so the name becomes a line of its own, and a typed status
            // degrades to its plain text. Shared code can therefore report once for both destinations.
            UpgradeResultWriter.BeginStep("A step");
            UpgradeResultWriter.Ok("typed line");
            UpgradeResultWriter.WriteErrorLine("error line");
        }

        Assert.Equal($"A step{Environment.NewLine}typed line{Environment.NewLine}", output.ToString());
        Assert.Contains("error line", error.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public void MisuseThrows()
    {
        // No destination installed.
        Assert.Throws<InvalidOperationException>(() => UpgradeResultWriter.Ok("nope"));

        using (UpgradeResultWriter.Use(new UpgradeReport(), TextWriter.Null))
        {
            // A report has no output writer, and a message with no step is a bug: it surfaces rather than
            // landing in an invented step.
            Assert.Throws<InvalidOperationException>(() => UpgradeResultWriter.Out.WriteLine("nope"));
            var exception = Assert.Throws<InvalidOperationException>(() => UpgradeResultWriter.Ok("orphan"));
            Assert.Contains("No upgrade step has started", exception.Message, StringComparison.Ordinal);
        }
    }
}
