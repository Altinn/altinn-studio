using Altinn.App.Analyzers.Metadata;
using Altinn.App.Analyzers.Tests.Fixtures;
using Microsoft.CodeAnalysis;

namespace Altinn.App.Analyzers.Tests.Metadata;

public class ProcessEndDeletionUtilsTests
{
    private const string Path = "/repo/App/config/applicationmetadata.json";

    private static List<Diagnostic> Collect(string json)
    {
        var diagnostics = new List<Diagnostic>();
        ProcessEndDeletionUtils.CollectDiagnostics(
            new InMemoryAdditionalText(Path, json),
            CancellationToken.None,
            diagnostics
        );
        return diagnostics;
    }

    [Fact]
    public void AutoDelete_With_DeletionPrevention_Emits_Error_On_PreventInstanceDeletionForDays()
    {
        const string json = """
            {
              "id": "ttd/app",
              "autoDeleteOnProcessEnd": true,
              "preventInstanceDeletionForDays": 30
            }
            """;

        var diagnostic = Assert.Single(Collect(json));

        Assert.Equal(Diagnostics.Metadata.AutoDeleteWithDeletionPrevention.Id, diagnostic.Id);
        Assert.Equal(DiagnosticSeverity.Error, diagnostic.Severity);
        Assert.Contains("30 days", diagnostic.GetMessage());
        Assert.Equal("30", json.Substring(diagnostic.Location.SourceSpan.Start, diagnostic.Location.SourceSpan.Length));
    }

    [Fact]
    public void Property_Names_Are_Matched_Ignoring_Case()
    {
        var diagnostics = Collect(
            """
            {
              "id": "ttd/app",
              "AutoDeleteOnProcessEnd": true,
              "PreventInstanceDeletionForDays": 7
            }
            """
        );

        Assert.Single(diagnostics);
    }

    [Theory]
    [InlineData("""{ "autoDeleteOnProcessEnd": true }""")]
    [InlineData("""{ "autoDeleteOnProcessEnd": true, "preventInstanceDeletionForDays": null }""")]
    [InlineData("""{ "autoDeleteOnProcessEnd": true, "preventInstanceDeletionForDays": 0 }""")]
    [InlineData("""{ "autoDeleteOnProcessEnd": false, "preventInstanceDeletionForDays": 30 }""")]
    [InlineData("""{ "preventInstanceDeletionForDays": 30 }""")]
    [InlineData("""{ "autoDeleteOnProcessEnd": true, "preventInstanceDeletionForDays": 30 """)]
    public void Either_Setting_Alone_Or_Malformed_Json_Emits_Nothing(string json)
    {
        Assert.Empty(Collect(json));
    }
}
