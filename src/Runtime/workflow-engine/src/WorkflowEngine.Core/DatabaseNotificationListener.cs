using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Repository;

namespace WorkflowEngine.Core;

/// <summary>
/// Holds this replica's one <c>LISTEN</c> connection and hands each notification to its consumer:
/// <c>status_changed</c> to the dashboard's <see cref="StatusChangeSignal"/>, <c>collection_changed</c> to the
/// <see cref="CollectionEventHub"/>. PostgreSQL is what carries a change from the replica that wrote it to every
/// other replica.
/// </summary>
internal sealed class DatabaseNotificationListener(
    NpgsqlDataSource dataSource,
    StatusChangeSignal statusChanges,
    CollectionEventHub collectionEvents,
    ILogger<DatabaseNotificationListener> logger
) : BackgroundService
{
    private const string ListenSql =
        $"LISTEN {EngineRepository.StatusChangedChannel}; LISTEN {CollectionChangedNotification.Channel}";

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using NpgsqlConnection conn = await dataSource.OpenConnectionAsync(stoppingToken);
                conn.Notification += OnNotification;

                await using (var cmd = new NpgsqlCommand(ListenSql, conn))
                    await cmd.ExecuteNonQueryAsync(stoppingToken);

                logger.ListenConnected();

                // Notifications sent while no connection listened are lost, so whatever they announced is read again
                collectionEvents.MarkAllDirty();

                while (!stoppingToken.IsCancellationRequested)
                {
                    await conn.WaitAsync(stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.ListenConnectionLost(ex);
                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }
    }

    private void OnNotification(object sender, NpgsqlNotificationEventArgs e)
    {
        switch (e.Channel)
        {
            case EngineRepository.StatusChangedChannel:
                statusChanges.Signal();
                break;
            case CollectionChangedNotification.Channel:
                if (CollectionChangedNotification.TryDecode(e.Payload, out var collection))
                    collectionEvents.MarkDirty(collection);
                else
                    logger.UnreadableCollectionNotification(e.Payload);
                break;
        }
    }
}

internal static partial class DatabaseNotificationListenerLogs
{
    [LoggerMessage(LogLevel.Information, "PG LISTEN status_changed, collection_changed connected")]
    internal static partial void ListenConnected(this ILogger<DatabaseNotificationListener> logger);

    [LoggerMessage(LogLevel.Warning, "PG LISTEN connection lost, reconnecting in 1s")]
    internal static partial void ListenConnectionLost(this ILogger<DatabaseNotificationListener> logger, Exception ex);

    [LoggerMessage(LogLevel.Warning, "Ignored a collection_changed notification with an unreadable payload: {Payload}")]
    internal static partial void UnreadableCollectionNotification(
        this ILogger<DatabaseNotificationListener> logger,
        string payload
    );
}
