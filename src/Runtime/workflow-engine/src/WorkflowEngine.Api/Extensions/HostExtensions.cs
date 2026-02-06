using WorkflowEngine.Data.Services;

namespace WorkflowEngine.Api.Extensions;

public static class HostExtensions
{
    /// <summary>
    /// Applies any pending database migrations with distributed locking.
    /// Should be called before the application starts handling requests.
    /// </summary>
    public static async Task MigrateDatabaseAsync(
        this IHost host,
        string dbConnectionString,
        CancellationToken cancellationToken = default
    )
    {
        using var scope = host.Services.CreateScope();
        var migrationService = scope.ServiceProvider.GetRequiredService<DbMigrationService>();
        await migrationService.MigrateAsync(dbConnectionString, cancellationToken);
    }
}
