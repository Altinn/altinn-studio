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
        public async Task ResetDatabaseConnectionsInDev(
            string dbConnectionString,
            CancellationToken cancellationToken = default
        )
        {
            var env = host.Services.GetRequiredService<IHostEnvironment>();
            if (!env.IsDevelopment())
                return;

            host.ForceInitializeTracerProvider();
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
            host.ForceInitializeTracerProvider();
            using var activity = Metrics.Source.StartActivity("Engine.ApplyDatabaseMigrations");

            using var scope = host.Services.CreateScope();
            var migrationService = scope.ServiceProvider.GetRequiredService<DbMigrationService>();
            await migrationService.Migrate(dbConnectionString, cancellationToken);
        }

        private void ForceInitializeTracerProvider()
        {
            _ = host.Services.GetService<TracerProvider>();
        }
    }
}
