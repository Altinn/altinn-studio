using System.Globalization;
using Altinn.Studio.Common.Domain;
using Altinn.Studio.Common.Domain.App;
using Microsoft.Data.Sqlite;

namespace Altinn.Studio.Fleet.ApiUsage;

/// <summary>What an earlier collection recorded for an app.</summary>
/// <param name="Version">The app's deployed version then.</param>
/// <param name="Failed">Whether the app could not be analyzed.</param>
internal sealed record CollectedApp(string? Version, bool Failed);

/// <summary>
/// The SQLite file that <c>fleet api-usage</c> writes, separate from the environments' indexes because it is derived
/// from building the apps, which needs packages from the network and takes minutes, rather than from their files.
/// </summary>
internal sealed class UsageDatabase : IDisposable
{
    public const int SchemaVersion = 1;

    private const string Schema = """
        CREATE TABLE meta (
            key TEXT NOT NULL PRIMARY KEY,
            value TEXT NOT NULL
        ) WITHOUT ROWID;

        -- One row per analyzed app, with why it could not be analyzed when it could not.
        CREATE TABLE runs (
            env TEXT NOT NULL,
            org TEXT NOT NULL,
            app TEXT NOT NULL,
            version TEXT,
            project TEXT,
            library_version TEXT,
            failure TEXT,
            restore_error TEXT,
            compile_errors INTEGER NOT NULL,
            sample_errors TEXT,
            load_failures TEXT,
            test_projects TEXT,
            seconds REAL NOT NULL,
            collected_at TEXT NOT NULL,
            PRIMARY KEY (env, org, app)
        ) WITHOUT ROWID;

        -- The app library symbols an app's code binds to. source is app, generated or test.
        CREATE TABLE uses (
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
        CREATE INDEX uses_by_symbol ON uses (symbol);

        -- What the third-party packages an app uses reference of the app library. A member is named without its
        -- parameters and stands for every overload.
        CREATE TABLE package_uses (
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
        CREATE INDEX package_uses_by_symbol ON package_uses (symbol);

        -- The types and members of an app library version, under a label such as v8 or main.
        CREATE TABLE surface (
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
        CREATE TABLE surface_exposes (
            library TEXT NOT NULL,
            symbol TEXT NOT NULL,
            exposed TEXT NOT NULL,
            PRIMARY KEY (library, symbol, exposed)
        ) WITHOUT ROWID;
        """;

    private static readonly string[] s_appTables = ["runs", "uses", "package_uses"];

    private readonly SqliteConnection _connection;

    private UsageDatabase(SqliteConnection connection)
    {
        _connection = connection;
    }

    /// <summary>Opens the file to change it, and creates it when there is none.</summary>
    /// <exception cref="FleetException">The file has another schema version.</exception>
    public static UsageDatabase Open(string path)
    {
        if (Path.GetDirectoryName(Path.GetFullPath(path)) is { Length: > 0 } directory)
        {
            Directory.CreateDirectory(directory);
        }

        var connection = new SqliteConnection(
            new SqliteConnectionStringBuilder
            {
                DataSource = path,
                Mode = SqliteOpenMode.ReadWriteCreate,
                Pooling = false,
            }.ToString()
        );
        connection.Open();
        var database = new UsageDatabase(connection);
        try
        {
            database.Execute("PRAGMA journal_mode = DELETE;");
            string? version = database.ReadMeta("schema_version");
            if (version is null)
            {
                using SqliteTransaction transaction = connection.BeginTransaction();
                database.Execute(Schema, transaction);
                database.SetMeta("schema_version", SchemaVersion.ToString(CultureInfo.InvariantCulture), transaction);
                transaction.Commit();
            }
            else if (version != SchemaVersion.ToString(CultureInfo.InvariantCulture))
            {
                throw new FleetException(
                    $"{path} was written by another version of fleet. Delete it, or give another --out."
                );
            }

            return database;
        }
        catch
        {
            database.Dispose();
            throw;
        }
    }

    /// <summary>The apps an earlier collection recorded for an environment.</summary>
    public Dictionary<AppIdentifier, CollectedApp> ReadApps(RuntimeEnvironment environment)
    {
        var apps = new Dictionary<AppIdentifier, CollectedApp>();
        using SqliteCommand command = _connection.CreateCommand();
        command.CommandText = "SELECT org, app, version, failure FROM runs WHERE env = $env";
        command.Parameters.AddWithValue("$env", environment.Name);
        using SqliteDataReader reader = command.ExecuteReader();
        while (reader.Read())
        {
            if (AppIdentifier.TryParse(reader.GetString(0), reader.GetString(1), out AppIdentifier app))
            {
                apps[app] = new CollectedApp(reader.IsDBNull(2) ? null : reader.GetString(2), !reader.IsDBNull(3));
            }
        }

        return apps;
    }

    /// <summary>Replaces what the file has for an app, in one transaction.</summary>
    public void PutApp(
        RuntimeEnvironment environment,
        AppIdentifier app,
        string? version,
        AppUsage usage,
        DateTimeOffset collectedAt
    )
    {
        using SqliteTransaction transaction = _connection.BeginTransaction();
        DeleteApp(environment, app, transaction);
        Execute(
            transaction,
            """
            INSERT INTO runs (env, org, app, version, project, library_version, failure, restore_error, compile_errors,
                sample_errors, load_failures, test_projects, seconds, collected_at)
            VALUES ($env, $org, $app, $version, $project, $libraryVersion, $failure, $restoreError, $compileErrors,
                $sampleErrors, $loadFailures, $testProjects, $seconds, $collectedAt)
            """,
            [
                ("$env", environment.Name),
                ("$org", app.Org.Value),
                ("$app", app.App.Value),
                ("$version", version),
                ("$project", usage.Project),
                ("$libraryVersion", usage.LibraryVersion),
                ("$failure", usage.Failure),
                ("$restoreError", usage.RestoreError),
                ("$compileErrors", usage.CompileErrors),
                ("$sampleErrors", Lines(usage.SampleErrors)),
                ("$loadFailures", Lines(usage.LoadFailures)),
                ("$testProjects", Lines(usage.TestProjects)),
                ("$seconds", Math.Round(usage.Seconds, 1)),
                (
                    "$collectedAt",
                    collectedAt.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture)
                ),
            ]
        );

        using (
            SqliteCommand use = Prepare(
                transaction,
                """
                INSERT INTO uses (env, org, app, symbol, assembly, kind, source, count, first_location)
                VALUES ($env, $org, $app, $symbol, $assembly, $kind, $source, $count, $first)
                """
            )
        )
        {
            foreach (SymbolUse symbol in usage.Uses)
            {
                Run(
                    use,
                    environment,
                    app,
                    [
                        ("$symbol", symbol.Symbol),
                        ("$assembly", symbol.Assembly),
                        ("$kind", symbol.Kind),
                        ("$source", symbol.Source),
                        ("$count", symbol.Count),
                        ("$first", symbol.FirstLocation),
                    ]
                );
            }
        }

        using (
            SqliteCommand packageUse = Prepare(
                transaction,
                """
                INSERT OR IGNORE INTO package_uses (env, org, app, package, version, assembly, symbol, kind)
                VALUES ($env, $org, $app, $package, $version, $assembly, $symbol, $kind)
                """
            )
        )
        {
            foreach (PackageUse package in usage.Packages)
            {
                foreach (PackageReferenceUse reference in package.References)
                {
                    Run(
                        packageUse,
                        environment,
                        app,
                        [
                            ("$package", package.Package),
                            ("$version", package.Version),
                            ("$assembly", package.Assembly),
                            ("$symbol", reference.Symbol),
                            ("$kind", reference.Kind),
                        ]
                    );
                }
            }
        }

        transaction.Commit();
    }

    /// <summary>Removes what the file has for apps that no longer run.</summary>
    public void RemoveApps(RuntimeEnvironment environment, IReadOnlyCollection<AppIdentifier> apps)
    {
        using SqliteTransaction transaction = _connection.BeginTransaction();
        foreach (AppIdentifier app in apps)
        {
            DeleteApp(environment, app, transaction);
        }

        transaction.Commit();
    }

    /// <summary>Replaces the surface recorded under a label.</summary>
    public void PutSurface(string library, IReadOnlyList<SurfaceEntry> entries)
    {
        using SqliteTransaction transaction = _connection.BeginTransaction();
        foreach (string table in (string[])["surface", "surface_exposes"])
        {
            Execute(transaction, $"DELETE FROM {table} WHERE library = $library", [("$library", library)]);
        }

        using SqliteCommand entry = Prepare(
            transaction,
            """
            INSERT INTO surface (library, symbol, assembly, kind, namespace, containing_type, visible, obsolete,
                extension_point, file, line)
            VALUES ($library, $symbol, $assembly, $kind, $namespace, $containingType, $visible, $obsolete,
                $extensionPoint, $file, $line)
            """
        );
        using SqliteCommand exposes = Prepare(
            transaction,
            "INSERT INTO surface_exposes (library, symbol, exposed) VALUES ($library, $symbol, $exposed)"
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

        transaction.Commit();
    }

    public void SetMeta(string key, string value, SqliteTransaction? transaction = null) =>
        Execute(
            transaction,
            "INSERT INTO meta (key, value) VALUES ($key, $value) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
            [("$key", key), ("$value", value)]
        );

    public void Dispose() => _connection.Dispose();

    private string? ReadMeta(string key)
    {
        try
        {
            using SqliteCommand command = _connection.CreateCommand();
            command.CommandText = "SELECT value FROM meta WHERE key = $key";
            command.Parameters.AddWithValue("$key", key);
            return command.ExecuteScalar() as string;
        }
        catch (SqliteException)
        {
            return null;
        }
    }

    private void DeleteApp(RuntimeEnvironment environment, AppIdentifier app, SqliteTransaction transaction)
    {
        foreach (string table in s_appTables)
        {
            Execute(
                transaction,
                $"DELETE FROM {table} WHERE env = $env AND org = $org AND app = $app",
                [("$env", environment.Name), ("$org", app.Org.Value), ("$app", app.App.Value)]
            );
        }
    }

    private static string? Lines(IReadOnlyList<string> values) => values.Count == 0 ? null : string.Join('\n', values);

    private void Execute(string sql, SqliteTransaction? transaction = null) => Execute(transaction, sql, []);

    private void Execute(SqliteTransaction? transaction, string sql, ReadOnlySpan<(string Name, object? Value)> values)
    {
        using SqliteCommand command = Prepare(transaction, sql);
        foreach ((string name, object? value) in values)
        {
            Set(command, name, value);
        }

        command.ExecuteNonQuery();
    }

    private SqliteCommand Prepare(SqliteTransaction? transaction, string sql)
    {
        SqliteCommand command = _connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = sql;
        return command;
    }

    private static void Run(
        SqliteCommand command,
        RuntimeEnvironment environment,
        AppIdentifier app,
        ReadOnlySpan<(string Name, object? Value)> values
    )
    {
        Set(command, "$env", environment.Name);
        Set(command, "$org", app.Org.Value);
        Set(command, "$app", app.App.Value);
        foreach ((string name, object? value) in values)
        {
            Set(command, name, value);
        }

        command.ExecuteNonQuery();
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
