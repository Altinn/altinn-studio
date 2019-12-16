using System;
using System.Collections.Generic;
using System.Security.Cryptography.X509Certificates;
using System.Threading;
using System.Threading.Tasks;

using AltinnCore.Authentication.Constants;

using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authentication.Services
{
    /// <summary>
    /// Represents a <see cref="IJwtSigningCertificateProvider"/> that can obtain a certificate from a key vault using a key vault client.
    /// If there are no key vault settings available the logic will instead attempt to find a certificate on the file system as a fallback.
    /// </summary>
    /// <remarks>
    /// This service is intended to be used as a Singleton. Access to the <see cref="X509Certificate2"/> is locked using <see cref="SemaphoreSlim"/>.
    /// </remarks>
    public class JwtSigningCertificateProvider : IJwtSigningCertificateProvider
    {
        private readonly KeyVaultSettings _keyVaultSettings;
        private readonly CertificateSettings _certificateSettings;

        private List<X509Certificate2> _certificates;
        private DateTime _certificateUpdateTime;

        private readonly SemaphoreSlim _semaphore = new SemaphoreSlim(1, 1);

        /// <summary>
        /// Initialize a new instance of <see cref="JwtSigningCertificateProvider"/> with settings for accessing a key vault and file system.
        /// </summary>
        /// <param name="keyVaultSettings">Settings required to access a certificate stored in a key vault.</param>
        /// <param name="certificateSettings">Settings required to access a certificate stored on a file system.</param>
        public JwtSigningCertificateProvider(
            IOptions<KeyVaultSettings> keyVaultSettings,
            IOptions<CertificateSettings> certificateSettings)
        {
            _keyVaultSettings = keyVaultSettings.Value;
            _certificateSettings = certificateSettings.Value;
        }

        /// <inheritdoc />
        public async Task<List<X509Certificate2>> GetCertificates()
        {
            await _semaphore.WaitAsync();

            try
            {
                if (_certificateUpdateTime > DateTime.Now && _certificates != null)
                {
                    return _certificates;
                }

                _certificates = new List<X509Certificate2>();

                if (string.IsNullOrEmpty(_keyVaultSettings.ClientId) || string.IsNullOrEmpty(_keyVaultSettings.ClientSecret))
                {
                    _certificates.Add(new X509Certificate2(_certificateSettings.CertificatePath, _certificateSettings.CertificatePwd));
                }
                else
                {
                    KeyVaultClient client = KeyVaultSettings.GetClient(_keyVaultSettings.ClientId, _keyVaultSettings.ClientSecret);
                    CertificateBundle certificate = await client.GetCertificateAsync(_keyVaultSettings.SecretUri, _certificateSettings.CertificateName);
                    SecretBundle secret = await client.GetSecretAsync(certificate.SecretIdentifier.Identifier);
                    byte[] pfxBytes = Convert.FromBase64String(secret.Value);
                    _certificates.Add(new X509Certificate2(pfxBytes));
                }

                // Reuse the same list of certificates for 30 minutes.
                _certificateUpdateTime = DateTime.Now.AddMinutes(30);

                return _certificates;
            }
            finally
            {
                _semaphore.Release();
            }
        }
    }
}
