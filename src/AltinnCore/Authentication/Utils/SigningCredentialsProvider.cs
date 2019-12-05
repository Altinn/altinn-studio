using System;
using System.Security.Cryptography.X509Certificates;
using System.Threading;
using System.Threading.Tasks;
using AltinnCore.Authentication.Constants;

using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
using Microsoft.IdentityModel.Tokens;

namespace AltinnCore.Authentication.Utils
{
    /// <summary>
    /// Represents a way to obtain <see cref="SigningCredentials"/> for the purpose of signing a JSON Web Token. 
    /// </summary>
    /// <remarks>
    /// The class is static to enable a form of reuse of the signing credentials across multiple requests.
    /// </remarks>
    public static class SigningCredentialsProvider
    {
        private static SigningCredentials _signingCredentials;
        private static DateTime _signingCredentialsUpdateTime;

        private static readonly SemaphoreSlim Semaphore = new SemaphoreSlim(1, 1);

        /// <summary>
        /// Obtain the <see cref="SigningCredentials"/> to be used when signing a new JSON Web Token.
        /// </summary>
        /// <param name="keyVaultSettings">Settings that can be used to access a key vault with the signing certificate.</param>
        /// <param name="certificateSettings">Settings to identify a certificate stored on the file system.</param>
        /// <returns>The <see cref="SigningCredentials"/>.</returns>
        public static async Task<SigningCredentials> GetSigningCredentials(KeyVaultSettings keyVaultSettings, CertificateSettings certificateSettings)
        {
            await Semaphore.WaitAsync();

            try
            {
                if (_signingCredentialsUpdateTime > DateTime.Now && _signingCredentials != null)
                {
                    return _signingCredentials;
                }

                X509Certificate2 cert;
                if (string.IsNullOrEmpty(keyVaultSettings.ClientId) || string.IsNullOrEmpty(keyVaultSettings.ClientSecret))
                {
                    cert = new X509Certificate2(certificateSettings.CertificatePath, certificateSettings.CertificatePwd);
                }
                else
                {
                    KeyVaultClient client = KeyVaultSettings.GetClient(keyVaultSettings.ClientId, keyVaultSettings.ClientSecret);
                    CertificateBundle certificate = await client.GetCertificateAsync(keyVaultSettings.SecretUri, certificateSettings.CertificateName);
                    SecretBundle secret = await client.GetSecretAsync(certificate.SecretIdentifier.Identifier);
                    byte[] pfxBytes = Convert.FromBase64String(secret.Value);
                    cert = new X509Certificate2(pfxBytes);
                }

                _signingCredentials = new X509SigningCredentials(cert, SecurityAlgorithms.RsaSha256);

                // Reuse the same SigningCredentials for 30 minutes
                _signingCredentialsUpdateTime = DateTime.Now.AddMinutes(30);

                return _signingCredentials;
            }
            finally
            {
                Semaphore.Release();
            }
        }
    }
}
