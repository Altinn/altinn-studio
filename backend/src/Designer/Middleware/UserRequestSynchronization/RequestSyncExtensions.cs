using Altinn.Studio.Designer.Configuration.Extensions;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization;

public static class RequestSyncExtensions
{
    public static IServiceCollection RegisterSynchronizationServices(this IServiceCollection services)
    {
        services.AddSingleton<IRequestSyncResolver, RequestSyncResolver>();
        services.AddSingleton<IEditingContextResolver, EditingContextResolver>();
        services.RegisterSingletonServicesByBaseType<IRequestSyncEvaluator>();
        return services;
    }

}
