using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Features.Correspondence.Extensions;

internal static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds a <see cref="ICorrespondenceClient"/> service to the service collection.
    /// </summary>
    /// <param name="services">The service collection</param>
    public static IServiceCollection AddCorrespondenceClient(this IServiceCollection services)
    {
        services.AddSingleton<ICorrespondenceClient, CorrespondenceClient>();
        return services;
    }
}
