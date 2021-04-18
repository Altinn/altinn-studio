namespace Altinn.Platform.Events.Functions.Configuration
{
    /// <summary>
    /// Configuration object used to hold settings for the KeyVault.
    /// </summary>
    public class KeyVaultSettings
    {
        /// <summary>
        /// Uri to keyvault
        /// </summary>
        public string KeyVaultURI { get; set; }

        /// <summary>
        /// Name of the certificate secret
        /// </summary>
        public string PlatformCertSecretId { get; set; } = "platform-access-token-private-cert";
    }
}
