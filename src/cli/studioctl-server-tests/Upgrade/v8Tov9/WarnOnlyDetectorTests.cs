using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class WarnOnlyDetectorTests
{
    private static readonly CSharpApiMatch[] _matches = [new("A.cs", 1, "Symbol")];

    [Fact]
    public void Report_MarksSummaryAsTodo()
    {
        var reported = WarnOnlyDetector.Report("summary", _matches);

        // The summary names the removed API and what to port it to, so it is the to-do; the locations
        // under it are the evidence, and stay warnings.
        Assert.Contains("summary", Assert.Single(reported.Todos), StringComparison.Ordinal);
        Assert.Contains(reported.Warnings, w => w.Contains("A.cs", StringComparison.Ordinal));
    }

    [Fact]
    public void Advise_MarksSummaryAsWarning()
    {
        var advised = WarnOnlyDetector.Advise("summary", _matches);

        // The matched usages still compile and run, so the same summary is only a warning here - a
        // working app must not be given an exit code that says "needs manual follow-up".
        Assert.Contains(advised.Warnings, w => w.Contains("summary", StringComparison.Ordinal));
        Assert.Contains(advised.Warnings, w => w.Contains("A.cs", StringComparison.Ordinal));
        Assert.Empty(advised.Todos);
    }
}
