using Altinn.Studio.Fleet.Analysis;
using Altinn.Studio.Fleet.Analysis.ApiUsage;
using Microsoft.Data.Sqlite;

namespace Altinn.Studio.Fleet.Tests.Analysis.ApiUsage;

public sealed class ApiUsageAnalysisTests(LibraryFixture fixture) : IClassFixture<LibraryFixture>, IDisposable
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
    public void LibraryPackageVersion_IsTheCorePackagesVersion_OrApisBeforeV7(string libraries, string? expected)
    {
        string targets = string.Join(
            ',',
            libraries.Split(',').Select(library => $"\"{library}\": {{ \"type\": \"package\" }}")
        );
        Write("obj/project.assets.json", $$"""{ "targets": { "net8.0": { {{targets}} } } }""");

        Assert.Equal(expected, BinaryReferences.LibraryPackageVersion(_folder));
    }

    [Fact]
    public async Task Complete_RecordsTheSourcesApi_AndKeepsItWhenALaterReadFails()
    {
        using AnalysisDatabase database = AnalysisDatabase.Open(DatabasePath);
        var good = new ApiUsageAnalysis { Source = new LibrarySource(fixture.Root, [fixture.LibraryProject]) };
        Write(
            "broken/Altinn.App.Api.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk">
              <Import Project="missing.props" />
            </Project>
            """
        );
        var broken = new ApiUsageAnalysis
        {
            Source = new LibrarySource(_folder, [Path.Join(_folder, "broken", "Altinn.App.Api.csproj")]),
        };

        string? first = await Complete(database, good);
        string? second = await Complete(database, broken);

        Assert.Equal("app library API  1 versions · 1 read · 0 removed · 0 failed", first);
        Assert.Equal("app library API  1 versions · 1 read · 0 removed · 1 failed", second);
        Assert.Contains(
            "M:Altinn.App.Core.Features.DataClient.Unused",
            Query(database, good, "SELECT symbol FROM api_usage_library_api WHERE version = 'source'")
        );
        Assert.Contains(
            "broken",
            Assert.Single(Query(database, good, "SELECT failure FROM api_usage_library_versions")),
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task Complete_ReadsOnlyTheVersionsTheAppsUseThatAreNotRead_AndForgetsTheOthers()
    {
        using AnalysisDatabase database = AnalysisDatabase.Open(DatabasePath);
        var analysis = new ApiUsageAnalysis();
        database.Change(
            analysis,
            (connection, transaction) =>
                Execute(
                    connection,
                    transaction,
                    """
                    INSERT INTO api_usage_apps (env, org, app, library_version, compile_errors)
                    VALUES ('prod', 'ttd', 'app-one', '8.0.0', 0);
                    INSERT INTO api_usage_library_versions (version, read_at) VALUES ('8.0.0', '2026-11-26T00:00:00Z');
                    INSERT INTO api_usage_library_versions (version, read_at) VALUES ('7.0.0', '2026-11-26T00:00:00Z');
                    INSERT INTO api_usage_library_api (version, symbol, assembly, kind, namespace, visible, obsolete,
                        extension_point)
                    VALUES ('7.0.0', 'T:A', 'Altinn.App.Core', 'class', 'A', 1, 0, 0);
                    INSERT INTO api_usage_library_versions (version, read_at) VALUES ('source', '2026-11-26T00:00:00Z');
                    """
                )
        );

        string? summary = await Complete(database, analysis);

        Assert.Equal("app library API  2 versions · 0 read · 1 removed · 0 failed", summary);
        Assert.Equal(
            ["8.0.0", "source"],
            Query(database, analysis, "SELECT version FROM api_usage_library_versions ORDER BY version")
        );
        Assert.Empty(Query(database, analysis, "SELECT symbol FROM api_usage_library_api"));
    }

    public void Dispose() => Directory.Delete(_folder, recursive: true);

    private static Task<string?> Complete(AnalysisDatabase database, ApiUsageAnalysis analysis) =>
        analysis.Complete(
            database,
            new AnalysisOptions { Environments = [FleetTestContext.Prod] },
            null,
            TestContext.Current.CancellationToken
        );

    private static List<string> Query(AnalysisDatabase database, ApiUsageAnalysis analysis, string sql) =>
        database.Change(
            analysis,
            (connection, transaction) =>
            {
                using SqliteCommand command = connection.CreateCommand();
                command.Transaction = transaction;
                command.CommandText = sql;
                using SqliteDataReader reader = command.ExecuteReader();
                var values = new List<string>();
                while (reader.Read())
                {
                    values.Add(reader.GetString(0));
                }

                return values;
            }
        );

    private static void Execute(SqliteConnection connection, SqliteTransaction transaction, string sql)
    {
        using SqliteCommand command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = sql;
        command.ExecuteNonQuery();
    }

    private void Write(string relativePath, string content)
    {
        string path = Path.Join(_folder, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, content);
    }
}
