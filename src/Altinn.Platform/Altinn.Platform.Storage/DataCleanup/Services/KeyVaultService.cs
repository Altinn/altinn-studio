using System;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
using Microsoft.Azure.Services.AppAuthentication;

namespace Altinn.Platform.Storage.DataCleanup.Services
{
    /// <summary>
    /// Wrapper implementation for a KeyVaultClient. The wrapped client is created with a principal obtained through configuration.
    /// </summary>
    /// <remarks>This class is excluded from code coverage because it has no logic to be tested.</remarks>
    [ExcludeFromCodeCoverage]
    public class KeyVaultService : IKeyVaultService
    {
        /// <inheritdoc/>
        public async Task<string> GetSecretAsync(string vaultUri, string secretId)
        {
                // The AzureServiceTokenProvider has its own internal static collection of principals based on the connection string.
                AzureServiceTokenProvider azureServiceTokenProvider = new AzureServiceTokenProvider();
                KeyVaultClient keyVaultClient = new KeyVaultClient(new KeyVaultClient.AuthenticationCallback(azureServiceTokenProvider.KeyVaultTokenCallback));

                SecretBundle sb = await keyVaultClient.GetSecretAsync(vaultUri, secretId);

                return sb.Value;
        }
    }
}
