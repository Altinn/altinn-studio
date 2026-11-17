#nullable disable
using System;
using System.IO;
using System.Runtime.InteropServices;
using Altinn.Common.AccessToken.Configuration;
using Azure.Identity;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Infrastructure;

/// <summary>
/// Configuration for DataProtection
/// </summary>
internal static class DataProtectionConfiguration
{
    /// <summary>
    /// Configure data protection on the services collection.
    /// </summary>
    /// <param name="services">The service collections</param>
    /// <param name="configuration">Configuration containing settings for keyvault</param>
    /// <param name="environment">The hosting environment</param>
    /// <param name="logger">A logger instance</param>
    public static void ConfigureDataProtection(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment,
        ILogger logger
    )
    {
        var dataProtectionBuilder = services
            .AddDataProtection()
            .PersistKeysToFileSystem(new System.IO.DirectoryInfo(GetKeysDirectory()));

        var keyVaultSettings = configuration.GetSection("kvSetting").Get<KeyVaultSettings>();
        if (string.IsNullOrWhiteSpace(keyVaultSettings?.SecretUri))
        {
            // The deployed key ring is wrapped with the Key Vault key. Without the vault Designer cannot read it,
            // starts a new unencrypted one and signs every user out, so a deployed Designer must not start.
            if (environment.IsStaging() || environment.IsProduction())
            {
                throw new InvalidOperationException(
                    "kvSetting:SecretUri must be set to protect data protection keys with Azure Key Vault."
                );
            }

            logger.LogWarning("Missing settings for key vault. Will not encrypt data protection keys.");
            return;
        }

        dataProtectionBuilder.ProtectKeysWithAzureKeyVault(
            new Uri($"{keyVaultSettings.SecretUri.TrimEnd('/')}/keys/data-protection"),
            new DefaultAzureCredential()
        );
    }

    /// <summary>
    /// Return a directory based on the running operating system. It is possible to override the directory based on the ALTINN_KEYS_DIRECTORY environment variable.
    /// </summary>
    /// <returns></returns>
    private static string GetKeysDirectory()
    {
        var environmentVariable = System.Environment.GetEnvironmentVariable("ALTINN_KEYS_DIRECTORY");
        if (!string.IsNullOrWhiteSpace(environmentVariable))
        {
            return environmentVariable;
        }

        // Return a key directory based on the current operating system
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            // This is the default behavior for keys in Windows.
            return Path.Combine(
                System.Environment.GetFolderPath(System.Environment.SpecialFolder.LocalApplicationData),
                "ASP.NET",
                "DataProtection-Keys"
            );
        }

        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
        {
            // This is the default behavior for keys in OSX.
            return Path.Combine(
                System.Environment.GetFolderPath(System.Environment.SpecialFolder.ApplicationData),
                "ASP.NET",
                "DataProtection-Keys"
            );
        }

        // Assume linux like systems
        return "/mnt/keys";
    }
}
