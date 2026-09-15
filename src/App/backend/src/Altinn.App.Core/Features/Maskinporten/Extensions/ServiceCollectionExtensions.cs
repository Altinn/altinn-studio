using Altinn.App.Core.Features.Maskinporten.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Maskinporten.Extensions;

internal static class ServiceCollectionExtensions
{
    /// <summary>
    /// <para>Adds the app's <see cref="IMaskinportenClient"/> to the service collection, bound to the one
    /// Maskinporten identity the app has: the client Studio provisions for it.</para>
    /// <para>There is deliberately no way to configure those credentials — see
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
        // The one line that decides where the credentials come from. TryAdd so a test can put its own
        // source in first; nothing an app configures reaches this.
        services.TryAddSingleton(_ => new MaskinportenSettingsSource(MaskinportenSettingsSource.DefaultFilePath));
        services.AddOptions<MaskinportenSettings>().ValidateDataAnnotations();
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
