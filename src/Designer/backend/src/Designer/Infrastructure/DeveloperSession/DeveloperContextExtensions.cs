using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.Infrastructure.DeveloperSession;

public static class DeveloperContextExtensions
{
    public static IServiceCollection AddDeveloperContextAccessor(this IServiceCollection services)
    {
        services.AddSingleton<IDeveloperContextProvider, DeveloperContextProvider>();
        return services;
    }
}
