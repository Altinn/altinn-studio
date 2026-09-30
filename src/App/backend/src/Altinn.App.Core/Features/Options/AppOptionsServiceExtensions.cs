using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Features.Options;

/// <summary>
/// Extension methods for <see cref="IServiceCollection"/> for adding app options providers
/// </summary>
public static class AppOptionsServiceExtensions
{
    /// <summary>
    /// Join multiple option lists into one. The joined list concatenates the options of the sub lists in the given
    /// order, and reports each sub list's parameters prefixed with the sub list id. A sub list can come from any
    /// source, including another joined list.
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <param name="id">The id the joined list is looked up by</param>
    /// <param name="subLists">The ids of the lists to join</param>
    public static void AddJoinedAppOptions(this IServiceCollection services, string id, params string[] subLists)
    {
        services.AddSingleton(new JoinedAppOptionsDefinition(id, subLists));
    }
}
