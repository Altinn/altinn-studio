using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography.X509Certificates;
using System.Threading;
using System.Threading.Tasks;

using Altinn.Platform.Authentication.Services.Interfaces;
using AltinnCore.Authentication.Constants;

using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
using Microsoft.Extensions.Options;
using Microsoft.Rest.Azure;

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
                    List<X509Certificate2> certificates = await GetAllCertificateVersions(
                        _keyVaultSettings.SecretUri, _certificateSettings.CertificateName);
                    _certificates.AddRange(certificates);
                }

                // Reuse the same list of certificates for 1 hour.
                _certificateUpdateTime = DateTime.Now.AddHours(1);

                _certificates = _certificates.OrderByDescending(cer => cer.NotBefore).ToList();
                return _certificates;
            }
            finally
            {
                _semaphore.Release();
            }
        }

        private async Task<List<X509Certificate2>> GetAllCertificateVersions(string keyVaultUrl, string certificateName)
        {
            List<X509Certificate2> certificates = new List<X509Certificate2>();
            
            KeyVaultClient client = KeyVaultSettings.GetClient(_keyVaultSettings.ClientId, _keyVaultSettings.ClientSecret);

            // Get the first page of certificates
            IPage<CertificateItem> certificateItemsPage = await client.GetCertificateVersionsAsync(keyVaultUrl, certificateName);
            while (true)
            {
                foreach (var certificateItem in certificateItemsPage)
                {
                    // Ignore disabled or expired certificates
                    if (certificateItem.Attributes.Enabled == true &&
                        (certificateItem.Attributes.Expires == null ||
                         certificateItem.Attributes.Expires > DateTime.UtcNow))
                    {
                        CertificateBundle certificateVersionBundle =
                            await client.GetCertificateAsync(certificateItem.Identifier.Identifier);
                        SecretBundle certificatePrivateKeySecretBundle =
                            await client.GetSecretAsync(certificateVersionBundle.SecretIdentifier.Identifier);
                        byte[] privateKeyBytes = Convert.FromBase64String(certificatePrivateKeySecretBundle.Value);
                        X509Certificate2 certificateWithPrivateKey = new X509Certificate2(privateKeyBytes);

                        certificates.Add(certificateWithPrivateKey);
                    }
                }

                if (certificateItemsPage.NextPageLink == null)
                {
                    break;
                }

                certificateItemsPage = await client.GetCertificateVersionsNextAsync(certificateItemsPage.NextPageLink);
            }

            return certificates;
        }
    }
}
