using System;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;
using Altinn.Platform.Events.Functions.Services.Interfaces;
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;

namespace Altinn.Platform.Events.Functions.Services
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
            SecretClient secretClient = new SecretClient(new Uri(vaultUri), new DefaultAzureCredential());
            KeyVaultSecret secret = await secretClient.GetSecretAsync(secretId);

            return secret.Value;
        }
    }
}
