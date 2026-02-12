using OpenTelemetry.Trace;
using WorkflowEngine.Data.Services;

namespace WorkflowEngine.Api.Extensions;

internal static class HostExtensions
{
    /// <summary>
    /// Applies any pending database migrations with distributed locking.
    /// Should be called before the application starts handling requests.
    /// </summary>
    public static async Task ApplyDatabaseMigrations(
        this IHost host,
        string dbConnectionString,
        CancellationToken cancellationToken = default
    )
    {
        // Force-initialize the TracerProvider singleton so its ActivityListener is registered.
        // Without this, StartActivity returns null because the host hasn't started yet.
        _ = host.Services.GetService<TracerProvider>();

        using var activity = Telemetry.Source.StartActivity("Engine.ApplyDatabaseMigrations");

        using var scope = host.Services.CreateScope();
        var migrationService = scope.ServiceProvider.GetRequiredService<DbMigrationService>();
        await migrationService.MigrateAsync(dbConnectionString, cancellationToken);
    }
}
