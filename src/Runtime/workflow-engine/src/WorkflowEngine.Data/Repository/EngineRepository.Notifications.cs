using Npgsql;

namespace WorkflowEngine.Data.Repository;

internal sealed partial class EngineRepository
{
    internal const string StatusChangedChannel = "status_changed";

    /// <summary>
    /// Queues, in one statement inside <paramref name="tx"/>, the notifications a write sends: <c>status_changed</c>
    /// for the dashboards, and a <see cref="CollectionChangedNotification"/> for each collection in
    /// <paramref name="collections"/>, skipping the <see langword="null"/>s of workflows outside any collection.
    /// </summary>
    /// <remarks>
    /// PostgreSQL sends them when the transaction commits, one per distinct payload, and none when it rolls back. A
    /// statement after the commit could fail on its own and make <see cref="ExecuteWithRetry"/> re-run a write that
    /// already committed.
    /// </remarks>
    internal static async Task NotifyChanged(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        IEnumerable<CollectionId?> collections,
        CancellationToken cancellationToken
    )
    {
        const string sql = $"""
            SELECT pg_notify('{StatusChangedChannel}', '')
            UNION ALL
            SELECT pg_notify('{CollectionChangedNotification.Channel}', p) FROM unnest(@payloads) AS p
            """;

        await using var cmd = new NpgsqlCommand(sql, conn, tx);
        cmd.Parameters.Add(
            new NpgsqlParameter<string[]>(
                "payloads",
                [.. collections.OfType<CollectionId>().Select(CollectionChangedNotification.Encode)]
            )
        );
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    /// <summary>
    /// Reads a workflow's collection from a <c>namespace, collection_key</c> column pair starting at
    /// <paramref name="namespaceOrdinal"/>; <see langword="null"/> when the workflow has no collection.
    /// </summary>
    internal static async Task<CollectionId?> ReadCollectionId(
        NpgsqlDataReader reader,
        int namespaceOrdinal,
        CancellationToken cancellationToken
    ) =>
        await reader.IsDBNullAsync(namespaceOrdinal + 1, cancellationToken)
            ? null
            : new CollectionId(reader.GetString(namespaceOrdinal), reader.GetString(namespaceOrdinal + 1));
}
