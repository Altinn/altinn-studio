using System;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;
using Altinn.App.Services.Interface;
using AltinnCore.Authentication.Constants;
using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
using Microsoft.Azure.Services.AppAuthentication;
using Microsoft.Extensions.Options;

namespace Altinn.App.PlatformServices.Implementation
{
    /// <summary>
    /// Class that handles integration with Azure Key Vault
    /// </summary>
    public class KeyVaultAppSI : IKeyVault
    {
        private readonly string _connectionString;
        private readonly string _vaultUri;
        /// <summary>
        /// Initializes a new instance of the <see cref="KeyVaultAppSI"/> class with a client using the credentials from the key vault settings.
        /// </summary>
        /// <param name="keyVaultSettings">
        /// The <see cref="KeyVaultSettings"/> with information about the principal to use when getting secrets from a key vault.
        /// </param>
        public KeyVaultAppSI(IOptions<KeyVaultSettings> keyVaultSettings)
        {
            _connectionString = $"RunAs=App;AppId={keyVaultSettings.Value.ClientId};" +
                                $"TenantId={keyVaultSettings.Value.TenantId};" +
                                $"AppKey={keyVaultSettings.Value.ClientSecret}";
            _vaultUri = keyVaultSettings.Value.SecretUri;
        }

        /// </<inheritdoc/>>
        public async Task<X509Certificate2> GetCertificateAsync(string certificateId)
        {
            AzureServiceTokenProvider azureServiceTokenProvider = new AzureServiceTokenProvider(_connectionString);
            KeyVaultClient client = new KeyVaultClient(new KeyVaultClient.AuthenticationCallback(azureServiceTokenProvider.KeyVaultTokenCallback));

            SecretBundle secret = await client.GetSecretAsync(_vaultUri, certificateId);
            byte[] certBytes = Convert.FromBase64String(secret.Value);
            X509Certificate2 cert = new X509Certificate2(certBytes);
            return cert;
        }

        /// </<inheritdoc/>>
        public async Task<string> GetSecretAsync(string secretId)
        {

            // The AzureServiceTokenProvider has its own internal static collection of principals based on the connection string.
            AzureServiceTokenProvider azureServiceTokenProvider = new AzureServiceTokenProvider(_connectionString);
            KeyVaultClient client = new KeyVaultClient(new KeyVaultClient.AuthenticationCallback(azureServiceTokenProvider.KeyVaultTokenCallback));

            SecretBundle sb = await client.GetSecretAsync(_vaultUri, secretId);

            return sb.Value;
        }
    }
}
