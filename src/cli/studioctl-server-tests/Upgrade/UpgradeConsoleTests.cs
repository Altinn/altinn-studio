using System.Globalization;
using Altinn.Studio.Cli.Upgrade;

namespace Studioctl.Tests.Upgrade;

/// <summary>
/// Covers the two sinks <see cref="UpgradeConsole"/> serves while the upgrade paths are being converted:
/// plain text for the kinds that still emit free text, and a structured report for v9.
/// </summary>
public sealed class UpgradeConsoleTests
{
    private static StringWriter NewWriter() => new(CultureInfo.InvariantCulture);

    [Fact]
    public void TextWriterSink_WritesPlainText()
    {
        var output = NewWriter();
        var error = NewWriter();

        using (UpgradeConsole.Use(output, error))
        {
            UpgradeConsole.WriteLine("plain line");
            // A typed status degrades to its plain text, so shared code can report once for both sinks.
            UpgradeConsole.Ok("typed line");
            UpgradeConsole.WriteErrorLine("error line");
        }

        Assert.Equal($"plain line{Environment.NewLine}typed line{Environment.NewLine}", output.ToString());
        Assert.Contains("error line", error.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public void ReportSink_WriteLine_BecomesAnInfoMessageOnTheCurrentStep()
    {
        var report = new UpgradeReport();

        using (UpgradeConsole.Use(report, TextWriter.Null))
        {
            UpgradeConsole.BeginStep("Legacy call site");
            UpgradeConsole.WriteLine("Warning: something a leaf migrator wrote");
        }

        var message = Assert.Single(Assert.Single(report.Steps).Messages);
        Assert.Equal(UpgradeMessageStatus.Info, message.Status);
        // Verbatim: the text is not reclassified or reformatted, so a leaf migrator's own wording survives.
        Assert.Equal("Warning: something a leaf migrator wrote", message.Text);
    }

    [Fact]
    public void ReportSink_ErrorChannel_IsStillATextWriter()
    {
        var report = new UpgradeReport();
        var error = NewWriter();

        using (UpgradeConsole.Use(report, error))
        {
            UpgradeConsole.BeginStep("Failing step");
            UpgradeConsole.Failed("the cause");
            UpgradeConsole.WriteErrorLine("Error doing the thing: the cause");
        }

        // Failure handling is unchanged: the report carries the position, the error channel the text.
        Assert.Contains("Error doing the thing", error.ToString(), StringComparison.Ordinal);
        Assert.Equal(UpgradeMessageStatus.Failed, Assert.Single(Assert.Single(report.Steps).Messages).Status);
    }

    [Fact]
    public void MisuseThrows()
    {
        // No sink installed.
        Assert.Throws<InvalidOperationException>(() => UpgradeConsole.WriteLine("nope"));
        Assert.Throws<InvalidOperationException>(() => UpgradeConsole.Ok("nope"));

        using (UpgradeConsole.Use(NewWriter(), NewWriter()))
        {
            // Steps are meaningless on the text sink.
            Assert.Throws<InvalidOperationException>(() => UpgradeConsole.BeginStep("nope"));
        }

        using (UpgradeConsole.Use(new UpgradeReport(), TextWriter.Null))
        {
            // The report sink has no output writer, and a message with no step is a bug: it surfaces
            // rather than landing in an invented step.
            Assert.Throws<InvalidOperationException>(() => UpgradeConsole.Out.WriteLine("nope"));
            var exception = Assert.Throws<InvalidOperationException>(() => UpgradeConsole.Ok("orphan"));
            Assert.Contains("No upgrade step has started", exception.Message, StringComparison.Ordinal);
        }
    }

    [Fact]
    public void Scope_RestoresThePreviousSinkOnDispose()
    {
        var outer = NewWriter();
        var report = new UpgradeReport();

        using (UpgradeConsole.Use(outer, TextWriter.Null))
        {
            using (UpgradeConsole.Use(report, TextWriter.Null))
            {
                UpgradeConsole.BeginStep("Inner");
                UpgradeConsole.Ok("structured");
            }

            UpgradeConsole.WriteLine("back to text");
        }

        Assert.Contains("back to text", outer.ToString(), StringComparison.Ordinal);
        Assert.DoesNotContain("structured", outer.ToString(), StringComparison.Ordinal);
        Assert.Single(Assert.Single(report.Steps).Messages);
    }
}
