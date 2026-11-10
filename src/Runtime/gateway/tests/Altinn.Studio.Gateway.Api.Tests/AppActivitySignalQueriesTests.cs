using System.Runtime.CompilerServices;
using Altinn.Studio.Gateway.Api.Clients.MetricsClient;

namespace Altinn.Studio.Gateway.Api.Tests;

public sealed class AppActivitySignalQueriesTests
{
    [Fact]
    public void BuildQuery_MatchesSnapshot()
    {
        AssertMatchesSnapshot(AppActivitySignalQueries.BuildQuery(2), "AppActivitySignalsQuery.kql");
    }

    [Fact]
    public void BuildQuery_UsesWindowDays()
    {
        Assert.Contains("ago(29d)", AppActivitySignalQueries.BuildQuery(29), StringComparison.Ordinal);
    }

    // Set UPDATE_SNAPSHOTS=true to rewrite the snapshot after an intended query change.
    private static void AssertMatchesSnapshot(
        string actual,
        string fileName,
        [CallerFilePath] string callerFilePath = ""
    )
    {
        var path = Path.Combine(
            Path.GetDirectoryName(callerFilePath) ?? string.Empty,
            "TestData",
            "AppActivitySignals",
            fileName
        );
        if (Environment.GetEnvironmentVariable("UPDATE_SNAPSHOTS") == "true")
        {
            File.WriteAllText(path, actual + "\n");
        }

        var expected = File.ReadAllText(path).ReplaceLineEndings("\n").TrimEnd('\n');
        Assert.Equal(expected, actual.ReplaceLineEndings("\n"));
    }
}
