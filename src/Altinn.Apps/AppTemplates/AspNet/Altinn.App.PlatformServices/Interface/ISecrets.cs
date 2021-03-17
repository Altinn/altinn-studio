using System.Threading.Tasks;

using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.WebKey;

namespace Altinn.App.Services.Interface
{
    /// <summary>
    /// Interface for secrets service
    /// </summary>
    public interface ISecrets
    {
        /// <summary>
        /// Gets the latest version of a key from key vault.
        /// </summary>
        /// <param name="keyName">The name of the key.</param>
        /// <returns>The key as a JSON web key.</returns>
        Task<JsonWebKey> GetKeyAsync(string keyName);

        /// <summary>
        /// Gets the latest version of a secret from key vault.
        /// </summary>
        /// <param name="secretName">The name of the secret.</param>
        /// <returns>The secret value.</returns>
        Task<string> GetSecretAsync(string secretName);

        /// <summary>
        /// Gets the latest version of a certificate from key vault.
        /// </summary>
        /// <param name="certificateName">The name of certificate.</param>
        /// <returns>The certificate as a byte array.</returns>
        Task<byte[]> GetCertificateAsync(string certificateName);

        /// <summary>
        /// Gets the key vault client.
        /// </summary>
        /// <returns>The key vault client.</returns>
        KeyVaultClient GetKeyVaultClient();
    }
}
