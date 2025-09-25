using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Configuration.Extensions;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.OrgWide;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.OrgWide.Services;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.RepoUserWide;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.RepoUserWide.Services;
using Altinn.Studio.Designer.Models;
using Medallion.Threading;
using Medallion.Threading.Postgres;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization;

public static class DependencyInjectionRequestSyncExtensions
{
    /// <summary>
    /// Registers all services needed for request synchronization.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection"/> to add the service to.</param>
    /// <param name="configuration">An <see cref="IConfiguration"/> holding the configuration of the project.</param>
    /// <returns>A reference to this instance after the operation has completed.</returns>
    public static IServiceCollection RegisterSynchronizationServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.RegisterRepoUserWideSyncServices();
        services.AddSingleton<IDistributedLockProvider>(_ =>
        {
            PostgreSQLSettings postgresSettings = configuration.GetSection(nameof(PostgreSQLSettings)).Get<PostgreSQLSettings>();
            return new PostgresDistributedSynchronizationProvider(postgresSettings.FormattedConnectionString());
        });
        return services;
    }

    private static IServiceCollection RegisterRepoUserWideSyncServices(this IServiceCollection services)
    {
        services.AddSingleton<IRequestSyncEvaluator<AltinnRepoEditingContext>, RepoUserWideRequestSyncEvaluator>();
        services.AddSingleton<IRequestContextResolver<AltinnRepoEditingContext>, RepoUserWideRequestContextResolver>();
        services.RegisterSingletonServicesByBaseType<IRepoUserSyncEligibilityEvaluator>();
        return services;
    }

    private static IServiceCollection RegisterOrgWideSyncServices(this IServiceCollection services)
    {
        services.AddSingleton<IRequestSyncEvaluator<AltinnOrgContext>, OrgWideRequestSyncEvaluator>();
        services.AddSingleton<IRequestContextResolver<AltinnOrgContext>, OrgWideRequestContextResolver>();
        services.RegisterSingletonServicesByBaseType<IOrgWideSyncEligibilityEvaluator>();
        return services;
    }

}
