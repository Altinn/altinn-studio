using OpenTelemetry.Trace;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Api.Extensions;

internal static class HostExtensions
{
    extension(IHost host)
    {
        /// <summary>
        /// Terminates all existing connections to the database.
        /// Only intended for development use, to clear stale connections from ungraceful shutdowns.
        /// </summary>
        public async Task ResetDatabaseConnections(
            string dbConnectionString,
            CancellationToken cancellationToken = default
        )
        {
            _ = host.Services.GetService<TracerProvider>();

            using var activity = Metrics.Source.StartActivity("Engine.ResetDatabaseConnections");

            using var scope = host.Services.CreateScope();
            var resetService = scope.ServiceProvider.GetRequiredService<DbConnectionResetService>();
            await resetService.ResetConnections(dbConnectionString, cancellationToken);
        }

        /// <summary>
        /// Applies any pending database migrations with distributed locking.
        /// Should be called before the application starts handling requests.
        /// </summary>
        public async Task ApplyDatabaseMigrations(
            string dbConnectionString,
            CancellationToken cancellationToken = default
        )
        {
            // Force-initialize the TracerProvider singleton so its ActivityListener is registered.
            // Without this, StartActivity returns null because the host hasn't started yet.
            _ = host.Services.GetService<TracerProvider>();

            using var activity = Metrics.Source.StartActivity("Engine.ApplyDatabaseMigrations");

            using var scope = host.Services.CreateScope();
            var migrationService = scope.ServiceProvider.GetRequiredService<DbMigrationService>();
            await migrationService.Migrate(dbConnectionString, cancellationToken);
        }
    }
}
