using Altinn.Studio.Common.Domain.App;
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
    // A published Altinn.App.Api that a package depends on beside a build of a pull request, whose assemblies win.
    [InlineData(
        "Altinn.App.Api=Altinn.App.Api.Experimental/8.7.0-pr.1,Altinn.App.Core=Altinn.App.Core.Experimental/8.7.0-pr.1",
        "Altinn.App.Api.Experimental/8.7.0-pr.1"
    )]
    [InlineData("Altinn.App.Core=Altinn.App.Core/8.12.17", "Altinn.App.Core/8.12.17")]
    [InlineData(
        "Altinn.App.Common=Altinn.App.Common/6.0.2,Altinn.App.Api=Altinn.App.Api/6.0.2",
        "Altinn.App.Api/6.0.2"
    )]
    [InlineData("Altinn.App.Api=", null)]
    public void CompiledLibraryPackage_IsThePackageOfTheApiOrCoreAssemblyTheCompilationUses(
        string files,
        string? expected
    )
    {
        using ProjectAssets assets = Assets();

        AltinnAppPackage? package = AppCollector.CompiledLibraryPackage(assets, LibraryFiles(files));

        Assert.Equal(expected, package is null ? null : $"{package.Name}/{package.Version}");
    }

    [Theory]
    [InlineData("app", "Altinn.App.PlatformServices=Altinn.App.PlatformServices/6.0.2", true)]
    [InlineData("test", "Altinn.App.PlatformServices=Altinn.App.PlatformServices/6.0.2", false)]
    [InlineData("app", "Altinn.App.Core=Altinn.App.Core/8.11.3", false)]
    public void MixedLibraryNote_SaysWhenTheAppsCodeUsesAnAssemblyOfAnotherVersion(
        string source,
        string usedFile,
        bool expected
    )
    {
        using ProjectAssets assets = Assets();
        string used = usedFile.Split('=')[0];
        SymbolUse[] uses =
        [
            new($"T:{used}.Used", used, UseKinds.Type, source, 2, "App/Program.cs:1"),
            new($"T:{used}.Also", used, UseKinds.Type, source, 1, "App/Program.cs:2"),
        ];

        string? note = AppCollector.MixedLibraryNote(
            assets,
            AltinnAppPackage.TryParse(new PackageReference("Altinn.App.Api", "8.11.3"), out var library)
                ? library
                : throw new InvalidOperationException(),
            LibraryFiles($"Altinn.App.Api=Altinn.App.Api/8.11.3,{usedFile}"),
            uses
        );

        Assert.Equal(
            expected
                ? "its code uses 2 symbols of Altinn.App.PlatformServices 6.0.2, which it ships with beside "
                    + "Altinn.App.Api 8.11.3, so those uses are compared with 8.11.3's API"
                : null,
            note
        );
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
                INSERT INTO api_usage_apps (env, org, app, library_package, library_version, compile_errors) VALUES
                    ('prod', 'ttd', 'app-one', 'Altinn.App.Api', '8.0.0', 0),
                    ('prod', 'ttd', 'app-two', 'Altinn.App.Api', '8.1.0', 0),
                    ('prod', 'ttd', 'app-three', 'Altinn.App.Core', '8.2.0', 0),
                    ('prod', 'ttd', 'app-four', 'Altinn.App.Api', '8.2.0', 0),
                    ('prod', 'ttd', 'app-five', 'Altinn.App.Api.Experimental', '8.7.0-pr.1973.x.0124a541', 0);
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
                new AnalysisItem("8.1.0", "Altinn.App.Api/8.1.0"),
                new AnalysisItem("8.2.0", "Altinn.App.Api/8.2.0"),
                new AnalysisItem("8.7.0-pr.1973.x.0124a541", "Altinn.App.Api.Experimental/8.7.0-pr.1973.x.0124a541"),
                new AnalysisItem("source", Path.Join(_folder, "checkout")),
            ],
            plan.Pending
        );
        Assert.Equal((5, 1), (plan.Total, plan.Removed));
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
    public void RecordItem_RecordsWhichPackageTheVersionWasReadFrom()
    {
        using AnalysisDatabase database = AnalysisDatabase.Open(DatabasePath);
        var analysis = new ApiUsageAnalysis();
        database.Prepare(analysis);
        const string Version = "8.7.0-pr.1973.x.0124a541";
        var item = new AnalysisItem(Version, $"Altinn.App.Api.Experimental/{Version}");
        string resultFile = Path.Join(_folder, "version.result");
        File.WriteAllText(
            resultFile,
            """
            { "commitId": null, "entries": [ { "symbol": "T:A", "assembly": "Altinn.App.Core", "kind": "class",
              "namespace": "A", "containingType": null, "visible": true, "obsolete": false, "extensionPoint": false,
              "file": null, "line": null, "exposes": [] } ] }
            """
        );

        string? failure = database.PutItem(analysis, item, new AnalysisOutcome(null, resultFile, 1));

        Assert.Null(failure);
        Assert.Equal(
            ["Altinn.App.Api.Experimental"],
            Query(database, $"SELECT package FROM api_usage_library_versions WHERE version = '{Version}'")
        );
        Assert.Equal(["T:A"], Query(database, $"SELECT symbol FROM api_usage_library_api WHERE version = '{Version}'"));
    }

    [Fact]
    public async Task AnalyzeItem_OfAVersionWithoutAPackage_Throws()
    {
        var item = new AnalysisItem("8.0.0", "8.0.0");

        FleetException ex = await Assert.ThrowsAsync<FleetException>(() =>
            new ApiUsageAnalysis().AnalyzeItem(
                item,
                Path.Join(_folder, "result"),
                TestContext.Current.CancellationToken
            )
        );

        Assert.Contains("is not an Altinn.App package and version", ex.Message, StringComparison.Ordinal);
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

    private static readonly string[] s_packages =
    [
        "Altinn.App.Api/6.0.2",
        "Altinn.App.Common/6.0.2",
        "Altinn.App.PlatformServices/6.0.2",
        "Altinn.App.Api/8.6.6",
        "Altinn.App.Api/8.11.3",
        "Altinn.App.Core/8.11.3",
        "Altinn.App.Core/8.12.17",
        "Altinn.App.Api.Experimental/8.7.0-pr.1",
        "Altinn.App.Core.Experimental/8.7.0-pr.1",
    ];

    private string PackagesFolder => Path.Join(_folder, "packages");

    /// <summary>A restore that resolved <see cref="s_packages"/>, as a project's assets list them.</summary>
    private ProjectAssets Assets()
    {
        string targets = string.Join(",", s_packages.Select(p => $"\"{p}\": {{ \"type\": \"package\" }}"));
        string libraries = string.Join(
            ",",
            s_packages.Select(p => $"\"{p}\": {{ \"path\": \"{p.ToLowerInvariant()}\" }}")
        );
        string folder = System.Text.Json.JsonSerializer.Serialize(PackagesFolder + Path.DirectorySeparatorChar);
        Write(
            "obj/project.assets.json",
            $$"""
            { "targets": { "net8.0": { {{targets}} } }, "libraries": { {{libraries}} },
              "packageFolders": { {{folder}}: {} } }
            """
        );
        return ProjectAssets.Read(_folder)!;
    }

    /// <summary>
    /// The assembly files a compilation references, from <c>Assembly=Package/Version</c> pairs. An empty package is a
    /// file outside the packages, as with a project reference.
    /// </summary>
    private List<(string Assembly, string File)> LibraryFiles(string files) =>
        [
            .. files
                .Split(',')
                .Select(pair => pair.Split('='))
                .Select(pair =>
                    (
                        pair[0],
                        pair[1].Length == 0
                            ? Path.Join(_folder, "src", "bin", $"{pair[0]}.dll")
                            : Path.Join(PackagesFolder, pair[1].ToLowerInvariant(), "lib", "net8.0", $"{pair[0]}.dll")
                    )
                ),
        ];

    private static List<string> Query(AnalysisDatabase database, string sql) =>
        database.Write(tables => tables.Query(sql, reader => reader.GetString(0)));

    private void Write(string relativePath, string content)
    {
        string path = Path.Join(_folder, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, content);
    }
}
