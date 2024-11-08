using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Configuration.Extensions;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Services;
using Medallion.Threading;
using Medallion.Threading.Postgres;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization;

public static class RequestSyncExtensions
{
    /// <summary>
    /// Registers all services needed for request synchronization.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection"/> to add the service to.</param>
    /// <param name="configuration">An <see cref="IConfiguration"/> holding the configuration of the project.</param>
    /// <returns>A reference to this instance after the operation has completed.</returns>
    public static IServiceCollection RegisterSynchronizationServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSingleton<IRequestSyncResolver, RequestSyncResolver>();
        services.AddSingleton<IEditingContextResolver, EditingContextResolver>();
        services.RegisterSingletonServicesByBaseType<IRequestSyncEvaluator>();
        services.AddSingleton<IDistributedLockProvider>(_ =>
        {
            PostgreSQLSettings postgresSettings = configuration.GetSection(nameof(PostgreSQLSettings)).Get<PostgreSQLSettings>();
            string connectionString = string.Format(
                postgresSettings.ConnectionString,
                postgresSettings.DesignerDbPwd);
            return new PostgresDistributedSynchronizationProvider(connectionString);
        });
        return services;
    }

}
