using System.Globalization;
using Altinn.Studio.Common.Domain;
using Altinn.Studio.Common.Domain.App;
using Altinn.Studio.Fleet.Sync;
using Microsoft.Data.Sqlite;

namespace Altinn.Studio.Fleet.Store;

/// <summary>The release an app's files came from, which only the index remembers.</summary>
internal sealed record StoredRelease(
    AppVersion Version,
    CommitSha Commit,
    HostName StudioHost,
    DateTimeOffset ReleasedAt,
    DateTimeOffset FetchedAt
);

/// <summary>An app as the index has it.</summary>
/// <param name="App">The app.</param>
/// <param name="Release">
/// The release its files came from, or <c>null</c> when the index was rebuilt without knowing it, so that the next
/// sync fetches the app again.
/// </param>
internal sealed record IndexedApp(AppIdentifier App, StoredRelease? Release);

/// <summary>An app the index is about to record, with its files and what they describe.</summary>
internal sealed record IndexedAppContent(IndexedApp App, AppFiles Files, AppDescription Description);

/// <summary>
/// An environment's <c>index.sqlite</c>. Its tables are derived from the files on disk, except the version, commit
/// and release of each app and the failures, which only the index remembers.
/// </summary>
/// <remarks>
/// It uses a rollback journal rather than a write-ahead log, so that a copy of it opens on a read-only file system.
/// A read-only connection reads it without creating or changing any file beside it.
/// </remarks>
internal sealed class FleetIndex : IDisposable
{
    /// <summary>The version of the schema below. A tool with a newer one rebuilds the index from disk.</summary>
    public const int SchemaVersion = 2;

    private const string Schema = """
        CREATE TABLE meta (
            key TEXT NOT NULL PRIMARY KEY,
            value TEXT NOT NULL
        ) WITHOUT ROWID;

        CREATE TABLE apps (
            org TEXT NOT NULL,
            app TEXT NOT NULL,
            version TEXT,
            commit_sha TEXT,
            studio_host TEXT,
            released_at TEXT,
            fetched_at TEXT,
            altinn_app_package TEXT,
            altinn_app_version TEXT,
            altinn_app_major INTEGER,
            altinn_app_unknown TEXT,
            frontend_version TEXT,
            target_framework TEXT,
            file_count INTEGER NOT NULL,
            bytes INTEGER NOT NULL,
            PRIMARY KEY (org, app)
        ) WITHOUT ROWID;

        CREATE TABLE packages (
            org TEXT NOT NULL,
            app TEXT NOT NULL,
            project TEXT NOT NULL,
            name TEXT NOT NULL COLLATE NOCASE,
            version TEXT,
            PRIMARY KEY (org, app, project, name)
        ) WITHOUT ROWID;
        CREATE INDEX packages_by_name ON packages (name, version);

        CREATE TABLE files (
            org TEXT NOT NULL,
            app TEXT NOT NULL,
            path TEXT NOT NULL,
            size INTEGER NOT NULL,
            sha256 TEXT NOT NULL,
            PRIMARY KEY (org, app, path)
        ) WITHOUT ROWID;
        CREATE INDEX files_by_sha256 ON files (sha256);
        CREATE INDEX files_by_path ON files (path);

        CREATE TABLE skipped (
            org TEXT NOT NULL,
            app TEXT NOT NULL,
            path TEXT NOT NULL,
            reason TEXT NOT NULL,
            PRIMARY KEY (org, app, path)
        ) WITHOUT ROWID;

        CREATE TABLE failures (
            org TEXT NOT NULL,
            app TEXT NOT NULL,
            version TEXT NOT NULL,
            kind TEXT NOT NULL,
            reason TEXT NOT NULL,
            failed_at TEXT NOT NULL,
            PRIMARY KEY (org, app)
        ) WITHOUT ROWID;
        """;

    private readonly SqliteConnection _connection;

    private FleetIndex(SqliteConnection connection)
    {
        _connection = connection;
    }

    internal SqliteConnection Connection => _connection;

    /// <summary>Opens an index only to read it, or returns <c>null</c> when there is none.</summary>
    public static FleetIndex? OpenReadOnly(string path)
    {
        if (!File.Exists(path))
        {
            return null;
        }

        var connection = new SqliteConnection(
            new SqliteConnectionStringBuilder
            {
                DataSource = path,
                Mode = SqliteOpenMode.ReadOnly,
                Pooling = false,
            }.ToString()
        );
        connection.Open();
        Execute(connection, "PRAGMA query_only = 1;");
        return new FleetIndex(connection);
    }

    /// <summary>Opens an index to change it, and creates it when there is none.</summary>
    public static FleetIndex OpenReadWrite(string path, RuntimeEnvironment environment, string toolVersion)
    {
        if (Path.GetDirectoryName(path) is { Length: > 0 } directory)
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
        Execute(connection, "PRAGMA journal_mode = DELETE;");
        var index = new FleetIndex(connection);
        if (index.ReadMeta("schema_version") is null)
        {
            using SqliteTransaction transaction = connection.BeginTransaction();
            Execute(connection, Schema, transaction);
            index.SetMeta("schema_version", SchemaVersion.ToString(CultureInfo.InvariantCulture), transaction);
            index.SetMeta("environment", environment.Name, transaction);
            index.SetMeta("tool_version", toolVersion, transaction);
            transaction.Commit();
        }

        return index;
    }

    /// <summary>The schema version the index was made with, or <c>null</c> when it has none.</summary>
    public int? ReadSchemaVersion() =>
        int.TryParse(ReadMeta("schema_version"), NumberStyles.None, CultureInfo.InvariantCulture, out int version)
            ? version
            : null;

    public string? ReadMeta(string key)
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

    /// <summary>
    /// The apps the index has. Only reads the columns every schema version has. A release whose columns do not all
    /// parse counts as unknown, so the next sync fetches the app again.
    /// </summary>
    public Dictionary<AppIdentifier, IndexedApp> ReadApps()
    {
        var apps = new Dictionary<AppIdentifier, IndexedApp>();
        using SqliteCommand command = _connection.CreateCommand();
        command.CommandText = "SELECT org, app, version, commit_sha, studio_host, released_at, fetched_at FROM apps";
        using SqliteDataReader reader = command.ExecuteReader();
        while (reader.Read())
        {
            if (!AppIdentifier.TryParse(reader.GetString(0), reader.GetString(1), out AppIdentifier app))
            {
                continue;
            }

            StoredRelease? release =
                AppVersion.TryParse(NullableString(reader, 2), out AppVersion version)
                && CommitSha.TryParse(NullableString(reader, 3), out CommitSha commit)
                && HostName.TryParse(NullableString(reader, 4), out HostName? host)
                && ParseTime(NullableString(reader, 5)) is { } released
                && ParseTime(NullableString(reader, 6)) is { } fetched
                    ? new StoredRelease(version, commit, host, released, fetched)
                    : null;
            apps[app] = new IndexedApp(app, release);
        }

        return apps;
    }

    /// <summary>The failures the index has. A row that does not parse is left out, so the app is tried again.</summary>
    public Dictionary<AppIdentifier, AppFailure> ReadFailures()
    {
        var failures = new Dictionary<AppIdentifier, AppFailure>();
        using SqliteCommand command = _connection.CreateCommand();
        command.CommandText = "SELECT org, app, version, kind, reason, failed_at FROM failures";
        using SqliteDataReader reader = command.ExecuteReader();
        while (reader.Read())
        {
            if (
                AppIdentifier.TryParse(reader.GetString(0), reader.GetString(1), out AppIdentifier app)
                && AppVersion.TryParse(reader.GetString(2), out AppVersion version)
                && ParseKind(reader.GetString(3)) is { } kind
                && ParseTime(reader.GetString(5)) is { } failedAt
            )
            {
                failures[app] = new AppFailure(app, version, kind, reader.GetString(4), failedAt);
            }
        }

        return failures;
    }

    public Dictionary<AppIdentifier, List<SkippedEntry>> ReadSkipped()
    {
        var skipped = new Dictionary<AppIdentifier, List<SkippedEntry>>();
        using SqliteCommand command = _connection.CreateCommand();
        command.CommandText = "SELECT org, app, path, reason FROM skipped";
        using SqliteDataReader reader = command.ExecuteReader();
        while (reader.Read())
        {
            if (AppIdentifier.TryParse(reader.GetString(0), reader.GetString(1), out AppIdentifier app))
            {
                if (!skipped.TryGetValue(app, out List<SkippedEntry>? entries))
                {
                    entries = [];
                    skipped[app] = entries;
                }

                entries.Add(new SkippedEntry(reader.GetString(2), reader.GetString(3)));
            }
        }

        return skipped;
    }

    /// <summary>Applies changes in one transaction.</summary>
    public void Write(
        IReadOnlyList<IndexedAppContent> puts,
        IReadOnlyCollection<AppIdentifier> removes,
        IReadOnlyCollection<AppFailure> failures,
        IReadOnlyCollection<AppIdentifier> clearedFailures,
        DateTimeOffset? contentChangedAt
    )
    {
        using SqliteTransaction transaction = _connection.BeginTransaction();
        using var writer = new Writer(_connection, transaction);
        foreach (AppIdentifier app in removes)
        {
            writer.Remove(app, includingFailure: true);
        }

        foreach (IndexedAppContent put in puts)
        {
            writer.Put(put);
        }

        foreach (AppIdentifier app in clearedFailures)
        {
            writer.ClearFailure(app);
        }

        foreach (AppFailure failure in failures)
        {
            writer.PutFailure(failure);
        }

        if (contentChangedAt is { } changed)
        {
            SetMeta("last_content_change", FormatTime(changed), transaction);
        }

        transaction.Commit();
    }

    public void SetMeta(string key, string value, SqliteTransaction? transaction = null)
    {
        using SqliteCommand command = _connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText =
            "INSERT INTO meta (key, value) VALUES ($key, $value) ON CONFLICT (key) DO UPDATE SET value = excluded.value";
        command.Parameters.AddWithValue("$key", key);
        command.Parameters.AddWithValue("$value", value);
        command.ExecuteNonQuery();
    }

    public long Count(string table)
    {
        using SqliteCommand command = _connection.CreateCommand();
        command.CommandText = table switch
        {
            "apps" => "SELECT count(*) FROM apps",
            "orgs" => "SELECT count(DISTINCT org) FROM apps",
            "failures" => "SELECT count(*) FROM failures",
            "files" => "SELECT count(*) FROM files",
            _ => throw new ArgumentOutOfRangeException(nameof(table)),
        };
        return Convert.ToInt64(command.ExecuteScalar(), CultureInfo.InvariantCulture);
    }

    public void Dispose() => _connection.Dispose();

    private const string ErrorKind = "error";
    private const string UnavailableKind = "unavailable";

    private static FailureKind? ParseKind(string kind) =>
        kind switch
        {
            ErrorKind => FailureKind.Error,
            UnavailableKind => FailureKind.Unavailable,
            _ => null,
        };

    internal static string FormatTime(DateTimeOffset time) =>
        time.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture);

    internal static DateTimeOffset? ParseTime(string? value) =>
        DateTimeOffset.TryParse(
            value,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal,
            out DateTimeOffset time
        )
            ? time
            : null;

    private static string? NullableString(SqliteDataReader reader, int ordinal) =>
        reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);

    private static void Execute(SqliteConnection connection, string sql, SqliteTransaction? transaction = null)
    {
        using SqliteCommand command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = sql;
        command.ExecuteNonQuery();
    }

    // Prepared statements for one transaction, reused for every row.
    private sealed class Writer : IDisposable
    {
        private readonly SqliteCommand[] _deletes;
        private readonly SqliteCommand _clearFailure;
        private readonly SqliteCommand _putApp;
        private readonly SqliteCommand _putPackage;
        private readonly SqliteCommand _putFile;
        private readonly SqliteCommand _putSkipped;
        private readonly SqliteCommand _putFailure;

        public Writer(SqliteConnection connection, SqliteTransaction transaction)
        {
            _deletes =
            [
                Command(connection, transaction, "DELETE FROM apps WHERE org = $org AND app = $app"),
                Command(connection, transaction, "DELETE FROM packages WHERE org = $org AND app = $app"),
                Command(connection, transaction, "DELETE FROM files WHERE org = $org AND app = $app"),
                Command(connection, transaction, "DELETE FROM skipped WHERE org = $org AND app = $app"),
            ];
            _clearFailure = Command(connection, transaction, "DELETE FROM failures WHERE org = $org AND app = $app");
            _putApp = Command(
                connection,
                transaction,
                """
                INSERT INTO apps (org, app, version, commit_sha, studio_host, released_at, fetched_at, altinn_app_package,
                    altinn_app_version, altinn_app_major, altinn_app_unknown, frontend_version, target_framework, file_count, bytes)
                VALUES ($org, $app, $version, $commit, $host, $released, $fetched, $package, $packageVersion, $major,
                    $unknown, $frontend, $framework, $fileCount, $bytes)
                """
            );
            _putPackage = Command(
                connection,
                transaction,
                "INSERT OR REPLACE INTO packages (org, app, project, name, version) VALUES ($org, $app, $project, $name, $version)"
            );
            _putFile = Command(
                connection,
                transaction,
                "INSERT INTO files (org, app, path, size, sha256) VALUES ($org, $app, $path, $size, $sha256)"
            );
            _putSkipped = Command(
                connection,
                transaction,
                "INSERT OR REPLACE INTO skipped (org, app, path, reason) VALUES ($org, $app, $path, $reason)"
            );
            _putFailure = Command(
                connection,
                transaction,
                """
                INSERT OR REPLACE INTO failures (org, app, version, kind, reason, failed_at)
                VALUES ($org, $app, $version, $kind, $reason, $failedAt)
                """
            );
        }

        public void Remove(AppIdentifier app, bool includingFailure)
        {
            foreach (SqliteCommand delete in _deletes)
            {
                Run(delete, app);
            }

            if (includingFailure)
            {
                ClearFailure(app);
            }
        }

        public void ClearFailure(AppIdentifier app) => Run(_clearFailure, app);

        // The unknown column says why an app has no major version.
        private static (PackageReference? Reference, int? Major, string? Unknown, string? Frontend) AltinnApp(
            AppDescription description
        )
        {
            if (description is not AppDescription.FormApp form)
            {
                return (null, null, "not-referenced", null);
            }

            (int? major, string? unknown) = Contract(form);
            return (form.AltinnAppReference, major, unknown, form.FrontendVersion?.Value);
        }

        private static (int? Major, string? Unknown) Contract(AppDescription.FormApp form) =>
            form switch
            {
                AppDescription.FormApp.V8OrEarlier { AltinnApp: { } package } => (package.Major, null),
                AppDescription.FormApp.V8OrEarlier => (null, "v8-by-frontend"),
                AppDescription.FormApp.V9OrLater v9 => (v9.AltinnApp.Major, null),
                AppDescription.FormApp.Inconsistent => (null, "inconsistent"),
                AppDescription.FormApp.UnknownContract unknown => (
                    null,
                    unknown.Reason switch
                    {
                        UnknownContractReason.VersionNotResolved => "version-not-resolved",
                        UnknownContractReason.NoMajorVersion => "no-major-version",
                        UnknownContractReason.NotReferencedByAppProject => "not-referenced-by-app-project",
                        UnknownContractReason.FrontendNotOfV8 => "frontend-not-of-v8",
                        _ => throw new InvalidOperationException($"Unknown reason {unknown.Reason}"),
                    }
                ),
                _ => throw new InvalidOperationException($"Unknown form app {form}"),
            };

        public void Put(IndexedAppContent content)
        {
            IndexedApp app = content.App;
            StoredRelease? release = app.Release;
            Remove(app.App, includingFailure: true);
            (PackageReference? altinnAppReference, int? major, string? unknown, string? frontend) = AltinnApp(
                content.Description
            );
            Run(
                _putApp,
                app.App,
                ("$version", release?.Version.Value),
                ("$commit", release?.Commit.Value),
                ("$host", release?.StudioHost.Value),
                ("$released", release is null ? null : FormatTime(release.ReleasedAt)),
                ("$fetched", release is null ? null : FormatTime(release.FetchedAt)),
                ("$package", altinnAppReference?.Name),
                ("$packageVersion", altinnAppReference?.Version),
                ("$major", major),
                ("$unknown", unknown),
                ("$frontend", frontend),
                ("$framework", content.Description.TargetFramework),
                ("$fileCount", content.Files.Files.Count),
                ("$bytes", content.Files.Bytes)
            );
            foreach (
                ProjectDescription.WellFormed project in content.Description.Projects.OfType<ProjectDescription.WellFormed>()
            )
            {
                foreach (PackageReference reference in project.PackageReferences)
                {
                    Run(
                        _putPackage,
                        app.App,
                        ("$project", project.Path.Value),
                        ("$name", reference.Name),
                        ("$version", reference.Version)
                    );
                }
            }

            foreach (FileRecord file in content.Files.Files)
            {
                Run(_putFile, app.App, ("$path", file.Path.Value), ("$size", file.Size), ("$sha256", file.Sha256.Hex));
            }

            foreach (SkippedEntry entry in content.Files.Skipped)
            {
                Run(_putSkipped, app.App, ("$path", entry.Path), ("$reason", entry.Reason));
            }
        }

        public void PutFailure(AppFailure failure) =>
            Run(
                _putFailure,
                failure.App,
                ("$version", failure.Version.Value),
                ("$kind", failure.Kind == FailureKind.Error ? ErrorKind : UnavailableKind),
                ("$reason", failure.Reason),
                ("$failedAt", FormatTime(failure.FailedAt))
            );

        public void Dispose()
        {
            foreach (
                SqliteCommand command in (SqliteCommand[])
                    [.. _deletes, _clearFailure, _putApp, _putPackage, _putFile, _putSkipped, _putFailure]
            )
            {
                command.Dispose();
            }
        }

        private static SqliteCommand Command(SqliteConnection connection, SqliteTransaction transaction, string sql)
        {
            SqliteCommand command = connection.CreateCommand();
            command.Transaction = transaction;
            command.CommandText = sql;
            return command;
        }

        private static void Run(
            SqliteCommand command,
            AppIdentifier app,
            params ReadOnlySpan<(string Name, object? Value)> values
        )
        {
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
}
