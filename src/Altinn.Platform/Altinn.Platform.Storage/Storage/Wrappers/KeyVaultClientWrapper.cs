using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

using AltinnCore.Authentication.Constants;

using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
using Microsoft.Azure.Services.AppAuthentication;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Storage.Wrappers
{
    /// <summary>
    /// Wrapper implementation for a KeyVaultClient. The wrapped client is created with a principal obtained through configuration.
    /// </summary>
    /// <remarks>This class is excluded from code coverage because it has no logic to be tested.</remarks>
    [ExcludeFromCodeCoverage]
    public class KeyVaultClientWrapper : IKeyVaultClientWrapper
    {
        private readonly string _connectionString;

        /// <summary>
        /// Initializes a new instance of the <see cref="KeyVaultClientWrapper"/> class with a client using the credentials from the key vault settings.
        /// </summary>
        /// <param name="keyVaultSettings">
        /// The <see cref="KeyVaultSettings"/> with information about the principal to use when getting secrets from a key vault.
        /// </param>
        public KeyVaultClientWrapper(IOptions<KeyVaultSettings> keyVaultSettings)
        {
            _connectionString = $"RunAs=App;AppId={keyVaultSettings.Value.ClientId};" +
                                $"TenantId={keyVaultSettings.Value.TenantId};" +
                                $"AppKey={keyVaultSettings.Value.ClientSecret}";
        }

        /// <inheritdoc/>
        public async Task<string> GetSecretAsync(string vaultUri, string secretId)
        {
            // The AzureServiceTokenProvider has its own internal static collection of principals based on the connection string.
            AzureServiceTokenProvider azureServiceTokenProvider = new AzureServiceTokenProvider(_connectionString);
            KeyVaultClient keyVaultClient = new KeyVaultClient(new KeyVaultClient.AuthenticationCallback(azureServiceTokenProvider.KeyVaultTokenCallback));

            SecretBundle sb = await keyVaultClient.GetSecretAsync(vaultUri, secretId);

            return sb.Value;
        }
    }
}
