using Altinn.Studio.Fleet.Analysis;
using Altinn.Studio.Fleet.Analysis.ApiUsage;

namespace Altinn.Studio.Fleet.Tests.Analysis.ApiUsage;

public sealed class ApiUsageAnalysisTests : IDisposable
{
    private readonly string _folder = Folder.CreateTemporary();

    private string DatabasePath => Path.Join(_folder, "analysis.sqlite");

    [Theory]
    [InlineData("src/App/backend/src")]
    [InlineData("src")]
    [InlineData("")]
    public void FindSource_FindsTheProjectsInACheckout(string layout)
    {
        foreach (string package in (string[])["Altinn.App.Api", "Altinn.App.Core"])
        {
            Write(Path.Join(layout, package, $"{package}.csproj"), "<Project />");
        }

        LibrarySource? source = LibrarySource.Find(_folder);

        Assert.NotNull(source);
        Assert.Equal(
            ["Altinn.App.Api.csproj", "Altinn.App.Core.csproj"],
            source.Projects.Select(p => Path.GetFileName(p)).ToArray()
        );
        Assert.Equal(Path.GetFullPath(_folder), source.Root);
    }

    [Fact]
    public void FindSource_WithoutTheApiProject_FindsNone()
    {
        Write("src/Altinn.App.Core/Altinn.App.Core.csproj", "<Project />");

        Assert.Null(LibrarySource.Find(_folder));
    }

    [Theory]
    [InlineData("Altinn.App.Core/8.12.17,Altinn.App.Api/8.12.17,Some.Package/1.0.0", "8.12.17")]
    [InlineData("Altinn.App.Api/6.0.2,Altinn.App.Common/6.0.2", "6.0.2")]
    [InlineData("Some.Package/1.0.0", null)]
    public void LibraryVersion_IsTheCorePackagesVersion_OrApisBeforeV7(string libraries, string? expected)
    {
        string targets = string.Join(
            ',',
            libraries.Split(',').Select(library => $"\"{library}\": {{ \"type\": \"package\" }}")
        );
        Write("obj/project.assets.json", $$"""{ "targets": { "net8.0": { {{targets}} } } }""");

        using ProjectAssets? assets = ProjectAssets.Read(_folder);

        Assert.Equal(expected, assets?.LibraryVersion);
    }

    [Fact]
    public void PlanItems_ReadsTheVersionsTheAppsUseThatAreNotRead_AndForgetsTheOthers()
    {
        using AnalysisDatabase database = AnalysisDatabase.Open(DatabasePath);
        var analysis = new ApiUsageAnalysis
        {
            Source = new LibrarySource(Path.Join(_folder, "checkout"), ["Altinn.App.Api.csproj"]),
        };
        database.Prepare(analysis);
        database.Write(tables =>
            tables.Execute(
                """
                INSERT INTO api_usage_apps (env, org, app, library_version, compile_errors) VALUES
                    ('prod', 'ttd', 'app-one', '8.0.0', 0),
                    ('prod', 'ttd', 'app-two', '8.1.0', 0),
                    ('prod', 'ttd', 'app-three', '8.2.0', 0);
                INSERT INTO api_usage_library_versions (version, read_at, failure) VALUES
                    ('8.0.0', '2026-11-26T00:00:00Z', NULL),
                    ('8.1.0', '2026-11-26T00:00:00Z', 'The feed did not answer.'),
                    ('7.0.0', '2026-11-26T00:00:00Z', NULL),
                    ('source', '2026-11-26T00:00:00Z', NULL);
                INSERT INTO api_usage_library_api (version, symbol, assembly, kind, namespace, visible, obsolete,
                    extension_point)
                VALUES ('7.0.0', 'T:A', 'Altinn.App.Core', 'class', 'A', 1, 0, 0);
                """
            )
        );

        ItemPlan plan = database.Write(tables =>
            analysis.PlanItems(tables, new AnalysisOptions { Environments = [FleetTestContext.Prod] })
        );

        Assert.Equal(
            [
                new AnalysisItem("8.1.0", "8.1.0"),
                new AnalysisItem("8.2.0", "8.2.0"),
                new AnalysisItem("source", Path.Join(_folder, "checkout")),
            ],
            plan.Pending
        );
        Assert.Equal((4, 1), (plan.Total, plan.Removed));
        Assert.Equal(
            ["8.0.0", "8.1.0", "source"],
            Query(database, "SELECT version FROM api_usage_library_versions ORDER BY version")
        );
        Assert.Empty(Query(database, "SELECT symbol FROM api_usage_library_api"));
    }

    [Fact]
    public async Task AnalyzeItem_ReadsTheSourcesApi_AndAFailedReadKeepsIt()
    {
        using AnalysisDatabase database = AnalysisDatabase.Open(DatabasePath);
        var analysis = new ApiUsageAnalysis();
        database.Prepare(analysis);
        Write(
            "checkout/src/Altinn.App.Api/Altinn.App.Api.csproj",
            $"""
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <TargetFramework>net{Environment.Version.Major}.0</TargetFramework>
              </PropertyGroup>
            </Project>
            """
        );
        Write(
            "checkout/src/Altinn.App.Api/Controller.cs",
            """
            namespace Altinn.App.Api;

            public sealed class Controller
            {
                public int Unused() => 0;
            }
            """
        );
        var item = new AnalysisItem(ApiUsageAnalysis.SourceVersion, Path.Join(_folder, "checkout"));
        string resultFile = Path.Join(_folder, "source.result");

        await analysis.AnalyzeItem(item, resultFile, TestContext.Current.CancellationToken);
        string? first = database.PutItem(analysis, item, new AnalysisOutcome(null, resultFile, 1));
        string? second = database.PutItem(analysis, item, new AnalysisOutcome("It does not compile.", null, 1));

        Assert.Equal((null, "It does not compile."), (first, second));
        Assert.Contains(
            "M:Altinn.App.Api.Controller.Unused",
            Query(database, "SELECT symbol FROM api_usage_library_api WHERE version = 'source'")
        );
        Assert.Equal(
            ["It does not compile."],
            Query(database, "SELECT failure FROM api_usage_library_versions WHERE read_at IS NOT NULL")
        );
    }

    [Fact]
    public async Task AnalyzeItem_WithoutTheAppLibrary_Throws()
    {
        var item = new AnalysisItem(ApiUsageAnalysis.SourceVersion, _folder);

        FleetException ex = await Assert.ThrowsAsync<FleetException>(() =>
            new ApiUsageAnalysis().AnalyzeItem(
                item,
                Path.Join(_folder, "result"),
                TestContext.Current.CancellationToken
            )
        );

        Assert.Contains("has no app library", ex.Message, StringComparison.Ordinal);
    }

    public void Dispose() => Directory.Delete(_folder, recursive: true);

    private static List<string> Query(AnalysisDatabase database, string sql) =>
        database.Write(tables => tables.Query(sql, reader => reader.GetString(0)));

    private void Write(string relativePath, string content)
    {
        string path = Path.Join(_folder, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, content);
    }
}
