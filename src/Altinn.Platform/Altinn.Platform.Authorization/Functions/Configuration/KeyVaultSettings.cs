namespace Altinn.Platform.Authorization.Functions.Configuration;

/// <summary>
/// Configuration object used to hold settings for the KeyVault.
/// </summary>
public class KeyVaultSettings
{
    /// <summary>
    /// Uri to keyvault
    /// </summary>
    public string KeyVaultUri { get; set; }

    /// <summary>
    /// Name of the certificate secret
    /// </summary>
    public string PlatformCertSecretId { get; set; } = "JWTCertificate";
}
