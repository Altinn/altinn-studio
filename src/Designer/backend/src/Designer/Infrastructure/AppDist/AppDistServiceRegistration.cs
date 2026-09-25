using System;
using System.Net.Http;
using Altinn.Studio.AppDist;
using Altinn.Studio.Designer.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Infrastructure.AppDist;

public static class AppDistServiceRegistration
{
    /// <summary>
    /// Registers the app distribution provider: the registry-backed <see cref="AppDistProvider"/> with a file
    /// system cache, wrapped in <see cref="CachedAppDistProvider"/> to bound registry traffic.
    /// </summary>
    public static IServiceCollection AddAppDist(this IServiceCollection services)
    {
        services.AddHttpClient(nameof(OciRegistrySource));
        services.AddSingleton(serviceProvider =>
        {
            AppDistSettings appDistSettings = serviceProvider.GetRequiredService<IOptions<AppDistSettings>>().Value;
            ServiceRepositorySettings repositorySettings = serviceProvider
                .GetRequiredService<IOptions<ServiceRepositorySettings>>()
                .Value;
            HttpClient httpClient = serviceProvider
                .GetRequiredService<IHttpClientFactory>()
                .CreateClient(nameof(OciRegistrySource));
            return new AppDistProvider(
                new OciRegistrySource(httpClient, appDistSettings.Repository),
                new FileSystemAppDistStore(appDistSettings.ResolveCacheDirectory(repositorySettings.RepositoryLocation))
            );
        });
        services.AddSingleton<IAppDistProvider>(serviceProvider => new CachedAppDistProvider(
            serviceProvider.GetRequiredService<AppDistProvider>(),
            serviceProvider.GetRequiredService<IOptionsMonitor<AppDistSettings>>(),
            serviceProvider.GetRequiredService<TimeProvider>()
        ));
        services.AddAppDistRateLimiting();

        return services;
    }
}
