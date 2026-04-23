#nullable enable

using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.EnvTopology;

public static class BoundTopologyConfigurationExtensions
{
    public static IServiceCollection AddBoundTopology(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        services.Configure<BoundTopologyOptions>(configuration.GetSection(BoundTopologyOptions.SectionName));
        services.AddSingleton(sp => sp.GetRequiredService<IOptions<BoundTopologyOptions>>().Value);
        services.Configure<BoundTopologyConfig>(
            BoundTopologyOptions.BaseName,
            BoundTopologyConfiguration(configuration[BoundTopologyOptions.BasePathConfigurationKey])
        );
        services.Configure<BoundTopologyConfig>(
            BoundTopologyOptions.MergedName,
            BoundTopologyConfiguration(configuration[BoundTopologyOptions.MergedPathConfigurationKey])
        );
        services.AddSingleton<BoundTopologyIndexAccessor>();
        return services;
    }

    private static IConfiguration BoundTopologyConfiguration(string? path)
    {
        var builder = new ConfigurationBuilder();
        if (!string.IsNullOrWhiteSpace(path))
        {
            builder.AddJsonFile(path, optional: false, reloadOnChange: true);
        }
        return builder.Build();
    }
}
