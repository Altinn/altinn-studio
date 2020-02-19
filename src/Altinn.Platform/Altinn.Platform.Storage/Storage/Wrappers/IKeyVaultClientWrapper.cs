using System.Threading.Tasks;

namespace Altinn.Platform.Storage.Wrappers
{
    /// <summary>
    /// Describes any implementation of a wrapper for a KeyVaultClient.
    /// </summary>
    public interface IKeyVaultClientWrapper
    {
        /// <summary>
        /// Gets the value of a secret from the given key vault.
        /// </summary>
        /// <param name="vaultUri">The URI of the key vault to ask for secret. </param>
        /// <param name="secretId">The id of the secret.</param>
        /// <returns>The secret value.</returns>
        Task<string> GetSecretAsync(string vaultUri, string secretId);
    }
}
