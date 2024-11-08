using Altinn.Studio.Designer.Configuration.Extensions;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization;

public static class RequestSyncExtensions
{
    /// <summary>
    /// Registers all services needed for request synchronization.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection"/> to add the service to.</param>
    /// <returns>A reference to this instance after the operation has completed.</returns>
    public static IServiceCollection RegisterSynchronizationServices(this IServiceCollection services)
    {
        services.AddSingleton<IRequestSyncResolver, RequestSyncResolver>();
        services.AddSingleton<IEditingContextResolver, EditingContextResolver>();
        services.RegisterSingletonServicesByBaseType<IRequestSyncEvaluator>();
        return services;
    }

}
