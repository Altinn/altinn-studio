using Altinn.ApiClients.Maskinporten.Config;
using Altinn.ApiClients.Maskinporten.Interfaces;
using Altinn.App.Core.Internal.Secrets;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.Maskinporten;

/// <summary>
/// Extends the IServiceCollection with methods for adding Maskinporten related services.
/// </summary>
public static class MaskinportenExtensions
{
    /// <summary>
    /// Adds the default token provider for Maskinporten using Jwk as the authentication method.
    /// The Jwk is fetched from the secret store using the provided secretKeyName.
    /// When using this locally the secret should be fetched from the local secret store using dotnet user-secrets.
    /// </summary>
    [Obsolete(
        "Use Altinn.App.Api.ServiceCollectionExtensions.ConfigureMaskinportenClient instead. This method will be removed in V9."
    )]
    public static IServiceCollection AddMaskinportenJwkTokenProvider(
        this IServiceCollection services,
        string secretKeyName
    )
    {
        services.AddTransient<IMaskinportenTokenProvider>(sp => new MaskinportenJwkTokenProvider(
            sp.GetRequiredService<IMaskinportenService>(),
            sp.GetRequiredService<IOptions<MaskinportenSettings>>(),
            sp.GetRequiredService<ISecretsClient>(),
            secretKeyName
        ));

        return services;
    }
}
