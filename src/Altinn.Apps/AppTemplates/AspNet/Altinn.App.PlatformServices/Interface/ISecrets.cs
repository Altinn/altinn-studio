using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.WebKey;
using System.Threading.Tasks;

namespace Altinn.App.Services.Interface
{
    /// <summary>
    /// Interface for secrets service
    /// </summary>
    public interface ISecrets
    {
        /// <summary>
        /// Gets a key from key vault.
        /// </summary>
        /// <param name="keyId">The id of the key.</param>
        /// <returns>The key as a JSON web key.</returns>
        Task<JsonWebKey> GetKeyAsync(string keyId);

        /// <summary>
        /// Gets a secret from key vault.
        /// </summary>
        /// <param name="secretId">The id of the secret.</param>
        /// <returns>The secret value.</returns>
        Task<string> GetSecretAsync(string secretId);

        /// <summary>
        /// Gets the latest version of a certificate from key vault.
        /// </summary>
        /// <param name="certificateId">The id of the certificate.</param>
        /// <returns>The certificate as a byte array.</returns>
        Task<byte[]> GetCertificateAsync(string certificateId);

        /// <summary>
        /// Gets the key vault client.
        /// </summary>
        /// <returns>The key vault client.</returns>
        KeyVaultClient GetKeyVaultClient();
    }
}
