using System.Runtime.CompilerServices;
using System.Text.Json;
using Altinn.Studio.Fleet.Analysis;
using Microsoft.Data.Sqlite;

namespace Altinn.Studio.Fleet.Cli.Analyses.ApiUsage;

/// <summary>
/// Which app library types and members each app uses: compiles the app with Roslyn against the app library version it
/// references, and reads the IL of the third-party packages it uses that are built on the app library.
/// </summary>
/// <remarks>
/// MSBuild has to be registered before a method that uses its types is compiled, so <see cref="Analyze"/> registers
/// it and then calls a method that is not inlined.
/// </remarks>
internal sealed class ApiUsageAnalysis : IAppAnalysis
{
    public string Name => "api-usage";

    public int Version => 1;

    public string Schema =>
        """
            -- Each app the analysis could load: its project, and what went wrong on the way. runs says whether it failed.
            CREATE TABLE api_usage_apps (
                env TEXT NOT NULL,
                org TEXT NOT NULL,
                app TEXT NOT NULL,
                project TEXT,
                library_version TEXT,
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

            -- The types and members of an app library version, under a label such as v8 or main.
            CREATE TABLE api_usage_surface (
                library TEXT NOT NULL,
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
                PRIMARY KEY (library, symbol)
            ) WITHOUT ROWID;

            -- The app library types a symbol's signature names, which stay public for as long as it does.
            CREATE TABLE api_usage_surface_exposes (
                library TEXT NOT NULL,
                symbol TEXT NOT NULL,
                exposed TEXT NOT NULL,
                PRIMARY KEY (library, symbol, exposed)
            ) WITHOUT ROWID;
            """;

    public IReadOnlyList<string> AppTables { get; } = ["api_usage_apps", "api_usage_uses", "api_usage_package_uses"];

    public async Task Analyze(string appDir, string resultFile, CancellationToken cancellationToken)
    {
        Dotnet.PrepareProcess();
        MSBuildSetup.EnsureRegistered();
        AppUsage usage = await Collect(appDir, cancellationToken);
        await using FileStream stream = File.Create(resultFile);
        await JsonSerializer.SerializeAsync(stream, usage, ApiUsageJsonContext.Default.AppUsage, cancellationToken);
    }

    public string? Record(AppRecorder recorder, string resultFile)
    {
        AppUsage usage;
        using (FileStream stream = File.OpenRead(resultFile))
        {
            usage =
                JsonSerializer.Deserialize(stream, ApiUsageJsonContext.Default.AppUsage)
                ?? throw new JsonException("The result is null.");
        }

        if (usage.Project is not null)
        {
            using AppRows apps = recorder.Rows(
                "api_usage_apps",
                [
                    "project",
                    "library_version",
                    "restore_error",
                    "compile_errors",
                    "sample_errors",
                    "load_failures",
                    "test_projects",
                ]
            );
            apps.Add(
                usage.Project,
                usage.LibraryVersion,
                usage.RestoreError,
                usage.CompileErrors,
                Lines(usage.SampleErrors),
                Lines(usage.LoadFailures),
                Lines(usage.TestProjects)
            );
        }

        using (
            AppRows uses = recorder.Rows(
                "api_usage_uses",
                ["symbol", "assembly", "kind", "source", "count", "first_location"]
            )
        )
        {
            foreach (SymbolUse use in usage.Uses)
            {
                uses.Add(use.Symbol, use.Assembly, use.Kind, use.Source, use.Count, use.FirstLocation);
            }
        }

        using (
            AppRows packageUses = recorder.Rows(
                "api_usage_package_uses",
                ["package", "version", "assembly", "symbol", "kind"],
                ignoreDuplicates: true
            )
        )
        {
            foreach (PackageUse package in usage.Packages)
            {
                foreach (PackageReferenceUse reference in package.References)
                {
                    packageUses.Add(
                        package.Package,
                        package.Version,
                        package.Assembly,
                        reference.Symbol,
                        reference.Kind
                    );
                }
            }
        }

        return usage.Failure;
    }

    /// <summary>Replaces the surface recorded under a label.</summary>
    public static void PutSurface(
        SqliteConnection connection,
        SqliteTransaction transaction,
        string library,
        IReadOnlyList<SurfaceEntry> entries
    )
    {
        foreach (string table in (string[])["api_usage_surface", "api_usage_surface_exposes"])
        {
            using SqliteCommand delete = Command(
                connection,
                transaction,
                $"DELETE FROM {table} WHERE library = $library"
            );
            delete.Parameters.AddWithValue("$library", library);
            delete.ExecuteNonQuery();
        }

        using SqliteCommand entry = Command(
            connection,
            transaction,
            """
            INSERT INTO api_usage_surface (library, symbol, assembly, kind, namespace, containing_type, visible,
                obsolete, extension_point, file, line)
            VALUES ($library, $symbol, $assembly, $kind, $namespace, $containingType, $visible, $obsolete,
                $extensionPoint, $file, $line)
            """
        );
        using SqliteCommand exposes = Command(
            connection,
            transaction,
            "INSERT INTO api_usage_surface_exposes (library, symbol, exposed) VALUES ($library, $symbol, $exposed)"
        );
        foreach (SurfaceEntry e in entries)
        {
            Set(entry, "$library", library);
            Set(entry, "$symbol", e.Symbol);
            Set(entry, "$assembly", e.Assembly);
            Set(entry, "$kind", e.Kind);
            Set(entry, "$namespace", e.Namespace);
            Set(entry, "$containingType", e.ContainingType);
            Set(entry, "$visible", e.Visible);
            Set(entry, "$obsolete", e.Obsolete);
            Set(entry, "$extensionPoint", e.ExtensionPoint);
            Set(entry, "$file", e.File);
            Set(entry, "$line", e.Line);
            entry.ExecuteNonQuery();
            foreach (string exposed in e.Exposes)
            {
                Set(exposes, "$library", library);
                Set(exposes, "$symbol", e.Symbol);
                Set(exposes, "$exposed", exposed);
                exposes.ExecuteNonQuery();
            }
        }
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static Task<AppUsage> Collect(string appDir, CancellationToken cancellationToken) =>
        AppCollector.Collect(appDir, cancellationToken);

    private static string? Lines(IReadOnlyList<string> values) => values.Count == 0 ? null : string.Join('\n', values);

    private static SqliteCommand Command(SqliteConnection connection, SqliteTransaction transaction, string sql)
    {
        SqliteCommand command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = sql;
        return command;
    }

    private static void Set(SqliteCommand command, string name, object? value)
    {
        if (command.Parameters.Contains(name))
        {
            command.Parameters[name].Value = value ?? DBNull.Value;
        }
        else
        {
            command.Parameters.AddWithValue(name, value ?? DBNull.Value);
        }
    }
}
