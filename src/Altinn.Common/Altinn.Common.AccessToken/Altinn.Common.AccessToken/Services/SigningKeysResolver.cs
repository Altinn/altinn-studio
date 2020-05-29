using System;
using System.Collections.Generic;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;
using Altinn.Common.AccessToken.Configuration;
using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Common.AccessToken.Services
{
    /// <summary>
    /// Service for resolving keys
    /// </summary>
    public class SigningKeysResolver : ISigningKeysResolver
    {
        private readonly AccessTokenSettings _accessTokenSettings;
        private readonly KeyVaultSettings _keyVaultSettings;
        private readonly IMemoryCache _memoryCache;

        /// <summary>
        /// Default constructor
        /// </summary>
        /// <param name="keyVaultSettings">The keyvault settings</param>
        /// <param name="accessTokenSettings">Settings for access token</param>
        /// <param name="memoryCache">Memory cache</param>
        public SigningKeysResolver(IOptions<KeyVaultSettings> keyVaultSettings, IOptions<AccessTokenSettings> accessTokenSettings, IMemoryCache memoryCache)
        {
            _accessTokenSettings = accessTokenSettings.Value;
            _keyVaultSettings = keyVaultSettings.Value;
            _memoryCache = memoryCache;
        }

        /// <summary>
        /// Returns the signing keys for a issuer
        /// </summary>
        /// <param name="issuer">The issuer</param>
        /// <returns></returns>
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
            string cacheKey = $"cert-access-token-{issuer}";

            if (!_memoryCache.TryGetValue(cacheKey, out X509Certificate2 cert))
            {
                // Key not in cache, set getting the secret from KeyVault
                string secretName = $"{issuer}-access-token-public-cert";
                KeyVaultClient client = KeyVaultSettings.GetClient(_keyVaultSettings.ClientId, _keyVaultSettings.ClientSecret);
                SecretBundle secret = await client.GetSecretAsync(_keyVaultSettings.SecretUri, secretName);
                byte[] certBytes = Convert.FromBase64String(secret.Value);
                cert = new X509Certificate2(certBytes);

                // Set the cache options
                MemoryCacheEntryOptions cacheEntryOptions = new MemoryCacheEntryOptions()
               .SetPriority(CacheItemPriority.High)
               .SetAbsoluteExpiration(new TimeSpan(0, 0, _accessTokenSettings.CacheCertLifetimeInSeconds));

                _memoryCache.Set(cacheKey, cert, cacheEntryOptions);
            }

            return cert;
        }
    }
}
