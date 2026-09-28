using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Features.Options;

/// <summary>
/// Extension methods for <see cref="IServiceCollection"/> for adding app options providers
/// </summary>
public static class AppOptionsServiceExtensions
{
    /// <summary>
    /// Join multiple app options providers into one
    /// </summary>
    public static void AddJoinedAppOptions(this IServiceCollection services, string id, params string[] subLists)
    {
        // The providers are resolved when the options are requested, not when the service is constructed, so
        // there is no cycle in resolving the service that resolves this provider.
        services.AddTransient<IAppOptionsProvider>(sp => new JoinedAppOptionsProvider(
            id,
            subLists,
            sp.GetRequiredService<IAppOptionsService>()
        ));
    }
}
