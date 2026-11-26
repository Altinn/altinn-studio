using System.Globalization;
using System.Text.Json;
using Altinn.Studio.Common.Domain;
using Altinn.Studio.Common.Domain.App;
using Microsoft.Data.Sqlite;

namespace Altinn.Studio.Fleet.Analysis;

/// <summary>What the database has for an app from an earlier run of an analysis.</summary>
/// <param name="Version">The app's deployed version then.</param>
/// <param name="Failed">Whether the app could not be analyzed.</param>
public sealed record AnalyzedApp(string? Version, bool Failed);

/// <summary>How an analysis of an app ended.</summary>
/// <param name="Failure">Why it wrote no result, or <c>null</c>.</param>
/// <param name="ResultFile">The file it wrote, when it wrote one.</param>
/// <param name="Seconds">How long it took.</param>
public sealed record AnalysisOutcome(string? Failure, string? ResultFile, double Seconds);

/// <summary>
/// The SQLite file that <c>fleet analysis</c> writes: a <c>runs</c> table with each app each analysis has looked at,
/// and the analyses' own tables. It is safe to use from several threads: one call at a time reads or writes.
/// </summary>
/// <remarks>
/// It is separate from the environments' indexes. An index is derived from the files in the store and can be rebuilt
/// from them at any time, and the store may be a read-only copy. An analysis may build each app, which takes minutes
/// and packages from the network, so its results are kept app by app and only redone for apps that changed.
/// </remarks>
public sealed class AnalysisDatabase : IDisposable
{
    /// <summary>
    /// The version of the tables below. 2 records which tables each analysis created, and how api-usage records
    /// incomplete compilations, so files from before are not read.
    /// </summary>
    public const int SchemaVersion = 2;

    private const string Schema = """
        CREATE TABLE meta (
            key TEXT NOT NULL PRIMARY KEY,
            value TEXT NOT NULL
        ) WITHOUT ROWID;

        -- One row per app per analysis, with the app's deployed version then and why the analysis failed when it did.
        CREATE TABLE runs (
            analysis TEXT NOT NULL,
            env TEXT NOT NULL,
            org TEXT NOT NULL,
            app TEXT NOT NULL,
            version TEXT,
            failure TEXT,
            seconds REAL NOT NULL,
            analyzed_at TEXT NOT NULL,
            PRIMARY KEY (analysis, env, org, app)
        ) WITHOUT ROWID;
        """;

    private readonly SqliteConnection _connection;
    private readonly Lock _gate = new();

    private AnalysisDatabase(SqliteConnection connection)
    {
        _connection = connection;
    }

    /// <summary>Opens the file to change it, and creates it when there is none.</summary>
    /// <exception cref="FleetException">The file has another schema version.</exception>
    public static AnalysisDatabase Open(string path)
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
        var database = new AnalysisDatabase(connection);
        try
        {
            database.Execute(null, "PRAGMA journal_mode = DELETE;", []);
            // The transaction takes the write lock before the version is read, so that two commands creating the same
            // file one after the other do not both create the tables.
            using SqliteTransaction transaction = connection.BeginTransaction(deferred: false);
            string? version = database.ReadMeta("schema_version", transaction);
            if (version is null)
            {
                database.Execute(transaction, Schema, []);
                database.SetMeta("schema_version", Invariant(SchemaVersion), transaction);
            }
            else if (version != Invariant(SchemaVersion))
            {
                throw new FleetException(
                    $"{path} was written by another version of fleet. Delete it, or give another --out."
                );
            }

            transaction.Commit();

            return database;
        }
        catch
        {
            database.Dispose();
            throw;
        }
    }

    /// <summary>What an analysis's tables and indexes start with.</summary>
    public static string TablePrefix(IAppAnalysis analysis) => analysis.Name.Replace('-', '_') + "_";

    /// <summary>
    /// Creates an analysis's tables, or replaces them and forgets its runs when another version of it created them.
    /// </summary>
    /// <remarks>
    /// The tables an analysis created are recorded, and only those are dropped: another analysis's name can start with
    /// this one's, as <c>api_usage_</c> starts with <c>api_</c>.
    /// </remarks>
    public void Prepare(IAppAnalysis analysis)
    {
        using Lock.Scope scope = _gate.EnterScope();
        string versionKey = $"analysis.{analysis.Name}.version";
        string tablesKey = $"analysis.{analysis.Name}.tables";
        // As in Open, the write lock comes before the version is read.
        using SqliteTransaction transaction = _connection.BeginTransaction(deferred: false);
        if (ReadMeta(versionKey, transaction) == Invariant(analysis.Version))
        {
            return;
        }

        string prefix = TablePrefix(analysis);
        string[] earlierTables = (ReadMeta(tablesKey, transaction) ?? "").Split(
            '\n',
            StringSplitOptions.RemoveEmptyEntries
        );
        foreach (string table in earlierTables)
        {
            Execute(transaction, $"DROP TABLE IF EXISTS {Quote(table)}", []);
        }

        Execute(transaction, "DELETE FROM runs WHERE analysis = $analysis", [("$analysis", analysis.Name)]);
        HashSet<string> before = [.. Objects(null, transaction)];
        Execute(transaction, analysis.Schema, []);
        var created = new List<string>();
        foreach (string name in Objects(null, transaction).Where(name => !before.Contains(name)))
        {
            if (!name.StartsWith(prefix, StringComparison.Ordinal))
            {
                throw new InvalidOperationException(
                    $"The {analysis.Name} analysis creates {name}, but its tables and indexes must start with {prefix}."
                );
            }

            created.Add(name);
        }

        SetMeta(versionKey, Invariant(analysis.Version), transaction);
        SetMeta(
            tablesKey,
            string.Join('\n', Objects("table", transaction).Where(created.Contains).Order(StringComparer.Ordinal)),
            transaction
        );
        transaction.Commit();
    }

    /// <summary>The apps an analysis has looked at in an environment.</summary>
    public Dictionary<AppIdentifier, AnalyzedApp> ReadApps(IAppAnalysis analysis, RuntimeEnvironment environment)
    {
        using Lock.Scope scope = _gate.EnterScope();
        var apps = new Dictionary<AppIdentifier, AnalyzedApp>();
        using SqliteCommand command = Command(
            null,
            "SELECT org, app, version, failure FROM runs WHERE analysis = $analysis AND env = $env"
        );
        command.Parameters.AddWithValue("$analysis", analysis.Name);
        command.Parameters.AddWithValue("$env", environment.Name);
        using SqliteDataReader reader = command.ExecuteReader();
        while (reader.Read())
        {
            if (AppIdentifier.TryParse(reader.GetString(0), reader.GetString(1), out AppIdentifier app))
            {
                apps[app] = new AnalyzedApp(reader.IsDBNull(2) ? null : reader.GetString(2), !reader.IsDBNull(3));
            }
        }

        return apps;
    }

    /// <summary>
    /// Replaces what the database has for an app and an analysis, in one transaction: the run, and what the analysis
    /// records from its result file when it wrote one. A result file that cannot be read is recorded as a failure.
    /// </summary>
    /// <returns>Why the app could not be analyzed, or <c>null</c> when it could.</returns>
    public string? PutApp(
        IAppAnalysis analysis,
        RuntimeEnvironment environment,
        AppIdentifier app,
        string? version,
        AnalysisOutcome outcome,
        DateTimeOffset analyzedAt
    )
    {
        lock (_gate)
        {
            try
            {
                return Put(analysis, environment, app, version, outcome, analyzedAt);
            }
            catch (Exception ex) when (ex is JsonException or IOException)
            {
                return Put(analysis, environment, app, version, Unreadable(outcome, ex), analyzedAt);
            }
        }
    }

    /// <summary>
    /// Records how the analysis of an item ended, with <see cref="IItemAnalysis.RecordItem"/>, in one transaction. A
    /// result file that cannot be read is recorded as a failure.
    /// </summary>
    /// <returns>Why the item could not be analyzed, or <c>null</c> when it could.</returns>
    public string? PutItem(IItemAnalysis analysis, AnalysisItem item, AnalysisOutcome outcome)
    {
        lock (_gate)
        {
            try
            {
                return WriteLocked(tables => analysis.RecordItem(tables, item, outcome));
            }
            catch (Exception ex) when (ex is JsonException or IOException)
            {
                return WriteLocked(tables => analysis.RecordItem(tables, item, Unreadable(outcome, ex)));
            }
        }
    }

    /// <summary>Forgets what an analysis recorded for apps that no longer run.</summary>
    public void RemoveApps(
        IAppAnalysis analysis,
        RuntimeEnvironment environment,
        IReadOnlyCollection<AppIdentifier> apps
    )
    {
        lock (_gate)
        {
            using SqliteTransaction transaction = _connection.BeginTransaction();
            foreach (AppIdentifier app in apps)
            {
                DeleteApp(analysis, environment, app, transaction);
            }

            transaction.Commit();
        }
    }

    /// <summary>
    /// Reads and changes the analyses' tables in one transaction, as <see cref="IItemAnalysis.PlanItems"/> does. The
    /// analyses' tables must exist, from <see cref="Prepare"/>.
    /// </summary>
    internal T Write<T>(Func<AnalysisTables, T> change)
    {
        lock (_gate)
        {
            return WriteLocked(change);
        }
    }

    private T WriteLocked<T>(Func<AnalysisTables, T> change)
    {
        using SqliteTransaction transaction = _connection.BeginTransaction();
        T result = change(new AnalysisTables(_connection, transaction));
        transaction.Commit();
        return result;
    }

    private static AnalysisOutcome Unreadable(AnalysisOutcome outcome, Exception ex) =>
        outcome with
        {
            Failure = $"The analysis's result could not be read: {ex.Message}",
            ResultFile = null,
        };

    public void Dispose()
    {
        lock (_gate)
        {
            _connection.Dispose();
        }
    }

    private string? Put(
        IAppAnalysis analysis,
        RuntimeEnvironment environment,
        AppIdentifier app,
        string? version,
        AnalysisOutcome outcome,
        DateTimeOffset analyzedAt
    )
    {
        using SqliteTransaction transaction = _connection.BeginTransaction();
        DeleteApp(analysis, environment, app, transaction);
        string? failure = outcome.Failure;
        if (failure is null && outcome.ResultFile is { } resultFile)
        {
            failure = analysis.Record(new AppRecorder(_connection, transaction, environment, app), resultFile);
        }

        Execute(
            transaction,
            """
            INSERT INTO runs (analysis, env, org, app, version, failure, seconds, analyzed_at)
            VALUES ($analysis, $env, $org, $app, $version, $failure, $seconds, $analyzedAt)
            """,
            [
                ("$analysis", analysis.Name),
                ("$env", environment.Name),
                ("$org", app.Org.Value),
                ("$app", app.App.Value),
                ("$version", version),
                ("$failure", failure),
                ("$seconds", Math.Round(outcome.Seconds, 1)),
                (
                    "$analyzedAt",
                    analyzedAt.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture)
                ),
            ]
        );
        transaction.Commit();
        return failure;
    }

    private void DeleteApp(
        IAppAnalysis analysis,
        RuntimeEnvironment environment,
        AppIdentifier app,
        SqliteTransaction transaction
    )
    {
        (string, object?)[] key = [("$env", environment.Name), ("$org", app.Org.Value), ("$app", app.App.Value)];
        foreach (string table in analysis.AppTables)
        {
            Execute(transaction, $"DELETE FROM {Quote(table)} WHERE env = $env AND org = $org AND app = $app", key);
        }

        Execute(
            transaction,
            "DELETE FROM runs WHERE analysis = $analysis AND env = $env AND org = $org AND app = $app",
            [("$analysis", analysis.Name), .. key]
        );
    }

    private List<string> Objects(string? type, SqliteTransaction transaction)
    {
        using SqliteCommand command = Command(
            transaction,
            "SELECT name FROM sqlite_master WHERE ($type IS NULL OR type = $type) AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\'"
        );
        command.Parameters.AddWithValue("$type", (object?)type ?? DBNull.Value);
        using SqliteDataReader reader = command.ExecuteReader();
        var names = new List<string>();
        while (reader.Read())
        {
            names.Add(reader.GetString(0));
        }

        return names;
    }

    private void SetMeta(string key, string value, SqliteTransaction? transaction) =>
        Execute(
            transaction,
            "INSERT INTO meta (key, value) VALUES ($key, $value) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
            [("$key", key), ("$value", value)]
        );

    private string? ReadMeta(string key, SqliteTransaction transaction)
    {
        try
        {
            using SqliteCommand command = Command(transaction, "SELECT value FROM meta WHERE key = $key");
            command.Parameters.AddWithValue("$key", key);
            return command.ExecuteScalar() as string;
        }
        catch (SqliteException)
        {
            return null;
        }
    }

    private void Execute(SqliteTransaction? transaction, string sql, ReadOnlySpan<(string Name, object? Value)> values)
    {
        using SqliteCommand command = Command(transaction, sql);
        foreach ((string name, object? value) in values)
        {
            command.Parameters.AddWithValue(name, value ?? DBNull.Value);
        }

        command.ExecuteNonQuery();
    }

    private SqliteCommand Command(SqliteTransaction? transaction, string sql)
    {
        SqliteCommand command = _connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = sql;
        return command;
    }

    internal static string Quote(string identifier) =>
        $"\"{identifier.Replace("\"", "\"\"", StringComparison.Ordinal)}\"";

    private static string Invariant(int value) => value.ToString(CultureInfo.InvariantCulture);
}

/// <summary>
/// An analysis's tables, in the transaction that records what the analysis found. SQL values are given as
/// <c>("$name", value)</c> pairs, and <c>null</c> is SQL's <c>NULL</c>.
/// </summary>
public sealed class AnalysisTables
{
    private readonly SqliteConnection _connection;
    private readonly SqliteTransaction _transaction;

    internal AnalysisTables(SqliteConnection connection, SqliteTransaction transaction)
    {
        _connection = connection;
        _transaction = transaction;
    }

    /// <summary>Runs a statement, and returns how many rows it changed.</summary>
    public int Execute(string sql, params ReadOnlySpan<(string Name, object? Value)> values)
    {
        using SqliteCommand command = Command(sql, values);
        return command.ExecuteNonQuery();
    }

    /// <summary>Runs a query, and returns its rows as <paramref name="read"/> makes them.</summary>
    public List<T> Query<T>(
        string sql,
        Func<SqliteDataReader, T> read,
        params ReadOnlySpan<(string Name, object? Value)> values
    )
    {
        using SqliteCommand command = Command(sql, values);
        using SqliteDataReader reader = command.ExecuteReader();
        var rows = new List<T>();
        while (reader.Read())
        {
            rows.Add(read(reader));
        }

        return rows;
    }

    /// <summary>Prepares to insert rows into a table, with these columns.</summary>
    /// <param name="table">The table.</param>
    /// <param name="columns">The columns that <see cref="TableRows.Add"/> gives values for, in that order.</param>
    /// <param name="ignoreDuplicates">Whether a row with the key of one already there is skipped.</param>
    public TableRows Rows(string table, IReadOnlyList<string> columns, bool ignoreDuplicates = false) =>
        TableRows.Create(_connection, _transaction, table, [], columns, ignoreDuplicates);

    private SqliteCommand Command(string sql, ReadOnlySpan<(string Name, object? Value)> values)
    {
        SqliteCommand command = _connection.CreateCommand();
        command.Transaction = _transaction;
        command.CommandText = sql;
        foreach ((string name, object? value) in values)
        {
            command.Parameters.AddWithValue(name, value ?? DBNull.Value);
        }

        return command;
    }
}

/// <summary>
/// Writes an app's rows into an analysis's tables, in the transaction that records the app. Each row gets the app's
/// <c>env</c>, <c>org</c> and <c>app</c>.
/// </summary>
public sealed class AppRecorder(
    SqliteConnection connection,
    SqliteTransaction transaction,
    RuntimeEnvironment environment,
    AppIdentifier app
)
{
    /// <summary>Prepares to insert rows into one of the analysis's tables, with these columns besides the app's.</summary>
    /// <param name="table">The table.</param>
    /// <param name="columns">The columns that <see cref="TableRows.Add"/> gives values for, in that order.</param>
    /// <param name="ignoreDuplicates">Whether a row with the key of one already there is skipped.</param>
    public TableRows Rows(string table, IReadOnlyList<string> columns, bool ignoreDuplicates = false) =>
        TableRows.Create(
            connection,
            transaction,
            table,
            [("env", environment.Name), ("org", app.Org.Value), ("app", app.App.Value)],
            columns,
            ignoreDuplicates
        );
}

/// <summary>Inserts rows into one table. See <see cref="AnalysisTables.Rows"/> and <see cref="AppRecorder.Rows"/>.</summary>
public sealed class TableRows : IDisposable
{
    private readonly SqliteCommand _command;
    private readonly int _fixed;
    private readonly int _columns;

    private TableRows(SqliteCommand command, int fixedColumns, int columns)
    {
        _command = command;
        _fixed = fixedColumns;
        _columns = columns;
    }

    internal static TableRows Create(
        SqliteConnection connection,
        SqliteTransaction transaction,
        string table,
        IReadOnlyList<(string Column, object Value)> fixedValues,
        IReadOnlyList<string> columns,
        bool ignoreDuplicates
    )
    {
        SqliteCommand command = connection.CreateCommand();
        command.Transaction = transaction;
        IEnumerable<string> names = [.. fixedValues.Select(f => f.Column), .. columns];
        command.CommandText =
            $"INSERT {(ignoreDuplicates ? "OR IGNORE " : "")}INTO {AnalysisDatabase.Quote(table)} "
            + $"({string.Join(", ", names.Select(AnalysisDatabase.Quote))}) "
            + $"VALUES ({string.Join(", ", names.Select((_, i) => $"$p{i}"))})";
        for (int i = 0; i < fixedValues.Count; i++)
        {
            command.Parameters.AddWithValue($"$p{i}", fixedValues[i].Value);
        }

        for (int i = 0; i < columns.Count; i++)
        {
            command.Parameters.AddWithValue($"$p{fixedValues.Count + i}", DBNull.Value);
        }

        return new TableRows(command, fixedValues.Count, columns.Count);
    }

    /// <summary>Inserts a row with these values, in the order of the columns.</summary>
    public void Add(params ReadOnlySpan<object?> values)
    {
        if (values.Length != _columns)
        {
            throw new ArgumentException($"Expected {_columns} values, not {values.Length}.", nameof(values));
        }

        for (int i = 0; i < values.Length; i++)
        {
            _command.Parameters[_fixed + i].Value = values[i] ?? DBNull.Value;
        }

        _command.ExecuteNonQuery();
    }

    public void Dispose() => _command.Dispose();
}
