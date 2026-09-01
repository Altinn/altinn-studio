using System.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using OpenTelemetry.Trace;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Core.Extensions;

internal static class HostExtensions
{
    /// <summary>
    /// Namespace and collection key the startup warm-up reads from. Reserved by convention: no
    /// caller enqueues here, so the reads miss and touch no real workflow. Correctness does not
    /// depend on that - the reads are read-only whatever they find.
    /// </summary>
    private const string WarmUpNamespace = "__engine_warmup__";

    private const string WarmUpCollectionKey = "__engine_warmup__";

    extension(IHost host)
    {
        /// <summary>
        /// Terminates all existing connections to the database.
        /// Only intended for development use, to clear stale connections from ungraceful shutdowns.
        /// </summary>
        internal async Task ResetDatabaseConnectionsInDev(CancellationToken cancellationToken = default)
        {
            var env = host.Services.GetRequiredService<IHostEnvironment>();
            if (!env.IsDevelopment())
                return;

            host.ForceInitializeTracerProvider();
            using var activity = Metrics.Source.StartActivity("Engine.ResetDatabaseConnections");

            var connectionString = host.Services.GetRequiredService<EngineConnectionString>().Value;
            using var scope = host.Services.CreateScope();
            var resetService = scope.ServiceProvider.GetRequiredService<DbConnectionResetService>();
            await resetService.ResetConnections(connectionString, cancellationToken);
        }

        /// <summary>
        /// Applies any pending database migrations with distributed locking.
        /// Should be called before the application starts handling requests.
        /// </summary>
        internal async Task ApplyDatabaseMigrations(CancellationToken cancellationToken = default)
        {
            host.ForceInitializeTracerProvider();
            using var activity = Metrics.Source.StartActivity("Engine.ApplyDatabaseMigrations");

            using var scope = host.Services.CreateScope();
            var migrationService = scope.ServiceProvider.GetRequiredService<DbMigrationService>();
            await migrationService.Migrate(cancellationToken);
        }

        /// <summary>
        /// Runs each of the engine's database read paths once so that the query plans, the EF model
        /// bindings and the JIT work they trigger are paid for here instead of by the first request.
        /// Called before Kestrel binds, so nothing can route to the engine until it is warm.
        /// <para>
        /// Every call is read-only: <see cref="IEngineRepository.FetchAndLockWorkflows"/> is asked
        /// for zero rows, and the rest look up a namespace no workflow can be enqueued into. A
        /// warm-up failure is logged and swallowed - a cold engine still works, so this must never
        /// be the reason a host refuses to start.
        /// </para>
        /// </summary>
        internal async Task WarmUpEngine(CancellationToken cancellationToken = default)
        {
            host.ForceInitializeTracerProvider();
            using var activity = Metrics.Source.StartActivity("Engine.WarmUp");

            using var scope = host.Services.CreateScope();
            var logger = scope
                .ServiceProvider.GetRequiredService<ILoggerFactory>()
                .CreateLogger("WorkflowEngine.WarmUp");
            var repo = scope.ServiceProvider.GetRequiredService<IEngineRepository>();

            var started = Stopwatch.GetTimestamp();
            try
            {
                // The processor's claim query, which the first transition's first step waits on.
                // LIMIT 0 compiles the statement and opens the pool without claiming a workflow or
                // stamping a lease.
                await repo.FetchAndLockWorkflows(0, cancellationToken);

                // The read paths a transition exercises: the workflow-with-steps include graph, the
                // collection read the app's ProcessNext wait polls, the list endpoint, and the
                // status rollup the metrics collector uses.
                await repo.GetWorkflow(Guid.Empty, WarmUpNamespace, cancellationToken);
                await repo.GetCollection(WarmUpCollectionKey, WarmUpNamespace, cancellationToken);
                await repo.QueryWorkflows(
                    pageSize: 1,
                    statuses: PersistentItemStatusMap.Finished,
                    namespaceFilter: WarmUpNamespace,
                    cancellationToken: cancellationToken
                );
                await repo.CountWorkflowsByStatus(cancellationToken);

                logger.WarmUpCompleted(Stopwatch.GetElapsedTime(started).TotalMilliseconds);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                activity?.Errored(ex);
                logger.WarmUpFailed(ex);
            }
        }

        private void ForceInitializeTracerProvider()
        {
            _ = host.Services.GetService<TracerProvider>();
        }
    }
}

internal static partial class HostWarmUpLogs
{
    [LoggerMessage(LogLevel.Information, "Engine warm-up completed in {ElapsedMs:F0}ms")]
    internal static partial void WarmUpCompleted(this ILogger logger, double elapsedMs);

    [LoggerMessage(LogLevel.Warning, "Engine warm-up failed; the first request will pay the cold cost")]
    internal static partial void WarmUpFailed(this ILogger logger, Exception exception);
}
