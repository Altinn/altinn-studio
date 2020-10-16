using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;

namespace Altinn.App.Services.Interface
{
    /// <summary>
    /// Interface for Key Vault service
    /// </summary>
    public interface IKeyVault
    {
        /// <summary>
        /// Gets a secret from key vault.
        /// </summary>
        /// <param name="secretId">The id of the secret.</param>
        /// <returns>The secret value.</returns>
        Task<string> GetSecretAsync(string secretId);

        /// <summary>
        /// Gets a certificate from key vault.
        /// </summary>
        /// <param name="certificateId">The id of the certificate.</param>
        /// <returns>The certificate.</returns>
        Task<X509Certificate2> GetCertificateAsync(string certificateId);
    }
}
