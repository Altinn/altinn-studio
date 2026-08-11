using System.Globalization;
using Altinn.Studio.Cli.Upgrade;

namespace Studioctl.Tests.Upgrade;

/// <summary>
/// Covers both destinations <see cref="UpgradeResultWriter"/> serves while the upgrade paths are being
/// converted: free text for the kinds that do not report typed messages, and a report for v9.
/// </summary>
public sealed class UpgradeResultWriterTests
{
    private static StringWriter NewWriter() => new(CultureInfo.InvariantCulture);

    [Fact]
    public void FreeText_WritesPlainText()
    {
        var output = NewWriter();
        var error = NewWriter();

        using (UpgradeResultWriter.Use(output, error))
        {
            UpgradeResultWriter.WriteLine("plain line");
            // A typed status degrades to its plain text, so shared code can report once for both destinations.
            UpgradeResultWriter.Ok("typed line");
            UpgradeResultWriter.WriteErrorLine("error line");
        }

        Assert.Equal($"plain line{Environment.NewLine}typed line{Environment.NewLine}", output.ToString());
        Assert.Contains("error line", error.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public void Report_WriteLine_BecomesAnInfoMessageOnTheCurrentStep()
    {
        var report = new UpgradeReport();

        using (UpgradeResultWriter.Use(report, TextWriter.Null))
        {
            UpgradeResultWriter.BeginStep("Legacy call site");
            UpgradeResultWriter.WriteLine("Warning: something a leaf migrator wrote");
        }

        var message = Assert.Single(Assert.Single(report.Steps).Messages);
        Assert.Equal(UpgradeMessageStatus.Info, message.Status);
        // Verbatim: the text is not reclassified or reformatted, so a leaf migrator's own wording survives.
        Assert.Equal("Warning: something a leaf migrator wrote", message.Text);
    }

    [Fact]
    public void Report_ErrorChannel_IsStillATextWriter()
    {
        var report = new UpgradeReport();
        var error = NewWriter();

        using (UpgradeResultWriter.Use(report, error))
        {
            UpgradeResultWriter.BeginStep("Failing step");
            UpgradeResultWriter.Failed("the cause");
            UpgradeResultWriter.WriteErrorLine("Error doing the thing: the cause");
        }

        // Failure handling is unchanged: the report carries the position, the error channel the text.
        Assert.Contains("Error doing the thing", error.ToString(), StringComparison.Ordinal);
        Assert.Equal(UpgradeMessageStatus.Failed, Assert.Single(Assert.Single(report.Steps).Messages).Status);
    }

    [Fact]
    public void MisuseThrows()
    {
        // No destination installed.
        Assert.Throws<InvalidOperationException>(() => UpgradeResultWriter.WriteLine("nope"));
        Assert.Throws<InvalidOperationException>(() => UpgradeResultWriter.Ok("nope"));

        using (UpgradeResultWriter.Use(NewWriter(), NewWriter()))
        {
            // Steps are meaningless when the run writes free text.
            Assert.Throws<InvalidOperationException>(() => UpgradeResultWriter.BeginStep("nope"));
        }

        using (UpgradeResultWriter.Use(new UpgradeReport(), TextWriter.Null))
        {
            // A report has no output writer, and a message with no step is a bug: it surfaces
            // rather than landing in an invented step.
            Assert.Throws<InvalidOperationException>(() => UpgradeResultWriter.Out.WriteLine("nope"));
            var exception = Assert.Throws<InvalidOperationException>(() => UpgradeResultWriter.Ok("orphan"));
            Assert.Contains("No upgrade step has started", exception.Message, StringComparison.Ordinal);
        }
    }

    [Fact]
    public void Scope_RestoresThePreviousDestinationOnDispose()
    {
        var outer = NewWriter();
        var report = new UpgradeReport();

        using (UpgradeResultWriter.Use(outer, TextWriter.Null))
        {
            using (UpgradeResultWriter.Use(report, TextWriter.Null))
            {
                UpgradeResultWriter.BeginStep("Inner");
                UpgradeResultWriter.Ok("structured");
            }

            UpgradeResultWriter.WriteLine("back to text");
        }

        Assert.Contains("back to text", outer.ToString(), StringComparison.Ordinal);
        Assert.DoesNotContain("structured", outer.ToString(), StringComparison.Ordinal);
        Assert.Single(Assert.Single(report.Steps).Messages);
    }
}
