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

        public SigningCredentials GetSigningCredentials()
        {
            string basePath = Directory.GetParent(Directory.GetCurrentDirectory()).FullName;
            string certPath = basePath + $"accesstoken/signingcredentials.pfx";
            X509Certificate2 cert = new X509Certificate2(certPath, "qwer1234");
            return new X509SigningCredentials(cert, SecurityAlgorithms.RsaSha256);
        }

        public IEnumerable<SecurityKey> GetSigningKeys(string issuer)
        {
            string basePath = Directory.GetParent(Directory.GetCurrentDirectory()).FullName;
            string filePath = basePath + $"clientsigningkeys/{issuer.ToLower()}.cer";
            List<SecurityKey> signingKeys = new List<SecurityKey>();

            X509Certificate2 cert = new X509Certificate2(filePath);
            SecurityKey key = new X509SecurityKey(cert);

            signingKeys.Add(key);

            return signingKeys;
        }

        private async Task<string> GetSecretAsync(string org)
        {
            string certificateName = $"{org}"
            KeyVaultClient client = KeyVaultSettings.GetClient(_keyVaultSettings.ClientId, _keyVaultSettings.ClientSecret);
            CertificateBundle certificate = await client.GetCertificateAsync(_keyVaultSettings.SecretUri, _certificateSettings.CertificateName);
            SecretBundle secret = await client.GetSecretAsync(certificate.SecretIdentifier.Identifier);
            byte[] pfxBytes = Convert.FromBase64String(secret.Value);
            _certificates.Add(new X509Certificate2(pfxBytes));
        }

    }
}
