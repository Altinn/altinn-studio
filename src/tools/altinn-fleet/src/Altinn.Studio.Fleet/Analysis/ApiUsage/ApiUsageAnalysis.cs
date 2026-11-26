using System.Runtime.CompilerServices;
using System.Text.Json;

namespace Altinn.Studio.Fleet.Analysis.ApiUsage;

/// <summary>
/// Which app library types and members each app uses: compiles the app with Roslyn against the app library version it
/// references, and reads the IL of the third-party packages it uses that are built on the app library. Its items are
/// the app library versions the apps use, and <see cref="Source"/>, whose public API it records to compare the apps
/// with.
/// </summary>
/// <remarks>
/// MSBuild has to be registered before a method that uses its types is compiled, so <see cref="Analyze"/> and
/// <see cref="AnalyzeItem"/>, which run in child processes, register it and then call a method that is not inlined.
/// </remarks>
public sealed class ApiUsageAnalysis : IItemAnalysis
{
    /// <summary>The version that the public API of <see cref="Source"/> is recorded under.</summary>
    public const string SourceVersion = LibraryVersions.Source;

    public string Name => "api-usage";

    // 2 records the app library's package version rather than its assembly version, and the public API of each
    // version the apps use. 3 records the package the version comes from, so that builds of pull requests are read.
    // 4 takes the version from the assembly the app's compilation uses, which is the one its build ships.
    public int Version => 4;

    public string ItemsName => "app library versions";

    /// <summary>
    /// The app library's source, such as an altinn-studio checkout, whose public API to record too. The host uses it
    /// to plan the items; the child that reads it gets its folder in the item.
    /// </summary>
    public LibrarySource? Source { get; init; }

    public string Schema =>
        """
            -- Each app the analysis could load: its project, and what went wrong on the way. runs says whether it failed.
            CREATE TABLE api_usage_apps (
                env TEXT NOT NULL,
                org TEXT NOT NULL,
                app TEXT NOT NULL,
                project TEXT,
                library_package TEXT, -- the Altinn.App package its build ships, such as Altinn.App.Api
                library_version TEXT, -- the version of library_package
                restore_error TEXT,
                compile_errors INTEGER NOT NULL,
                sample_errors TEXT,
                load_failures TEXT,
                test_projects TEXT,
                PRIMARY KEY (env, org, app)
            ) WITHOUT ROWID;

            -- The app library symbols an app's code binds to. source is app, generated or test.
            CREATE TABLE api_usage_uses (
                env TEXT NOT NULL,
                org TEXT NOT NULL,
                app TEXT NOT NULL,
                symbol TEXT NOT NULL,
                assembly TEXT NOT NULL,
                kind TEXT NOT NULL,
                source TEXT NOT NULL,
                count INTEGER NOT NULL,
                first_location TEXT NOT NULL,
                PRIMARY KEY (env, org, app, symbol, kind, source)
            ) WITHOUT ROWID;
            CREATE INDEX api_usage_uses_by_symbol ON api_usage_uses (symbol);

            -- What the third-party packages an app uses reference of the app library. A member is named without its
            -- parameters and stands for every overload.
            CREATE TABLE api_usage_package_uses (
                env TEXT NOT NULL,
                org TEXT NOT NULL,
                app TEXT NOT NULL,
                package TEXT NOT NULL,
                version TEXT NOT NULL,
                assembly TEXT NOT NULL,
                symbol TEXT NOT NULL,
                kind TEXT NOT NULL,
                PRIMARY KEY (env, org, app, package, assembly, symbol, kind)
            ) WITHOUT ROWID;
            CREATE INDEX api_usage_package_uses_by_symbol ON api_usage_package_uses (symbol);

            -- Each app library version whose public API was read: a version the apps use, read from its packages,
            -- or source, read from --source at commit_id. The API is from read_at; failure is why the last read failed.
            CREATE TABLE api_usage_library_versions (
                version TEXT NOT NULL PRIMARY KEY,
                package TEXT, -- read from this package's version, such as Altinn.App.Api.Experimental; NULL for source
                commit_id TEXT,
                read_at TEXT,
                failure TEXT
            ) WITHOUT ROWID;

            -- The public types and members of each app library version, and its types that are not public.
            CREATE TABLE api_usage_library_api (
                version TEXT NOT NULL,
                symbol TEXT NOT NULL,
                assembly TEXT NOT NULL,
                kind TEXT NOT NULL,
                namespace TEXT NOT NULL,
                containing_type TEXT,
                visible INTEGER NOT NULL,
                obsolete INTEGER NOT NULL,
                extension_point INTEGER NOT NULL,
                file TEXT,
                line INTEGER,
                PRIMARY KEY (version, symbol)
            ) WITHOUT ROWID;

            -- The app library types a symbol's signature names, which stay public for as long as it does.
            CREATE TABLE api_usage_library_api_exposes (
                version TEXT NOT NULL,
                symbol TEXT NOT NULL,
                exposed TEXT NOT NULL,
                PRIMARY KEY (version, symbol, exposed)
            ) WITHOUT ROWID;
            """;

    public IReadOnlyList<string> AppTables { get; } = ["api_usage_apps", "api_usage_uses", "api_usage_package_uses"];

    public async Task Analyze(string appDir, string resultFile, CancellationToken cancellationToken)
    {
        MSBuildSetup.EnsureRegistered();
        AppUsage usage = await Collect(appDir, cancellationToken);
        await using FileStream stream = File.Create(resultFile);
        await JsonSerializer.SerializeAsync(stream, usage, ApiUsageJsonContext.Default.AppUsage, cancellationToken);
    }

    public string? Record(AppRecorder recorder, string resultFile) => AppUsageRows.Record(recorder, resultFile);

    public ItemPlan PlanItems(AnalysisTables tables, AnalysisOptions options) =>
        LibraryVersions.Plan(tables, Source, options.Force);

    public Task AnalyzeItem(AnalysisItem item, string resultFile, CancellationToken cancellationToken)
    {
        MSBuildSetup.EnsureRegistered();
        return ReadVersion(item, resultFile, cancellationToken);
    }

    public string? RecordItem(AnalysisTables tables, AnalysisItem item, AnalysisOutcome outcome) =>
        LibraryVersions.Record(tables, item, outcome);

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static Task<AppUsage> Collect(string appDir, CancellationToken cancellationToken) =>
        AppCollector.Collect(appDir, cancellationToken);

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static Task ReadVersion(AnalysisItem item, string resultFile, CancellationToken cancellationToken) =>
        LibraryVersions.Read(item, resultFile, cancellationToken);
}
