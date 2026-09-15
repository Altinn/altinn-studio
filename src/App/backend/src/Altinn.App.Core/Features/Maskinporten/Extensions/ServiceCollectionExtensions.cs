using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Internal;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Maskinporten.Extensions;

internal static class ServiceCollectionExtensions
{
    /// <summary>
    /// <para>Adds the app's <see cref="IMaskinportenClient"/> to the service collection, bound to the one
    /// Maskinporten identity the app has: the client Studio provisions for it, or the one studioctl provisions
    /// for a local run.</para>
    /// <para>There is deliberately no way for the app to configure those credentials — see
    /// <see cref="MaskinportenSettingsSource"/> for why.</para>
    /// </summary>
    /// <param name="services">The service collection</param>
    public static IServiceCollection AddMaskinportenClient(this IServiceCollection services)
    {
        services.AddMaskinportenSettings();
        services.TryAddSingleton<IMaskinportenClient>(sp => ActivatorUtilities.CreateInstance<MaskinportenClient>(sp));

        // TryAddEnumerable makes repeated registration safe; a container without a host never runs it.
        services.TryAddEnumerable(ServiceDescriptor.Singleton<IHostedService, MaskinportenWellKnownRefreshService>());

        return services;
    }

    /// <summary>
    /// Binds <see cref="MaskinportenSettings"/> to the provisioned credentials. Registered by hand rather
    /// than through <c>OptionsBuilder.Bind</c> so that the private configuration root holding them is
    /// created — and disposed — by the container.
    /// </summary>
    /// <param name="services">The service collection</param>
    public static IServiceCollection AddMaskinportenSettings(this IServiceCollection services)
    {
        // TryAdd so a test can put its own source in first. Where the file lives is the source's decision.
        services.TryAddSingleton(sp =>
            MaskinportenSettingsSource.ForPlatform(
                sp.GetRequiredService<RuntimeEnvironment>(),
                sp.GetRequiredService<IConfiguration>()
            )
        );
        services.AddOptions<MaskinportenSettings>().ValidateDataAnnotations();
        services.TryAddEnumerable(
            ServiceDescriptor.Singleton<
                IValidateOptions<MaskinportenSettings>,
                ValidateMaskinportenSettingsProvisioned
            >()
        );
        services.TryAddEnumerable(
            ServiceDescriptor.Singleton<IConfigureOptions<MaskinportenSettings>, ConfigureMaskinportenSettings>()
        );
        services.TryAddEnumerable(
            ServiceDescriptor.Singleton<
                IOptionsChangeTokenSource<MaskinportenSettings>,
                ConfigureMaskinportenSettings
            >()
        );

        return services;
    }
}
