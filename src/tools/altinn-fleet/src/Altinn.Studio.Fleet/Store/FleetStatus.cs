using Altinn.Studio.Common.Domain;
using Microsoft.Data.Sqlite;

namespace Altinn.Studio.Fleet.Store;

/// <summary>What the store holds for an environment, read without network access and without writing.</summary>
public abstract record EnvironmentStatus
{
    private EnvironmentStatus(RuntimeEnvironment environment, CheckState? lastCheck)
    {
        Environment = environment;
        LastCheck = lastCheck;
    }

    /// <summary>The environment.</summary>
    public RuntimeEnvironment Environment { get; }

    /// <summary>What the last sync of the environment found, when this store ran it.</summary>
    public CheckState? LastCheck { get; }

    /// <summary>The environment has no index.</summary>
    /// <param name="Environment">The environment.</param>
    /// <param name="LastCheck">What the last sync found.</param>
    public sealed record NotSynced(RuntimeEnvironment Environment, CheckState? LastCheck)
        : EnvironmentStatus(Environment, LastCheck);

    /// <summary>The environment has an index.</summary>
    /// <param name="Environment">The environment.</param>
    /// <param name="LastCheck">What the last sync found.</param>
    /// <param name="Apps">How many apps the index has.</param>
    /// <param name="Orgs">How many service owners those apps belong to.</param>
    /// <param name="Failures">How many deployed versions could not be fetched.</param>
    /// <param name="SchemaVersion">The index's schema version, or <c>null</c> when it has none.</param>
    /// <param name="LastContentChange">When the environment's folder last changed, if the index says.</param>
    public sealed record Synced(
        RuntimeEnvironment Environment,
        CheckState? LastCheck,
        long Apps,
        long Orgs,
        long Failures,
        int? SchemaVersion,
        DateTimeOffset? LastContentChange
    ) : EnvironmentStatus(Environment, LastCheck);
}

/// <summary>Reads a store's environments for status and queries.</summary>
public static class FleetStoreReader
{
    /// <summary>Reads what the store holds for an environment.</summary>
    public static EnvironmentStatus GetStatus(FleetStore store, RuntimeEnvironment environment)
    {
        CheckState? check = store.ReadCheckState(environment);
        try
        {
            using FleetIndex? index = FleetIndex.OpenReadOnly(store.IndexPath(environment));
            if (index is null)
            {
                return new EnvironmentStatus.NotSynced(environment, check);
            }

            return new EnvironmentStatus.Synced(
                environment,
                check,
                index.Count("apps"),
                index.Count("orgs"),
                index.Count("failures"),
                index.ReadSchemaVersion(),
                FleetIndex.ParseTime(index.ReadMeta("last_content_change"))
            );
        }
        catch (SqliteException ex)
        {
            throw new FleetException($"Cannot read {store.IndexPath(environment)}: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// Opens an environment's index for queries, with every environment the store has attached under its name, so
    /// that a query can join <c>prod.apps</c> with <c>tt02.apps</c>. Unqualified tables are the environment's own.
    /// </summary>
    /// <remarks>
    /// Attached indexes open read-only as the environment's own does, so this works on a read-only copy and creates
    /// no file.
    /// </remarks>
    /// <exception cref="FleetException">The environment has no index.</exception>
    public static SqliteConnection OpenForQueries(FleetStore store, RuntimeEnvironment environment)
    {
        string path = store.IndexPath(environment);
        FleetIndex index =
            FleetIndex.OpenReadOnly(path)
            ?? throw new FleetException(
                $"There is no index at {path}. Run `fleet sync --env {environment.Name}` first."
            );
        SqliteConnection connection = index.Connection;
        try
        {
            foreach (RuntimeEnvironment attached in ListEnvironments(store))
            {
                using SqliteCommand attach = connection.CreateCommand();
                attach.CommandText = $"ATTACH DATABASE $path AS \"{attached.Name}\"";
                attach.Parameters.AddWithValue("$path", store.IndexPath(attached));
                attach.ExecuteNonQuery();
            }
        }
        catch
        {
            connection.Dispose();
            throw;
        }

        return connection;
    }

    /// <summary>The environments in the store that have an index.</summary>
    public static IReadOnlyList<RuntimeEnvironment> ListEnvironments(FleetStore store)
    {
        var environments = new List<RuntimeEnvironment>();
        if (!Directory.Exists(store.Root))
        {
            return environments;
        }

        foreach (string folder in Directory.EnumerateDirectories(store.Root))
        {
            string name = Path.GetFileName(folder);
            if (
                RuntimeEnvironment.TryParse(name, out RuntimeEnvironment environment)
                && environment.Name == name
                && File.Exists(store.IndexPath(environment))
            )
            {
                environments.Add(environment);
            }
        }

        environments.Sort((x, y) => string.CompareOrdinal(x.Name, y.Name));
        return environments;
    }
}
