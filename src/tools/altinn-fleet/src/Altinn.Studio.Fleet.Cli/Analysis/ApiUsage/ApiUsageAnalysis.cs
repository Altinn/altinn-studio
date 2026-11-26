using System.Diagnostics;
using System.Globalization;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Altinn.Studio.Fleet;
using Altinn.Studio.Fleet.Analysis;
using Microsoft.Data.Sqlite;

namespace Altinn.Studio.Fleet.Cli.Analysis.ApiUsage;

/// <summary>
/// Which app library types and members each app uses: compiles the app with Roslyn against the app library version it
/// references, and reads the IL of the third-party packages it uses that are built on the app library. Once the apps
/// are recorded, it records the public API of each app library version they use, and of <see cref="Source"/>.
/// </summary>
/// <remarks>
/// MSBuild has to be registered before a method that uses its types is compiled, so <see cref="Analyze"/> and
/// <see cref="Complete"/> register it and then call a method that is not inlined.
/// </remarks>
internal sealed class ApiUsageAnalysis : IAppAnalysis
{
    /// <summary>The version that the public API of <see cref="Source"/> is recorded under.</summary>
    public const string SourceVersion = "source";

    public string Name => "api-usage";

    // 2 records the app library's package version rather than its assembly version, and the public API of each
    // version the apps use.
    public int Version => 2;

    /// <summary>The app library's source, such as an altinn-studio checkout, whose public API to record too.</summary>
    public LibrarySource? Source { get; init; }

    public string Schema =>
        """
            -- Each app the analysis could load: its project, and what went wrong on the way. runs says whether it failed.
            CREATE TABLE api_usage_apps (
                env TEXT NOT NULL,
                org TEXT NOT NULL,
                app TEXT NOT NULL,
                project TEXT,
                library_version TEXT, -- the version of the app library package it references
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

    public async Task<string?> Complete(
        AnalysisDatabase database,
        AnalysisOptions options,
        ISyncObserver? observer,
        CancellationToken cancellationToken
    )
    {
        (List<string> pending, int removed) = database.Change(
            this,
            (connection, transaction) => PendingVersions(connection, transaction, options.Force)
        );
        List<string> versions = [.. pending];
        if (Source is not null)
        {
            versions.Add(SourceVersion);
        }

        int failed = 0;
        if (versions.Count > 0)
        {
            MSBuildSetup.EnsureRegistered();
            var gate = new Lock();
            int done = 0;
            const string Step = "reading app library versions";
            observer?.OnAnalysisProgress(Name, Step, 0, versions.Count);
            await Parallel.ForEachAsync(
                versions,
                new ParallelOptions
                {
                    MaxDegreeOfParallelism = options.Parallelism,
                    CancellationToken = cancellationToken,
                },
                async (version, token) =>
                {
                    LibraryRead read = await ReadVersion(version, token);
                    lock (gate)
                    {
                        database.Change(this, (connection, transaction) => PutVersion(connection, transaction, read));
                        failed += read.Failure is null ? 0 : 1;
                        observer?.OnAnalysisProgress(Name, Step, ++done, versions.Count);
                    }
                }
            );
        }

        int known = database.Change(this, (connection, transaction) => CountVersions(connection, transaction));
        return $"app library API  {known} versions · {versions.Count} read · {removed} removed · {failed} failed";
    }

    /// <summary>
    /// Forgets the versions no app uses any more, and returns the versions the apps use that are to be read: those
    /// not read yet, those whose read failed, or all of them with <paramref name="force"/>.
    /// </summary>
    private static (List<string> Pending, int Removed) PendingVersions(
        SqliteConnection connection,
        SqliteTransaction transaction,
        bool force
    )
    {
        const string Unused = """
            version <> 'source' AND version NOT IN
                (SELECT library_version FROM api_usage_apps WHERE library_version IS NOT NULL)
            """;
        int removed = 0;
        foreach (
            string table in (string[])
                ["api_usage_library_versions", "api_usage_library_api", "api_usage_library_api_exposes"]
        )
        {
            using SqliteCommand delete = Command(connection, transaction, $"DELETE FROM {table} WHERE {Unused}");
            int count = delete.ExecuteNonQuery();
            removed = table == "api_usage_library_versions" ? count : removed;
        }

        using SqliteCommand select = Command(
            connection,
            transaction,
            """
            SELECT DISTINCT a.library_version FROM api_usage_apps a
            LEFT JOIN api_usage_library_versions v ON v.version = a.library_version
            WHERE a.library_version IS NOT NULL AND ($force OR v.version IS NULL OR v.failure IS NOT NULL)
            ORDER BY a.library_version
            """
        );
        select.Parameters.AddWithValue("$force", force);
        using SqliteDataReader reader = select.ExecuteReader();
        var pending = new List<string>();
        while (reader.Read())
        {
            pending.Add(reader.GetString(0));
        }

        return (pending, removed);
    }

    private static int CountVersions(SqliteConnection connection, SqliteTransaction transaction)
    {
        using SqliteCommand count = Command(
            connection,
            transaction,
            "SELECT count(*) FROM api_usage_library_versions WHERE read_at IS NOT NULL"
        );
        return Convert.ToInt32(count.ExecuteScalar(), CultureInfo.InvariantCulture);
    }

    /// <summary>What reading an app library version found, or why it failed.</summary>
    private sealed record LibraryRead(
        string Version,
        string? CommitId,
        IReadOnlyList<LibraryApiEntry> Entries,
        string? Failure
    );

    private async Task<LibraryRead> ReadVersion(string version, CancellationToken cancellationToken)
    {
        string? commitId =
            version == SourceVersion && Source is not null ? await CommitId(Source.Root, cancellationToken) : null;
        try
        {
            List<LibraryApiEntry> entries = await Read(version, cancellationToken);
            return new LibraryRead(version, commitId, entries, null);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // A version that cannot be read is a fact about it, recorded and read again on the next run.
            return new LibraryRead(version, commitId, [], ex is FleetException ? ex.Message : ex.ToString());
        }
    }

    /// <summary>The commit a folder's checkout is at, with <c>+changes</c> when it has uncommitted ones.</summary>
    private static async Task<string?> CommitId(string folder, CancellationToken cancellationToken)
    {
        string? head = await Git(folder, ["rev-parse", "HEAD"], cancellationToken);
        if (head is null)
        {
            return null;
        }

        string? changes = await Git(folder, ["status", "--porcelain", "--untracked-files=no"], cancellationToken);
        return changes is { Length: > 0 } ? $"{head}+changes" : head;
    }

    private static async Task<string?> Git(string folder, string[] arguments, CancellationToken cancellationToken)
    {
        var start = new ProcessStartInfo("git")
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        start.ArgumentList.Add("-C");
        start.ArgumentList.Add(folder);
        foreach (string argument in arguments)
        {
            start.ArgumentList.Add(argument);
        }

        try
        {
            using Process process = Process.Start(start) ?? throw new InvalidOperationException("git did not start.");
            Task<string> error = process.StandardError.ReadToEndAsync(cancellationToken);
            string output = await process.StandardOutput.ReadToEndAsync(cancellationToken);
            await error;
            await process.WaitForExitAsync(cancellationToken);
            return process.ExitCode == 0 ? output.Trim() : null;
        }
        catch (Exception ex) when (ex is System.ComponentModel.Win32Exception or InvalidOperationException)
        {
            return null;
        }
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private Task<List<LibraryApiEntry>> Read(string version, CancellationToken cancellationToken) =>
        version == SourceVersion && Source is not null
            ? LibraryApiReader.ReadSource(Source, cancellationToken)
            : LibraryApiReader.ReadPublished(version, cancellationToken);

    /// <summary>
    /// Replaces the public API recorded for a version with what a read found. A read that failed keeps the API an
    /// earlier read found, and only says why it failed, so that a version that stops compiling for a moment keeps one.
    /// </summary>
    private static void PutVersion(SqliteConnection connection, SqliteTransaction transaction, LibraryRead read)
    {
        if (read.Failure is not null)
        {
            using SqliteCommand fail = Command(
                connection,
                transaction,
                """
                INSERT INTO api_usage_library_versions (version, failure) VALUES ($version, $failure)
                ON CONFLICT (version) DO UPDATE SET failure = excluded.failure
                """
            );
            Set(fail, "$version", read.Version);
            Set(fail, "$failure", read.Failure);
            fail.ExecuteNonQuery();
            return;
        }

        foreach (string table in (string[])["api_usage_library_api", "api_usage_library_api_exposes"])
        {
            using SqliteCommand delete = Command(
                connection,
                transaction,
                $"DELETE FROM {table} WHERE version = $version"
            );
            Set(delete, "$version", read.Version);
            delete.ExecuteNonQuery();
        }

        using (
            SqliteCommand version = Command(
                connection,
                transaction,
                """
                INSERT OR REPLACE INTO api_usage_library_versions (version, commit_id, read_at, failure)
                VALUES ($version, $commitId, $readAt, NULL)
                """
            )
        )
        {
            Set(version, "$version", read.Version);
            Set(version, "$commitId", read.CommitId);
            Set(
                version,
                "$readAt",
                DateTimeOffset.UtcNow.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture)
            );
            version.ExecuteNonQuery();
        }

        using SqliteCommand entry = Command(
            connection,
            transaction,
            """
            INSERT INTO api_usage_library_api (version, symbol, assembly, kind, namespace, containing_type, visible,
                obsolete, extension_point, file, line)
            VALUES ($version, $symbol, $assembly, $kind, $namespace, $containingType, $visible, $obsolete,
                $extensionPoint, $file, $line)
            """
        );
        using SqliteCommand exposes = Command(
            connection,
            transaction,
            "INSERT INTO api_usage_library_api_exposes (version, symbol, exposed) VALUES ($version, $symbol, $exposed)"
        );
        foreach (LibraryApiEntry e in read.Entries)
        {
            Set(entry, "$version", read.Version);
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
                Set(exposes, "$version", read.Version);
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
