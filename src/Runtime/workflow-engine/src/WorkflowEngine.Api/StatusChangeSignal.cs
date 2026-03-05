using Npgsql;

namespace WorkflowEngine.Api;

/// <summary>
/// Listens for PostgreSQL NOTIFY events on the <c>status_changed</c> channel and signals
/// dashboard SSE endpoints to wake up. Replaces the in-memory signal so that status changes
/// from any engine instance are propagated to all connected dashboards.
/// </summary>
internal sealed class StatusChangeSignal(NpgsqlDataSource dataSource, ILogger<StatusChangeSignal> logger)
    : BackgroundService
{
    private readonly AsyncSignal _inner = new();

    /// <inheritdoc cref="AsyncSignal.WaitAsync"/>
    public Task WaitAsync(CancellationToken ct) => _inner.WaitAsync(ct);

    /// <inheritdoc cref="AsyncSignal.Reset"/>
    public void Reset() => _inner.Reset();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using NpgsqlConnection conn = await dataSource.OpenConnectionAsync(stoppingToken);
                await using (var cmd = new NpgsqlCommand("LISTEN status_changed", conn))
                    await cmd.ExecuteNonQueryAsync(stoppingToken);

                logger.LogInformation("PG LISTEN status_changed connected");

                while (!stoppingToken.IsCancellationRequested)
                {
                    await conn.WaitAsync(stoppingToken);
                    _inner.Signal();
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "PG LISTEN connection lost, reconnecting in 1s");
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
}
