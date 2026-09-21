using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Internal.ProvisionedSecrets;
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
    /// <see cref="ProvisionedSecrets"/> for why.</para>
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
    /// <para>Binds <see cref="MaskinportenSettings"/> to the provisioned credentials — the first tenant of the
    /// channel the platform provisions secrets through.</para>
    /// <para>The credentials are validated whenever they are read, and <see cref="MaskinportenSettingsStartupCheck"/>
    /// reads them once at host startup: a deployed app with none does not start, while a local run does and
    /// fails its first token request instead. Rotating credentials that are there reaches a running app
    /// without a restart, and so does storing them for the first time on a local run.</para>
    /// </summary>
    /// <param name="services">The service collection</param>
    public static IServiceCollection AddMaskinportenSettings(this IServiceCollection services)
    {
        services.BindProvisionedSecret<MaskinportenSettings>(ProvisionedSecretFiles.Maskinporten);
        services.AddOptions<MaskinportenSettings>().ValidateDataAnnotations();
        services.TryAddEnumerable(
            ServiceDescriptor.Singleton<
                IValidateOptions<MaskinportenSettings>,
                ValidateMaskinportenSettingsProvisioned
            >()
        );
        services.TryAddEnumerable(ServiceDescriptor.Singleton<IHostedService, MaskinportenSettingsStartupCheck>());

        return services;
    }
}
