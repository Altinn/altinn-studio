using Azure.Extensions.AspNetCore.Configuration.Secrets;
using Azure.Identity;

namespace Altinn.Augmenter.Agent.Configuration;

/// <summary>
/// Adds Azure Key Vault as a configuration source when the platform-mounted
/// <c>altinn-appsettings-secret.json</c> includes a <c>kvSetting</c> block
/// with Service Principal credentials. Mirrors Altinn Apps'
/// <c>AddAzureKeyVaultAsConfigProvider</c> but is silently optional — the
/// image stays runnable in local dev and on non-Altinn platforms where
/// <c>kvSetting</c> is not provided.
/// </summary>
public static class KeyVaultConfigurationExtensions
{
    public const string SectionName = "kvSetting";

    public static WebApplicationBuilder AddOptionalAzureKeyVault(this WebApplicationBuilder builder)
    {
        var section = builder.Configuration.GetSection(SectionName);
        var secretUri = section["SecretUri"];
        var clientId = section["ClientId"];
        var clientSecret = section["ClientSecret"];
        var tenantId = section["TenantId"];

        var anyMissing =
            string.IsNullOrWhiteSpace(secretUri) ||
            string.IsNullOrWhiteSpace(clientId) ||
            string.IsNullOrWhiteSpace(clientSecret) ||
            string.IsNullOrWhiteSpace(tenantId);

        var logger = LoggerFactory
            .Create(b => b.AddConsole())
            .CreateLogger(typeof(KeyVaultConfigurationExtensions).FullName!);

        if (anyMissing)
        {
            logger.LogInformation(
                "kvSetting not fully configured (SecretUri/ClientId/ClientSecret/TenantId) — " +
                "Key Vault config provider not registered. Falling back to env / file sources.");
            return builder;
        }

        builder.Configuration.AddAzureKeyVault(
            new Uri(secretUri!),
            new ClientSecretCredential(tenantId, clientId, clientSecret),
            new AzureKeyVaultConfigurationOptions { ReloadInterval = TimeSpan.FromMinutes(5) });

        logger.LogInformation("Azure Key Vault registered as configuration source: {Uri}", secretUri);
        return builder;
    }
}
