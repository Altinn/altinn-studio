using Altinn.App.Core.Extensions;
using Altinn.App.Core.Internal.App;
using Azure.Identity;

namespace Altinn.App.Api.Extensions;

/// <summary>
/// Class for defining extensions to IHostBuilder for AltinnApps
/// </summary>
public static class HostBuilderExtensions
{
    /// <summary>
    /// Add KeyVault as a configuration provider. Requires that the kvSetting section is present in the configuration
    /// and throws an exception if not. See documentation for secret handling in Altinn apps.
    /// </summary>
    /// <remarks>Use </remarks>
    /// <param name="builder"></param>
    /// <exception cref="ApplicationConfigException"></exception>
    public static void AddAzureKeyVaultAsConfigProvider(this IHostApplicationBuilder builder)
    {
        builder.Configuration.AddAppSettingsSecretFile();

        IConfigurationSection section = builder.Configuration.GetSection("kvSetting");
        var keyVaultUri = section.GetValue<string>("SecretUri");
        var clientId = section.GetValue<string>("ClientId");
        var clientSecret = section.GetValue<string>("ClientSecret");
        var tenantId = section.GetValue<string>("TenantId");

        if (
            string.IsNullOrWhiteSpace(keyVaultUri)
            || string.IsNullOrWhiteSpace(clientId)
            || string.IsNullOrWhiteSpace(clientSecret)
            || string.IsNullOrWhiteSpace(tenantId)
        )
        {
            throw new ApplicationConfigException(
                "Attempted to add KeyVault as a configuration provider, but the required settings for authenticating with KeyVault are missing. Please check the configuration."
            );
        }

        builder.Configuration.AddAzureKeyVault(
            new Uri(keyVaultUri),
            new ClientSecretCredential(tenantId, clientId, clientSecret)
        );
    }
}
