using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Internal.Maskinporten;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Altinn.App.Core.Features.Maskinporten.Extensions;

internal static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds a singleton <see cref="IMaskinportenClient"/> service to the service collection.
    /// If no <see cref="MaskinportenSettings"/> configuration is found, it binds one to the path "MaskinportenSettings".
    /// </summary>
    /// <param name="services">The service collection</param>
    public static IServiceCollection AddMaskinportenClient(this IServiceCollection services)
    {
        // Only add MaskinportenSettings if not already configured.
        // Users sometimes wish to bind the default options to another configuration path than "MaskinportenSettings".
        if (services.IsConfigured<MaskinportenSettings>() is false)
        {
            services.ConfigureMaskinportenClient("MaskinportenSettings");
        }

        services.TryAddSingleton<IMaskinportenClient>(sp =>
            ActivatorUtilities.CreateInstance<MaskinportenClient>(sp, MaskinportenClient.VariantDefault)
        );

        services.ConfigureMaskinportenClient("MaskinportenSettingsInternal", MaskinportenClient.VariantInternal);
        services.AddKeyedSingleton<IMaskinportenClient>(
            MaskinportenClient.VariantInternal,
            (sp, key) => ActivatorUtilities.CreateInstance<MaskinportenClient>(sp, MaskinportenClient.VariantInternal)
        );

#pragma warning disable CS0618 // Type or member is obsolete
        services.TryAddTransient<IMaskinportenTokenProvider, LegacyMaskinportenTokenProvider>();
#pragma warning restore CS0618 // Type or member is obsolete

        return services;
    }

    /// <summary>
    /// Binds a <see cref="MaskinportenClient"/> configuration to the supplied config section path and options name.
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <param name="configSectionPath">The configuration section path, e.g. "MaskinportenSettingsInternal"</param>
    /// <param name="optionsName">The options name to bind to, e.g. <see cref="MaskinportenClient.VariantInternal"/></param>
    public static IServiceCollection ConfigureMaskinportenClient(
        this IServiceCollection services,
        string configSectionPath,
        string? optionsName = default
    )
    {
        services
            .AddOptions<MaskinportenSettings>(optionsName ?? Microsoft.Extensions.Options.Options.DefaultName)
            .BindConfiguration(configSectionPath)
            .ValidateDataAnnotations();
        return services;
    }
}
