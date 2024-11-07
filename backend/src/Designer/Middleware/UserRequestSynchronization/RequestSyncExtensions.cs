using Altinn.Studio.Designer.Configuration.Extensions;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization;

public static class RequestSyncExtensions
{
    public static IServiceCollection RegisterSynchronizationServices(this IServiceCollection services)
    {
        services.AddTransient<IRequestSyncResolver, RequestSyncResolver>();
        services.AddTransient<IEditingContextResolver, EditingContextResolver>();
        services.RegisterTransientServicesByBaseType<IRequestSyncEvaluator>();
        return services;
    }

}
