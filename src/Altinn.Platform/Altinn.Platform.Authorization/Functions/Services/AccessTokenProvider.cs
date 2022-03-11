using System;
using System.Security.Cryptography.X509Certificates;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Common.AccessTokenClient.Configuration;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Authorization.Functions.Configuration;
using Altinn.Platform.Authorization.Functions.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authorization.Functions.Services
{
    public class AccessTokenProvider : IAccessTokenProvider
    {
        private readonly IKeyVaultService _keyVaultService;
        private readonly IAccessTokenGenerator _accessTokenGenerator;
        private readonly PlatformSettings _platformSettings;
        private readonly AccessTokenSettings _accessTokenSettings;
        private readonly KeyVaultSettings _keyVaultSettings;
        private static readonly SemaphoreSlim Semaphore = new SemaphoreSlim(1, 1);
        private static DateTime _cacheTokenUntil = DateTime.MinValue;
        private string _accessToken;

        public AccessTokenProvider(IKeyVaultService keyVaultService, IAccessTokenGenerator accessTokenGenerator,
            IOptions<AccessTokenSettings> accessTokenSettings, IOptions<KeyVaultSettings> keyVaultSettings, IOptions<PlatformSettings> platformSettings)
        {
            _keyVaultService = keyVaultService;
            _accessTokenGenerator = accessTokenGenerator;
            _platformSettings = platformSettings.Value;
            _accessTokenSettings = accessTokenSettings.Value;
            _keyVaultSettings = keyVaultSettings.Value;
        }

        public async Task<string> GetAccessToken()
        {
            await Semaphore.WaitAsync();

            try
            {
                if (_accessToken == null || _cacheTokenUntil < DateTime.UtcNow)
                {
                    string certBase64 = await _keyVaultService.GetCertificateAsync(_keyVaultSettings.KeyVaultURI, _keyVaultSettings.PlatformCertSecretId);
                    _accessToken = _accessTokenGenerator.GenerateAccessToken(
                        _platformSettings.AccessTokenIssuer,
                        "platform.authorization",
                        new X509Certificate2(Convert.FromBase64String(certBase64), (string)null, X509KeyStorageFlags.MachineKeySet | X509KeyStorageFlags.PersistKeySet | X509KeyStorageFlags.Exportable));
                }

                _cacheTokenUntil = DateTime.UtcNow.AddSeconds(_accessTokenSettings.TokenLifetimeInSeconds - 2); // Add some slack to avoid tokens expiring in transit

                return _accessToken;
            }
            finally
            {
                Semaphore.Release();
            }
        }
    }
}

