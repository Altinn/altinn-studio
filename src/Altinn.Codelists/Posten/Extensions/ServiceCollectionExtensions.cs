using Altinn.App.Core.Features;
using Altinn.Codelists.Posten.Clients;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Altinn.Codelists.Posten;

/// <summary>
/// Extends the <see cref="IServiceCollection"/>.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers the services required to get postal codes through <see cref="IAppOptionsProvider" /> and <see cref="IPostalCodesClient"/>
    /// </summary>
    public static IServiceCollection AddPosten(this IServiceCollection services)
    {
        services.AddPostenClient();
        services.AddTransient<IAppOptionsProvider, PostalCodesCodelistsProvider>();

        return services;
    }

    /// <summary>
    /// Registers <see cref="IPostalCodesClient"/>
    /// </summary>
    /// <returns></returns>
    public static IServiceCollection AddPostenClient(this IServiceCollection services)
    {
        services.AddHttpClient();
        services.AddOptions<PostenSettings>();
        services.TryAddTransient<IPostalCodesClient, PostalCodesHttpClient>();

        return services;
    }
}
