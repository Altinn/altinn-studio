using System;
using System.Security.Cryptography.X509Certificates;
using System.Threading;
using System.Threading.Tasks;
using AltinnCore.Authentication.Constants;
using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Platform.Authentication.Services
{
    /// <summary>
    /// Represents a <see cref="ISigningCredentialsProvider"/> that can obtain a certificate from a key vault and use that to
    /// create a <see cref="SigningCredentials"/> instance. If there are no key vault settings available the logic will instead
    /// attempt to find a certificate on the file system.
    /// </summary>
    /// <remarks>
    /// This service is intended to be used as a Singleton. Access to the <see cref="SigningCredentials"/> is locked using <see cref="SemaphoreSlim"/>.
    /// </remarks>
    public class SigningCredentialsProvider : ISigningCredentialsProvider
    {
        private readonly KeyVaultSettings _keyVaultSettings;
        private readonly CertificateSettings _certificateSettings;

        private SigningCredentials _signingCredentials;
        private DateTime _signingCredentialsUpdateTime;

        private readonly SemaphoreSlim _semaphore = new SemaphoreSlim(1, 1);

        /// <summary>
        /// Initialize a new instance of <see cref="SigningCredentialsProvider"/> with settings for accessing a key vault and file system.
        /// </summary>
        /// <param name="keyVaultSettings">Settings required to access a certificate stored in a key vault.</param>
        /// <param name="certificateSettings">Settings required to access a certificate stored on a file system.</param>
        public SigningCredentialsProvider(
            IOptions<KeyVaultSettings> keyVaultSettings,
            IOptions<CertificateSettings> certificateSettings)
        {
            _keyVaultSettings = keyVaultSettings.Value;
            _certificateSettings = certificateSettings.Value;
        }

        /// <inheritdoc />
        public async Task<SigningCredentials> GetSigningCredentials()
        {
            await _semaphore.WaitAsync();

            try
            {
                if (_signingCredentialsUpdateTime > DateTime.Now && _signingCredentials != null)
                {
                    return _signingCredentials;
                }

                X509Certificate2 cert;
                if (string.IsNullOrEmpty(_keyVaultSettings.ClientId) || string.IsNullOrEmpty(_keyVaultSettings.ClientSecret))
                {
                    cert = new X509Certificate2(_certificateSettings.CertificatePath, _certificateSettings.CertificatePwd);
                }
                else
                {
                    KeyVaultClient client = KeyVaultSettings.GetClient(_keyVaultSettings.ClientId, _keyVaultSettings.ClientSecret);
                    CertificateBundle certificate = await client.GetCertificateAsync(_keyVaultSettings.SecretUri, _certificateSettings.CertificateName);
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
                _semaphore.Release();
            }
        }
    }
}
