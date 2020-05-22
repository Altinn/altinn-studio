using Altinn.Common.AccessToken.Configuration;
using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
using Microsoft.Azure.Services.AppAuthentication;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;

namespace Altinn.Common.AccessToken.Services
{
    public class SigningKeysResolver : ISigningKeyResolver
    {
        private readonly AccessTokenSettings _accessTokenSettings;
        private readonly KeyVaultSettings _keyVaultSettings;

        public SigningKeysResolver(IOptions<KeyVaultSettings> keyVaultSettings, IOptions<AccessTokenSettings> accessTokenSettings)
        {
            _accessTokenSettings = accessTokenSettings.Value;
            _keyVaultSettings = keyVaultSettings.Value;
        }

        public async Task<IEnumerable<SecurityKey>> GetSigningKeys(string issuer)
        {
            List<SecurityKey> signingKeys = new List<SecurityKey>();
            X509Certificate2 cert = await GetSigningCertFromKeyVault(issuer);
            SecurityKey key = new X509SecurityKey(cert);
            signingKeys.Add(key);
            return signingKeys;
        }

        /// <summary>
        /// Get the correct certificate from the keyvault
        /// </summary>
        /// <param name="issuer">The org or platform identificator</param>
        /// <returns>returns a cert</returns>
        private async Task<X509Certificate2> GetSigningCertFromKeyVault(string issuer)
        {
            string certificateName = $"{issuer}-access-token-public-cert";
            KeyVaultClient client = KeyVaultSettings.GetClient(_keyVaultSettings.ClientId, _keyVaultSettings.ClientSecret);
            CertificateBundle certificate = await client.GetCertificateAsync(_keyVaultSettings.SecretUri, certificateName);
            SecretBundle secret = await client.GetSecretAsync(certificate.SecretIdentifier.Identifier);
            byte[] certBytes = Convert.FromBase64String(secret.Value);
            X509Certificate2 cert = new X509Certificate2(certBytes);
            return cert;
        }
    }
}
